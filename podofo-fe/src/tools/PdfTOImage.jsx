import * as pdfjsLib from "pdfjs-dist";
import { downloadBlob } from "../utils/api";
import Dropzone from "../components/Dropzone";
import ToolCard from "../components/ToolCard";
import { useState } from "react";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfToImage() {
  const [isProcessing, setIsProcessing] = useState(false);

  const convert = async (files) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const file = files[0];
      const fileUrl = URL.createObjectURL(file);
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 2 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `page-${pageNum}.png`);
          }
        }, "image/png");
      }

      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Conversion error:", error);
      alert("Failed to convert PDF to images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolCard
      title="PDF to Image"
      description="Convert PDF pages to PNG images"
    >
      {isProcessing && (
        <div style={{ marginBottom: "10px", fontSize: "14px" }}>
          Converting PDF to images... Please wait.
        </div>
      )}
      <Dropzone
        onFiles={convert}
        accept={{ "application/pdf": [] }}
        multiple={false}
        disabled={isProcessing}
      />
    </ToolCard>
  );
}
