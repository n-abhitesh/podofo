import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { spawn } from "child_process";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get Ghostscript command (Windows support)
const getGsCommand = () => {
  if (process.platform === 'win32') {
    return 'gswin64c.exe';
  }
  return 'gs';
};

// Helper to clean up temp files
const cleanupFiles = (filePaths) => {
  filePaths.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error.message);
    }
  });
};

// Helper to get file size in human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Helper to run Ghostscript with spawn
const runGhostscript = (args, inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    const gs = spawn(getGsCommand(), [
      '-dSAFER',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      ...args,
      `-sOutputFile=${outputFile}`,
      inputFile
    ]);

    let stderr = '';
    
    gs.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gs.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Ghostscript failed: ${stderr || `Exit code ${code}`}`));
      } else {
        resolve();
      }
    });

    gs.on('error', (error) => {
      reject(new Error(`Ghostscript not found. Please install Ghostscript: ${error.message}`));
    });
  });
};

/* MERGE PDFs - Respects file order from frontend */
export const mergePDFs = async (req, res) => {
  const tempFiles = req.files.map(f => f.path);
  
  try {
    const mergedPdf = await PDFDocument.create();

    // Process files in order they were sent (respects frontend order)
    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => mergedPdf.addPage(p));
    }

    const bytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../output/merged.pdf');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bytes);

    res.download(outputPath, 'merged.pdf', (err) => {
      // Cleanup temp files after download
      cleanupFiles(tempFiles);
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    cleanupFiles(tempFiles);
    res.status(500).json({ error: error.message });
  }
};

/* SPLIT PDF - Supports multiple split modes */
export const splitPDF = async (req, res) => {
  const tempFile = req.file.path;
  const splitMode = req.body.mode || 'all'; // 'all', 'range', 'fixed'
  const ranges = req.body.ranges ? JSON.parse(req.body.ranges) : [];
  const fixedSize = parseInt(req.body.fixedSize) || 1;
  
  try {
    const pdfBytes = fs.readFileSync(tempFile);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();
    const outputDir = path.join(__dirname, '../output/split');
    fs.mkdirSync(outputDir, { recursive: true });

    let pagesToExtract = [];

    // Determine which pages to extract based on mode
    if (splitMode === 'all') {
      // Extract all pages as separate PDFs
      for (let i = 0; i < totalPages; i++) {
        pagesToExtract.push([i]);
      }
    } else if (splitMode === 'range') {
      // Extract specified ranges (e.g., "1-3", "5", "7-9")
      const processedPages = new Set();
      
      for (const range of ranges) {
        if (typeof range === 'number') {
          const pageNum = range - 1; // Convert to 0-indexed
          if (pageNum >= 0 && pageNum < totalPages && !processedPages.has(pageNum)) {
            processedPages.add(pageNum);
          }
        } else if (typeof range === 'string' && range.includes('-')) {
          const [startStr, endStr] = range.split('-').map(n => n.trim());
          const start = parseInt(startStr) - 1;
          const end = parseInt(endStr) - 1;
          if (!isNaN(start) && !isNaN(end) && start >= 0 && end < totalPages && start <= end) {
            for (let i = start; i <= end; i++) {
              if (!processedPages.has(i)) {
                processedPages.add(i);
              }
            }
          }
        }
      }
      
      // Convert processed pages to individual extractions
      pagesToExtract = Array.from(processedPages).sort((a, b) => a - b).map(p => [p]);
    } else if (splitMode === 'fixed') {
      // Extract in fixed-size chunks (e.g., every 2 pages)
      for (let i = 0; i < totalPages; i += fixedSize) {
        const chunk = [];
        for (let j = 0; j < fixedSize && (i + j) < totalPages; j++) {
          chunk.push(i + j);
        }
        if (chunk.length > 0) {
          pagesToExtract.push(chunk);
        }
      }
    }

    // Create individual PDF files
    const createdFiles = [];
    for (let i = 0; i < pagesToExtract.length; i++) {
      const pageIndices = pagesToExtract[i];
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach((p) => newPdf.addPage(p));
      
      const filename = `page-${i + 1}.pdf`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, await newPdf.save());
      createdFiles.push(filepath);
    }

    // Create ZIP file and stream directly to response
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="split-pages.zip"');
    
    const archive = archiver('zip', { 
      zlib: { level: 9 },
      forceLocalTime: true
    });

    // Handle errors
    archive.on('error', (err) => {
      cleanupFiles([tempFile, ...createdFiles]);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    // Handle response finish to cleanup
    res.on('finish', () => {
      cleanupFiles([tempFile, ...createdFiles]);
    });

    res.on('close', () => {
      if (!archive.pointer) {
        cleanupFiles([tempFile, ...createdFiles]);
      }
    });

    // Pipe archive directly to response
    archive.pipe(res);

    // Add files to archive
    createdFiles.forEach((filepath, index) => {
      if (fs.existsSync(filepath)) {
        archive.file(filepath, { name: `page-${index + 1}.pdf` });
      }
    });

    // Finalize archive
    archive.finalize();
  } catch (error) {
    cleanupFiles([tempFile]);
    res.status(500).json({ error: error.message });
  }
};

/* COMPRESS PDF - Uses Ghostscript with selectable quality */
export const compressPDF = async (req, res) => {
  const tempFile = req.file.path;
  const quality = req.body.quality || 'ebook'; // 'screen', 'ebook', 'printer'
  const outputPath = path.join(__dirname, '../output/compressed.pdf');
  
  try {
    // Get original file size
    const originalSize = fs.statSync(tempFile).size;
    
    // Run Ghostscript compression
    await runGhostscript(
      [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=/${quality}`
      ],
      tempFile,
      outputPath
    );

    // Get compressed file size
    const compressedSize = fs.statSync(outputPath).size;
    
    // Send file with metadata
    res.download(outputPath, 'compressed.pdf', (err) => {
      cleanupFiles([tempFile]);
      if (err) {
        console.error('Download error:', err);
      }
    });
    
    // Send size info in headers
    res.setHeader('X-Original-Size', originalSize);
    res.setHeader('X-Compressed-Size', compressedSize);
  } catch (error) {
    cleanupFiles([tempFile]);
    res.status(500).json({ error: error.message });
  }
};

