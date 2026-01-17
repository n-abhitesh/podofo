import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

// Helper to get Ghostscript command
const getGsCommand = () => {
  if (process.platform === 'win32') {
    return 'gswin64c.exe';
  }
  return 'gs';
};

// Test Ghostscript installation
const testGhostscriptInstallation = () => {
  return new Promise((resolve) => {
    log.info("Testing Ghostscript installation...");
    const gs = spawn(getGsCommand(), ['--version']);
    
    let output = "";
    
    gs.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    gs.stderr.on("data", (data) => {
      output += data.toString();
    });
    
    gs.on("close", (code) => {
      if (code === 0 || output.includes("GPL Ghostscript") || output.includes("Ghostscript")) {
        const version = output.trim().split("\n")[0] || "Installed";
        log.success(`Ghostscript Installation: ${version}`);
        resolve(true);
      } else {
        log.error("Ghostscript Installation: Not found or not working");
        resolve(false);
      }
    });
    
    gs.on("error", (error) => {
      log.error(`Ghostscript Installation: ${error.message}`);
      log.warn("Make sure Ghostscript is installed and in PATH");
      resolve(false);
    });
  });
};

// Create a test PDF file
const createTestPdf = async () => {
  try {
    log.info("Creating test PDF file...");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // Letter size
    page.drawText("Test PDF for Ghostscript", {
      x: 50,
      y: 700,
      size: 20,
    });
    page.drawText("This is a test document.", {
      x: 50,
      y: 650,
      size: 14,
    });
    
    const pdfBytes = await pdf.save();
    const testDir = path.join(__dirname, "test-files");
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, "test-ghostscript.pdf");
    fs.writeFileSync(filePath, pdfBytes);
    
    log.success(`Test PDF created: ${filePath}`);
    return filePath;
  } catch (error) {
    log.error(`Failed to create test PDF: ${error.message}`);
    return null;
  }
};

// Test PDF Compression
const testCompress = async (inputFile) => {
  return new Promise((resolve) => {
    log.info("Testing PDF Compression...");
    const outputPath = path.join(__dirname, "test-files", "compressed-test.pdf");
    
    const gs = spawn(getGsCommand(), [
      '-dSAFER',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      `-sOutputFile=${outputPath}`,
      inputFile
    ]);

    let stderr = '';
    
    gs.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gs.on('close', (code) => {
      if (code === 0 || code === null) {
        if (fs.existsSync(outputPath)) {
          const originalSize = fs.statSync(inputFile).size;
          const compressedSize = fs.statSync(outputPath).size;
          const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
          log.success(`PDF Compression: Original ${originalSize} bytes → Compressed ${compressedSize} bytes (${ratio}% reduction)`);
          resolve(true);
        } else {
          log.error(`PDF Compression: Output file not created`);
          resolve(false);
        }
      } else {
        log.error(`PDF Compression: Failed with exit code ${code}`);
        if (stderr) log.warn(`  Error: ${stderr.substring(0, 200)}`);
        resolve(false);
      }
    });

    gs.on('error', (error) => {
      log.error(`PDF Compression: ${error.message}`);
      resolve(false);
    });
  });
};

// Test PDF to Images
const testPdfToImages = async (inputFile) => {
  return new Promise((resolve) => {
    log.info("Testing PDF to Images conversion...");
    const outputDir = path.join(__dirname, "test-files", "images-test");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPattern = path.join(outputDir, "page-%d.png");
    
    const gs = spawn(getGsCommand(), [
      '-dSAFER',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-sDEVICE=png16m',
      '-r150',
      `-sOutputFile=${outputPattern}`,
      inputFile
    ]);

    let stderr = '';
    
    gs.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gs.on('close', (code) => {
      setTimeout(() => {
        // Wait a bit for files to be written
        const files = fs.existsSync(outputDir) 
          ? fs.readdirSync(outputDir).filter(f => f.endsWith('.png'))
          : [];
        
        if (files.length > 0) {
          log.success(`PDF to Images: Created ${files.length} image file(s)`);
          files.forEach(file => {
            const filePath = path.join(outputDir, file);
            const size = fs.statSync(filePath).size;
            log.info(`  - ${file}: ${size} bytes`);
          });
          resolve(true);
        } else {
          log.error(`PDF to Images: No image files created`);
          if (stderr) log.warn(`  Error: ${stderr.substring(0, 200)}`);
          resolve(false);
        }
      }, 500);
    });

    gs.on('error', (error) => {
      log.error(`PDF to Images: ${error.message}`);
      resolve(false);
    });
  });
};

// Test Ghostscript with different quality settings
const testCompressQualities = async (inputFile) => {
  log.info("Testing different compression quality settings...");
  const qualities = ['screen', 'ebook', 'printer'];
  const originalSize = fs.statSync(inputFile).size;
  
  for (const quality of qualities) {
    const outputPath = path.join(__dirname, "test-files", `compressed-${quality}.pdf`);
    
    await new Promise((resolve) => {
      const gs = spawn(getGsCommand(), [
        '-dSAFER',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=/${quality}`,
        `-sOutputFile=${outputPath}`,
        inputFile
      ]);

      gs.on('close', () => {
        if (fs.existsSync(outputPath)) {
          const size = fs.statSync(outputPath).size;
          const ratio = ((1 - size / originalSize) * 100).toFixed(1);
          log.info(`  ${quality}: ${size} bytes (${ratio}% reduction)`);
        }
        resolve();
      });

      gs.on('error', () => resolve());
    });
  }
};

// Cleanup test files
const cleanup = () => {
  try {
    const testDir = path.join(__dirname, "test-files");
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
      log.info("Cleaned up test files");
    }
  } catch (error) {
    log.warn(`Failed to cleanup: ${error.message}`);
  }
};

// Run all tests
const runTests = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("  Ghostscript Functionality Test");
  console.log("=".repeat(60) + "\n");
  
  // Test installation
  const installed = await testGhostscriptInstallation();
  
  if (!installed) {
    console.log("\n" + "=".repeat(60));
    console.log("  Ghostscript not installed or not in PATH");
    console.log("  Please install Ghostscript first");
    console.log("=".repeat(60) + "\n");
    process.exit(1);
  }
  
  // Create test PDF
  const testPdf = await createTestPdf();
  if (!testPdf) {
    log.error("Cannot continue without test PDF");
    process.exit(1);
  }
  
  // Test compression
  await testCompress(testPdf);
  
  // Test different quality settings
  await testCompressQualities(testPdf);
  
  // Test PDF to Images
  await testPdfToImages(testPdf);
  
  console.log("\n" + "=".repeat(60));
  console.log("  Test Complete");
  console.log("=".repeat(60) + "\n");
  
  // Optionally cleanup
  // cleanup();
};

// Run tests
runTests().catch((error) => {
  log.error(`Test error: ${error.message}`);
  process.exit(1);
});
