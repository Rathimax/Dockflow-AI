const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

/**
 * Extract text from a PDF or DOCX file.
 * Shared utility used by ai.js and study.js routes.
 * 
 * @param {string} filePath - Absolute path to the uploaded file on disk.
 * @param {string} originalname - Original filename (used to determine extension).
 * @returns {Promise<string>} - Extracted plain text.
 */
async function extractText(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);

  if (ext === ".pdf") {
    try {
      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfBytes = new Uint8Array(fileBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdfDocument = await loadingTask.promise;

      let fullText = "";
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + "\n";
      }
      return fullText;
    } catch (err) {
      throw new Error("Could not parse text from this PDF format. " + err.message);
    }
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } else {
    throw new Error("Unsupported file type for AI processing. Use PDF or DOCX.");
  }
}

module.exports = { extractText };
