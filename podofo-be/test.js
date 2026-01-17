import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import FormData from "form-data";

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

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

const recordTest = (name, passed, message = "") => {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    log.success(`${name}${message ? `: ${message}` : ""}`);
  } else {
    results.failed++;
    log.error(`${name}${message ? `: ${message}` : ""}`);
  }
};

// Helper to get Ghostscript command
const getGsCommand = () => {
  if (process.platform === "win32") {
    return "gswin64c.exe";
  }
  return "gs";
};

// Test 1: Check Ghostscript installation
const testGhostscript = () => {
  return new Promise((resolve) => {
    log.info("Testing Ghostscript installation...");
    const gs = spawn(getGsCommand(), ["--version"]);
    
    let output = "";
    
    gs.stdout.on("data", (data) => {
      output += data.toString();
    });
    
    gs.stderr.on("data", (data) => {
      output += data.toString();
    });
    
    gs.on("close", (code) => {
      if (code === 0 || output.includes("GPL Ghostscript")) {
        recordTest("Ghostscript Installation", true, output.trim().split("\n")[0] || "Installed");
        resolve(true);
      } else {
        recordTest("Ghostscript Installation", false, "Not found or not working");
        resolve(false);
      }
    });
    
    gs.on("error", (error) => {
      recordTest("Ghostscript Installation", false, error.message);
      resolve(false);
    });
  });
};

// Test 2: Check server is running
const testServerRunning = async () => {
  try {
    log.info("Testing server connectivity...");
    const response = await axios.get("http://localhost:5000/api/pdf/test", {
      timeout: 2000,
      validateStatus: () => true, // Accept any status code
    });
    
    // If we get any response, server is running
    recordTest("Server Running", true, "Server is accessible");
    return true;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      recordTest("Server Running", false, "Server not running on port 5000");
      log.warn("Make sure to start the server with: npm start");
      return false;
    } else {
      // Other errors mean server is running but route doesn't exist (which is fine)
      recordTest("Server Running", true, "Server is accessible");
      return true;
    }
  }
};

// Test 3: Create test PDF files
const createTestPdf = async (filename) => {
  try {
    // Create a simple PDF using pdf-lib
    const { PDFDocument, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([200, 200]);
    page.drawText(`Test PDF: ${filename}`, {
      x: 50,
      y: 100,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    const pdfBytes = await pdf.save();
    const testDir = path.join(__dirname, "test-files");
    fs.mkdirSync(testDir, { recursive: true });
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, pdfBytes);
    
    return filePath;
  } catch (error) {
    log.error(`Failed to create test PDF: ${error.message}`);
    return null;
  }
};

// Test 4: Test Merge endpoint
const testMerge = async () => {
  try {
    log.info("Testing Merge PDFs endpoint...");
    const testFile1 = await createTestPdf("test-merge-1.pdf");
    const testFile2 = await createTestPdf("test-merge-2.pdf");
    
    if (!testFile1 || !testFile2) {
      recordTest("Merge PDFs", false, "Failed to create test files");
      return false;
    }
    
    const formData = new FormData();
    formData.append("files", fs.createReadStream(testFile1));
    formData.append("files", fs.createReadStream(testFile2));
    
    const response = await axios.post("http://localhost:5000/api/pdf/merge", formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout: 10000,
    });
    
    if (response.status === 200 && response.data.length > 0) {
      recordTest("Merge PDFs", true, `Output size: ${response.data.length} bytes`);
      return true;
    } else {
      recordTest("Merge PDFs", false, "Invalid response");
      return false;
    }
  } catch (error) {
    recordTest("Merge PDFs", false, error.response?.data?.toString() || error.message);
    return false;
  }
};

// Test 5: Test Split endpoint
const testSplit = async () => {
  try {
    log.info("Testing Split PDF endpoint...");
    const testFile = await createTestPdf("test-split.pdf");
    
    if (!testFile) {
      recordTest("Split PDF", false, "Failed to create test file");
      return false;
    }
    
    const formData = new FormData();
    formData.append("file", fs.createReadStream(testFile));
    formData.append("mode", "all");
    
    const response = await axios.post("http://localhost:5000/api/pdf/split", formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout: 10000,
    });
    
    if (response.status === 200 && response.data.length > 0) {
      recordTest("Split PDF", true, `ZIP size: ${response.data.length} bytes`);
      return true;
    } else {
      recordTest("Split PDF", false, "Invalid response");
      return false;
    }
  } catch (error) {
    recordTest("Split PDF", false, error.response?.data?.toString() || error.message);
    return false;
  }
};

