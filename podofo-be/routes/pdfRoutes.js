import express from "express";
import multer from "multer";
import {
  mergePDFs,
  splitPDF,
  compressPDF,
  pdfToImages,
  imagesToPDF,
} from "../controllers/pdfController.js";

// Configure multer with file size limits
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 50, // Max 50 files
  },
});
const router = express.Router();

router.post("/merge", upload.array("files"), mergePDFs);
router.post("/split", upload.single("file"), splitPDF);
router.post("/compress", upload.single("file"), compressPDF);
router.post("/pdf-to-images", upload.single("file"), pdfToImages);
router.post("/images-to-pdf", upload.array("files"), imagesToPDF);

export default router;
