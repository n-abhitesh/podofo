import { useState } from 'react';
import { upload } from './api';
import AppWindow from './components/AppWindow';
import Tabs from './components/Tabs';
import FileInput from './components/FileInput';
import ReorderableFileList from './components/ReorderableFileList';
import SplitOptions from './components/SplitOptions';
import Button from './components/Button';
import ProgressBar from './components/ProgressBar';
import StatusBar from './components/StatusBar';
import AlertDialog from './components/AlertDialog';
import './styles/win95.css';

const ASCII_LOGO = `
    ____                  
   /    \\                 
  |  o o  |               
  |   ^   |               
  |  \\_/  |               
   \\____/                 
   PODOFO                 
  PDF Tools
`;

function App() {
  const [status, setStatus] = useState('Ready');
  const [progress, setProgress] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [crtEffect, setCrtEffect] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // State for each tab
  const [mergeFiles, setMergeFiles] = useState([]);
  const [splitFile, setSplitFile] = useState(null);
  const [splitTotalPages, setSplitTotalPages] = useState(0);
  const [compressFile, setCompressFile] = useState(null);
  const [compressQuality, setCompressQuality] = useState('ebook');
  const [compressOriginalSize, setCompressOriginalSize] = useState(null);
  const [pdfToImageFile, setPdfToImageFile] = useState(null);
  const [pdfToImageDpi, setPdfToImageDpi] = useState(150);
  const [imagesToPdfFiles, setImagesToPdfFiles] = useState([]);

  const showError = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlert(true);
  };

  // Helper to get file size
  const getFileSize = (file) => {
    return file ? file.size : 0;
  };

  // Helper to download blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Get PDF page count (basic estimation - would need PDF.js for accurate count)
  const getPdfPageCount = async (file) => {
    // For now, return 0 - in a real implementation, you'd use PDF.js
    // This would require adding pdfjs-dist dependency
    return 0;
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) {
      showError('Error', 'Please select at least 2 PDF files to merge.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatus('Processing...');

    try {
      const data = new FormData();
      mergeFiles.forEach((f) => data.append('files', f));

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await upload('merge', data, 'blob');

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data instanceof Blob) {
        downloadBlob(response.data, 'merged.pdf');
        setStatus('Completed - File downloaded');
      }

      setTimeout(() => {
        setStatus('Ready');
        setProgress(0);
      }, 2000);
    } catch (error) {
      setProgress(0);
      setStatus('Error');
      showError('Error', error.response?.data?.message || 'Failed to merge PDFs.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSplit = async (options) => {
    if (!splitFile) {
      showError('Error', 'Please select a PDF file to split.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatus('Processing...');

    try {
      const data = new FormData();
      data.append('file', splitFile);
      data.append('mode', options.mode);
      if (options.ranges && options.ranges.length > 0) {
        data.append('ranges', JSON.stringify(options.ranges));
      }
      if (options.fixedSize) {
        data.append('fixedSize', options.fixedSize.toString());
      }

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await upload('split', data, 'blob');

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data instanceof Blob) {
        downloadBlob(response.data, 'split-pages.zip');
        setStatus('Completed - ZIP downloaded');
      }

      setTimeout(() => {
        setStatus('Ready');
        setProgress(0);
      }, 2000);
    } catch (error) {
      setProgress(0);
      setStatus('Error');
      showError('Error', error.response?.data?.message || 'Failed to split PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (!compressFile) {
      showError('Error', 'Please select a PDF file to compress.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatus('Processing...');
    setCompressOriginalSize(getFileSize(compressFile));

    try {
      const data = new FormData();
      data.append('file', compressFile);
      data.append('quality', compressQuality);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await upload('compress', data, 'blob');

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data instanceof Blob) {
        const originalSize = response.headers['x-original-size'] || compressOriginalSize;
        const compressedSize = response.headers['x-compressed-size'] || response.data.size;
        
        downloadBlob(response.data, 'compressed.pdf');
        setStatus(`Completed - ${formatFileSize(compressedSize)} (was ${formatFileSize(originalSize)})`);
      }

      setTimeout(() => {
        setStatus('Ready');
        setProgress(0);
        setCompressOriginalSize(null);
      }, 3000);
    } catch (error) {
      setProgress(0);
      setStatus('Error');
      showError('Error', error.response?.data?.message || 'Failed to compress PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePdfToImages = async () => {
    if (!pdfToImageFile) {
      showError('Error', 'Please select a PDF file to convert.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatus('Processing...');

    try {
      const data = new FormData();
      data.append('file', pdfToImageFile);
      data.append('dpi', pdfToImageDpi.toString());

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await upload('pdf-to-images', data, 'blob');

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data instanceof Blob) {
        downloadBlob(response.data, 'pdf-images.zip');
        setStatus('Completed - ZIP downloaded');
      }

      setTimeout(() => {
        setStatus('Ready');
        setProgress(0);
      }, 2000);
    } catch (error) {
      setProgress(0);
      setStatus('Error');
      showError('Error', error.response?.data?.message || 'Failed to convert PDF to images.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImagesToPdf = async () => {
    if (imagesToPdfFiles.length === 0) {
      showError('Error', 'Please select at least one image file.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setStatus('Processing...');

    try {
      const data = new FormData();
      imagesToPdfFiles.forEach((f) => data.append('files', f));

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await upload('images-to-pdf', data, 'blob');

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data instanceof Blob) {
        downloadBlob(response.data, 'images.pdf');
        setStatus('Completed - File downloaded');
      }

      setTimeout(() => {
        setStatus('Ready');
        setProgress(0);
      }, 2000);
    } catch (error) {
      setProgress(0);
      setStatus('Error');
      showError('Error', error.response?.data?.message || 'Failed to convert images to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleMergeFilesSelected = (files) => {
    setMergeFiles(files || []);
  };

  const handleSplitFileSelected = async (files) => {
    const file = files?.[0] || null;
    setSplitFile(file);
    // In a real implementation, extract page count here
    setSplitTotalPages(0);
  };

  const handleMergeReorder = (newFiles) => {
    setMergeFiles(newFiles);
  };

  const handleMergeRemove = (index) => {
    const newFiles = mergeFiles.filter((_, i) => i !== index);
    setMergeFiles(newFiles);
  };

  const tabs = [
    {
      label: 'Merge PDFs',
      content: (
        <div>
          <div className="section-header">Merge Multiple PDFs</div>
          <FileInput
            multiple
            accept=".pdf,application/pdf"
            label="Drop PDF files here or click to browse"
            hint="Select multiple PDF files to merge into one"
            onFilesSelected={handleMergeFilesSelected}
          />
          {mergeFiles.length > 0 && (
            <div>
              <div className="section-subheader">File Order (drag to reorder):</div>
              <ReorderableFileList
                files={mergeFiles}
                onReorder={handleMergeReorder}
                onRemove={handleMergeRemove}
              />
            </div>
          )}
          <div className="action-buttons">
            <Button
              onClick={handleMerge}
              disabled={mergeFiles.length < 2 || processing}
            >
              Merge PDFs
            </Button>
          </div>
        </div>
      ),
    },
    {
      label: 'Split PDF',
      content: (
        <div>
          <div className="section-header">Split PDF into Pages</div>
          <FileInput
            accept=".pdf,application/pdf"
            label="Drop PDF file here or click to browse"
            hint="Select a PDF file to split"
            onFilesSelected={handleSplitFileSelected}
          />
          {splitFile && (
            <SplitOptions
              onSplit={handleSplit}
              disabled={processing}
              totalPages={splitTotalPages}
            />
          )}
        </div>
      ),
    },
    {
      label: 'Compress PDF',
      content: (
        <div>
          <div className="section-header">Compress PDF File</div>
          <FileInput
            accept=".pdf,application/pdf"
            label="Drop PDF file here or click to browse"
            hint="Select a PDF file to compress"
            onFilesSelected={(files) => {
              setCompressFile(files?.[0] || null);
              setCompressOriginalSize(files?.[0] ? files[0].size : null);
            }}
          />
          {compressFile && (
            <div className="form-group">
              <label className="form-label">Compression Quality:</label>
              <select
                className="form-select"
                value={compressQuality}
                onChange={(e) => setCompressQuality(e.target.value)}
              >
                <option value="screen">Screen (lowest quality, smallest size)</option>
                <option value="ebook">Ebook (medium quality, smaller size)</option>
                <option value="printer">Printer (higher quality, larger size)</option>
              </select>
              {compressOriginalSize && (
                <div className="file-size-info">
                  Original size: {formatFileSize(compressOriginalSize)}
                </div>
              )}
            </div>
          )}
          <div className="action-buttons">
            <Button
              onClick={handleCompress}
              disabled={!compressFile || processing}
            >
              Compress PDF
            </Button>
          </div>
        </div>
      ),
    },
    {
      label: 'PDF → Image',
      content: (
        <div>
          <div className="section-header">Convert PDF to Images</div>
          <FileInput
            accept=".pdf,application/pdf"
            label="Drop PDF file here or click to browse"
            hint="Select a PDF file to convert to images"
            onFilesSelected={(files) => setPdfToImageFile(files?.[0] || null)}
          />
          {pdfToImageFile && (
            <div className="form-group">
              <label className="form-label">DPI (Resolution):</label>
              <select
                className="form-select"
                value={pdfToImageDpi}
                onChange={(e) => setPdfToImageDpi(parseInt(e.target.value))}
              >
                <option value="72">72 DPI (low, fast)</option>
                <option value="150">150 DPI (medium, recommended)</option>
                <option value="300">300 DPI (high, slow)</option>
              </select>
            </div>
          )}
          <div className="action-buttons">
            <Button
              onClick={handlePdfToImages}
              disabled={!pdfToImageFile || processing}
            >
              Convert to Images
            </Button>
          </div>
        </div>
      ),
    },
    {
      label: 'Images → PDF',
      content: (
        <div>
          <div className="section-header">Convert Images to PDF</div>
          <FileInput
            multiple
            accept="image/*"
            label="Drop image files here or click to browse"
            hint="Select multiple image files to convert into a PDF"
            onFilesSelected={(files) => setImagesToPdfFiles(files || [])}
          />
          {imagesToPdfFiles.length > 0 && (
            <div className="file-count-info">
              {imagesToPdfFiles.length} image(s) selected
            </div>
          )}
          <div className="action-buttons">
            <Button
              onClick={handleImagesToPdf}
              disabled={imagesToPdfFiles.length === 0 || processing}
            >
              Convert to PDF
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={crtEffect ? 'crt-effect' : ''}>
      <div className="crt-toggle">
        <Button
          onClick={() => setCrtEffect(!crtEffect)}
          className="btn-primary"
        >
          {crtEffect ? 'Disable CRT' : 'Enable CRT'}
        </Button>
      </div>
      
      <AppWindow title="Podofo — PDF Tools">
        <div className="ascii-logo">{ASCII_LOGO}</div>
        
        <Tabs tabs={tabs} defaultTab={0} />
        
        {processing && <ProgressBar progress={progress} showLabel={true} />}
        
        <StatusBar status={status} />
      </AppWindow>
      
      <AlertDialog
        show={showAlert}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}

export default App;