// Test 6: Test Compress endpoint
const testCompress = async () => {
  try {
    log.info("Testing Compress PDF endpoint...");
    const testFile = await createTestPdf("test-compress.pdf");
    
    if (!testFile) {
      recordTest("Compress PDF", false, "Failed to create test file");
      return false;
    }
    
    const formData = new FormData();
    formData.append("file", fs.createReadStream(testFile));
    formData.append("quality", "ebook");
    
    const response = await axios.post("http://localhost:5000/api/pdf/compress", formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout: 15000,
    });
    
    if (response.status === 200 && response.data.length > 0) {
      const originalSize = parseInt(response.headers["x-original-size"] || "0");
      const compressedSize = parseInt(response.headers["x-compressed-size"] || "0");
      recordTest("Compress PDF", true, `Original: ${originalSize} → ${compressedSize} bytes`);
      return true;
    } else {
      recordTest("Compress PDF", false, "Invalid response");
      return false;
    }
  } catch (error) {
    recordTest("Compress PDF", false, error.response?.data?.toString() || error.message);
    return false;
  }
};

// Test 7: Test PDF to Images endpoint
const testPdfToImages = async () => {
  try {
    log.info("Testing PDF to Images endpoint...");
    const testFile = await createTestPdf("test-pdf-to-images.pdf");
    
    if (!testFile) {
      recordTest("PDF to Images", false, "Failed to create test file");
      return false;
    }
    
    const formData = new FormData();
    formData.append("file", fs.createReadStream(testFile));
    formData.append("dpi", "150");
    
    const response = await axios.post("http://localhost:5000/api/pdf/pdf-to-images", formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout: 15000,
    });
    
    if (response.status === 200 && response.data.length > 0) {
      recordTest("PDF to Images", true, `ZIP size: ${response.data.length} bytes`);
      return true;
    } else {
      recordTest("PDF to Images", false, "Invalid response");
      return false;
    }
  } catch (error) {
    recordTest("PDF to Images", false, error.response?.data?.toString() || error.message);
    return false;
  }
};

// Test 8: Test Images to PDF endpoint
const testImagesToPdf = async () => {
  try {
    log.info("Testing Images to PDF endpoint...");
    // Create a simple test image (PNG) using a buffer
    // For simplicity, we'll use a minimal valid PNG
    const testDir = path.join(__dirname, "test-files");
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a minimal 1x1 pixel PNG
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    
    const testImage1 = path.join(testDir, "test-image-1.png");
    const testImage2 = path.join(testDir, "test-image-2.png");
    fs.writeFileSync(testImage1, minimalPng);
    fs.writeFileSync(testImage2, minimalPng);
    
    const formData = new FormData();
    formData.append("files", fs.createReadStream(testImage1), {
      filename: "test-image-1.png",
      contentType: "image/png",
    });
    formData.append("files", fs.createReadStream(testImage2), {
      filename: "test-image-2.png",
      contentType: "image/png",
    });
    
    const response = await axios.post("http://localhost:5000/api/pdf/images-to-pdf", formData, {
      headers: formData.getHeaders(),
      responseType: "arraybuffer",
      timeout: 10000,
    });
    
    if (response.status === 200 && response.data.length > 0) {
      recordTest("Images to PDF", true, `Output size: ${response.data.length} bytes`);
      return true;
    } else {
      recordTest("Images to PDF", false, "Invalid response");
      return false;
    }
  } catch (error) {
    recordTest("Images to PDF", false, error.response?.data?.toString() || error.message);
    return false;
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
  console.log("  Podofo Backend Test Suite");
  console.log("=".repeat(60) + "\n");
  
  // Test Ghostscript first
  await testGhostscript();
  
  // Test server
  const serverRunning = await testServerRunning();
  
  if (!serverRunning) {
    console.log("\n" + "=".repeat(60));
    console.log("  Server not running. Please start the server first:");
    console.log("  cd podofo-be && npm start");
    console.log("=".repeat(60) + "\n");
    cleanup();
    process.exit(1);
  }
  
  // Wait a bit for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Test all endpoints
  await testMerge();
  await testSplit();
  await testCompress();
  await testPdfToImages();
  await testImagesToPdf();
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("  Test Summary");
  console.log("=".repeat(60));
  console.log(`  Passed: ${colors.green}${results.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`  Total:  ${results.passed + results.failed}`);
  console.log("=".repeat(60) + "\n");
  
  // Detailed results
  if (results.failed > 0) {
    console.log("Failed Tests:");
    results.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  - ${t.name}: ${t.message}`);
      });
    console.log();
  }
  
  cleanup();
  
  process.exit(results.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch((error) => {
  log.error(`Test suite error: ${error.message}`);
  cleanup();
  process.exit(1);
});