/* PDF → IMAGES - Converts to images with DPI selection and ZIP output */
export const pdfToImages = async (req, res) => {
  const tempFile = req.file.path;
  const dpi = parseInt(req.body.dpi) || 150;
  const outputDir = path.join(__dirname, '../output/images');
  fs.mkdirSync(outputDir, { recursive: true });
  
  try {
    const outputPattern = path.join(outputDir, 'page-%d.png');
    
    // Run Ghostscript to convert PDF to images
    await runGhostscript(
      [
        '-sDEVICE=png16m',
        `-r${dpi}`
      ],
      tempFile,
      outputPattern
    );

    // Find all created image files
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })
      .map(f => path.join(outputDir, f));

    if (files.length === 0) {
      throw new Error('No images were created');
    }

    // Create ZIP file and stream directly to response
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="pdf-images.zip"');
    
    const archive = archiver('zip', { 
      zlib: { level: 9 },
      forceLocalTime: true
    });

    // Handle errors
    archive.on('error', (err) => {
      cleanupFiles([tempFile, ...files]);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    // Handle response finish to cleanup
    res.on('finish', () => {
      cleanupFiles([tempFile, ...files]);
    });

    res.on('close', () => {
      if (!archive.pointer) {
        cleanupFiles([tempFile, ...files]);
      }
    });

    // Pipe archive directly to response
    archive.pipe(res);

    // Add files to archive
    files.forEach((filepath) => {
      if (fs.existsSync(filepath)) {
        const filename = path.basename(filepath);
        archive.file(filepath, { name: filename });
      }
    });

    // Finalize archive
    archive.finalize();
  } catch (error) {
    cleanupFiles([tempFile]);
    res.status(500).json({ error: error.message });
  }
};

/* IMAGES → PDF - Respects image order */
export const imagesToPDF = async (req, res) => {
  const tempFiles = req.files.map(f => f.path);
  
  try {
    const pdf = await PDFDocument.create();

    // Process files in order they were sent (respects frontend order)
    for (const file of req.files) {
      const imgBuffer = fs.readFileSync(file.path);
      let image;
      
      // Detect image type and embed accordingly
      if (file.mimetype === 'image/jpeg' || file.originalname.match(/\.(jpg|jpeg)$/i)) {
        image = await pdf.embedJpg(imgBuffer);
      } else if (file.mimetype === 'image/png' || file.originalname.match(/\.png$/i)) {
        image = await pdf.embedPng(imgBuffer);
      } else {
        // Try to convert with sharp for other formats
        const converted = await sharp(imgBuffer).png().toBuffer();
        image = await pdf.embedPng(converted);
      }
      
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0 });
    }

    const outputPath = path.join(__dirname, '../output/images.pdf');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, await pdf.save());

    res.download(outputPath, 'images.pdf', (err) => {
      cleanupFiles(tempFiles);
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    cleanupFiles(tempFiles);
    res.status(500).json({ error: error.message });
  }
};
