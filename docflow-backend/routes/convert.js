const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { PDFDocument, rgb, degrees, StandardFonts } = require("pdf-lib");
const { scheduleCleanup } = require("../utils/fileCleanup");
const sharp = require("sharp");

// --- Ensure output dir exists ---
const OUTPUT_DIR = "/tmp/output";
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "/tmp/uploads"),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Helper to determine the correct LibreOffice command based on OS
const getLibreOfficeCommand = () => {
  if (process.platform === 'darwin') {
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
  }
  return 'libreoffice'; // Works on Linux/Docker
};

// --- Helper: run a LibreOffice command and return the output file path ---
function runLibreOffice(args, inputFile, outputExt, cb) {
  const loCommand = getLibreOfficeCommand();
  // On Mac, LibreOffice headless can clash with an open GUI instance.
  // isolated profile prevents it from silently exiting.
  const profileDir = `/tmp/lo_profile_${uuidv4()}`;
  const cmd = `"${loCommand}" -env:UserInstallation=file://${profileDir} --headless ${args} --outdir "${OUTPUT_DIR}" "${inputFile}"`;
  console.log(`[LibreOffice] Running: ${cmd}`);

  exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    // Clean up temporary profile dir after execution
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }

    if (err) {
      console.error("[LibreOffice] FATAL ERROR:", err.message);
      console.error("[LibreOffice] Stderr:", stderr);
      const isNotFound = err.message.includes("not found") || err.message.includes("ENOENT");
      const friendlyError = isNotFound 
        ? "LibreOffice not found on the server. Please check your Dockerfile."
        : `Conversion failed: ${stderr || err.message}`;
      return cb(new Error(friendlyError));
    }

    // LibreOffice outputs "<basename>.<ext>"
    const basename = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(OUTPUT_DIR, `${basename}${outputExt}`);

    if (!fs.existsSync(outputFile)) {
      return cb(new Error(`Output file not found: ${outputFile}`));
    }

    console.log(`[LibreOffice] Done: ${outputFile}`);
    cb(null, outputFile);
  });
}

// --- Helper: run pdf2docx for PDF to DOCX with high fidelity ---
function runPdf2Docx(inputFile, cb) {
  const basename = path.basename(inputFile, path.extname(inputFile));
  const outputFile = path.join(OUTPUT_DIR, `${basename}.docx`);
  
  // Create an inline python script to run pdf2docx to avoid creating temporary files
  const script = `python3 -c "from pdf2docx import parse; parse('${inputFile}', '${outputFile}')"`;
  console.log(`[pdf2docx] Running: ${script}`);

  exec(script, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("[pdf2docx] FATAL ERROR:", err.message);
      console.error("[pdf2docx] Stderr:", stderr);
      const isModuleError = stderr.includes("ModuleNotFoundError") || err.message.includes("ModuleNotFoundError");
      const friendlyError = isModuleError
        ? "Python module 'pdf2docx' is not installed on the server. Check your build logs."
        : `PDF to Word conversion failed: ${stderr || err.message}`;
      return cb(new Error(friendlyError));
    }

    if (!fs.existsSync(outputFile)) {
      return cb(new Error(`Output file not found: ${outputFile}`));
    }

    console.log(`[pdf2docx] Done: ${outputFile}`);
    cb(null, outputFile);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PDF → DOCX (Using high-fidelity pdf2docx engine)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/pdf-to-word", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[pdf-to-word] Start: ${req.file.path}`);

  runPdf2Docx(req.file.path, (err, outFile) => {
    if (err) return res.status(500).json({ error: err.message });

    res.download(outFile, `converted.docx`, () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });

    console.log(`[pdf-to-word] Done: ${outFile}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DOCX → PDF
// ─────────────────────────────────────────────────────────────────────────────
router.post("/word-to-pdf", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[word-to-pdf] Start: ${req.file.path}`);

  runLibreOffice("--convert-to pdf", req.file.path, ".pdf", (err, outFile) => {
    if (err) return res.status(500).json({ error: err.message });

    res.download(outFile, `converted.pdf`, () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });

    console.log(`[word-to-pdf] Done: ${outFile}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Image (JPG/PNG) → PDF  (pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/image-to-pdf", upload.array("file"), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0)
    return res.status(400).json({ error: "No files uploaded" });

  console.log(`[image-to-pdf] Start: ${files.length} file(s)`);

  try {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const imageBytes = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname).toLowerCase();
      let embeddedImage;

      if (ext === ".jpg" || ext === ".jpeg") {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else if (ext === ".png") {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        return res.status(400).json({ error: `Unsupported image format: ${ext}` });
      }

      const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, pdfBytes);

    console.log(`[image-to-pdf] Done: ${outFile}`);

    res.download(outFile, "converted.pdf", () => {
      files.forEach((f) => scheduleCleanup(f.path));
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[image-to-pdf] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PDF → PNG  (LibreOffice)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/pdf-to-image", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[pdf-to-image] Start: ${req.file.path}`);

  runLibreOffice("--convert-to png", req.file.path, ".png", (err, outFile) => {
    if (err) return res.status(500).json({ error: err.message });

    res.download(outFile, "converted.png", () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });

    console.log(`[pdf-to-image] Done: ${outFile}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Compress PDF  (pdf-lib reload + re-save)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/compress-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[compress-pdf] Start: ${req.file.path}`);

  try {
    const inputBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(inputBytes);
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, compressedBytes);

    console.log(`[compress-pdf] Done: ${outFile}`);

    res.download(outFile, "compressed.pdf", () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[compress-pdf] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Merge PDFs  (pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/merge-pdf", upload.array("file"), async (req, res) => {
  const files = req.files;
  if (!files || files.length < 2)
    return res.status(400).json({ error: "Please upload at least 2 PDF files" });

  console.log(`[merge-pdf] Start: ${files.length} file(s)`);

  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const bytes = fs.readFileSync(file.path);
      const src = await PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(src, src.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, mergedBytes);

    console.log(`[merge-pdf] Done: ${outFile}`);

    res.download(outFile, "merged.pdf", () => {
      files.forEach((f) => scheduleCleanup(f.path));
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[merge-pdf] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Delete PDF Pages (pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/delete-pages", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!req.body.deletedPageIndexes) return res.status(400).json({ error: "No page indexes provided" });

  console.log(`[delete-pages] Start: ${req.file.path}`);

  try {
    const deletedPageIndexes = JSON.parse(req.body.deletedPageIndexes);
    const inputBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(inputBytes);
    
    // Sort descending to avoid shifting indices issues
    // Just in case it's not already sorted
    const indexesToDelete = [...deletedPageIndexes].sort((a, b) => b - a);
    
    const pageCount = pdfDoc.getPageCount();
    if (pageCount - indexesToDelete.length <= 0) {
      scheduleCleanup(req.file.path);
      return res.status(400).json({ error: "You must keep at least 1 page." });
    }

    for (const index of indexesToDelete) {
      if (index >= 0 && index < pageCount) {
        pdfDoc.removePage(index);
      }
    }

    const modifiedBytes = await pdfDoc.save();
    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, modifiedBytes);

    console.log(`[delete-pages] Done: ${outFile}`);

    res.download(outFile, "deleted-pages.pdf", () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[delete-pages] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PDF → PPTX (LibreOffice)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/pdf-to-ppt", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[pdf-to-ppt] Start: ${req.file.path}`);

  runLibreOffice("--convert-to pptx", req.file.path, ".pptx", (err, outFile) => {
    if (err) return res.status(500).json({ error: err.message });

    res.download(outFile, `converted.pptx`, () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });

    console.log(`[pdf-to-ppt] Done: ${outFile}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. PPT/PPTX → PDF (LibreOffice)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ppt-to-pdf", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[ppt-to-pdf] Start: ${req.file.path}`);

  runLibreOffice("--convert-to pdf", req.file.path, ".pdf", (err, outFile) => {
    if (err) return res.status(500).json({ error: err.message });

    res.download(outFile, `converted.pdf`, () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });

    console.log(`[ppt-to-pdf] Done: ${outFile}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Add Watermark (pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/add-watermark", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!req.body.watermarkConfig) return res.status(400).json({ error: "No watermark configuration provided" });

  console.log(`[add-watermark] Start: ${req.file.path}`);

  try {
    const config = JSON.parse(req.body.watermarkConfig);
    const inputBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(inputBytes);
    const pages = pdfDoc.getPages();
    const pageCount = pdfDoc.getPageCount();

    // Helper: Convert hex to RGB object
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      } : { r: 1, g: 0, b: 0 }; // Default red
    };

    // Determine target pages
    let targetIndices = [];
    if (config.applyTo === "first") {
      targetIndices = [0];
    } else if (config.applyTo === "range" && config.pageRange) {
      const [start, end] = config.pageRange;
      for (let i = Math.max(1, start) - 1; i < Math.min(pageCount, end); i++) {
        targetIndices.push(i);
      }
    } else {
      // "all" or default
      targetIndices = Array.from({ length: pageCount }, (_, i) => i);
    }

    // Embed resources if needed
    let font, embeddedImage;
    if (config.type === "text") {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    } else if (config.type === "image" && config.imageBase64) {
      const imgData = config.imageBase64.split(",")[1];
      const imgBytes = Buffer.from(imgData, "base64");
      embeddedImage = await pdfDoc.embedPng(imgBytes);
    }

    for (const index of targetIndices) {
      const page = pages[index];
      const { width, height } = page.getSize();
      const margin = 40;

      if (config.type === "text") {
        const text = config.text || "CONFIDENTIAL";
        const fontSize = config.fontSize || 60;
        const color = hexToRgb(config.color || "#FF0000");
        const opacity = config.opacity || 0.3;
        const rotation = config.rotation || 45;

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize; // Approximate

        let x = 0, y = 0;
        switch (config.position) {
          case "top-left":
            x = margin;
            y = height - textHeight - margin;
            break;
          case "top-right":
            x = width - textWidth - margin;
            y = height - textHeight - margin;
            break;
          case "bottom-left":
            x = margin;
            y = margin;
            break;
          case "bottom-right":
            x = width - textWidth - margin;
            y = margin;
            break;
          case "center":
          default:
            x = (width - textWidth) / 2;
            y = (height - textHeight) / 2;
            break;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(rotation),
        });
      } else if (config.type === "image" && embeddedImage) {
        const opacity = config.opacity || 0.3;
        const sizePercent = config.size || 50;
        const imgWidth = (sizePercent / 100) * width;
        const imgHeight = (imgWidth / embeddedImage.width) * embeddedImage.height;

        let x = 0, y = 0;
        switch (config.position) {
          case "top-left":
            x = margin;
            y = height - imgHeight - margin;
            break;
          case "top-right":
            x = width - imgWidth - margin;
            y = height - imgHeight - margin;
            break;
          case "bottom-left":
            x = margin;
            y = margin;
            break;
          case "bottom-right":
            x = width - imgWidth - margin;
            y = margin;
            break;
          case "center":
          default:
            x = (width - imgWidth) / 2;
            y = (height - imgHeight) / 2;
            break;
        }

        page.drawImage(embeddedImage, {
          x,
          y,
          width: imgWidth,
          height: imgHeight,
          opacity,
        });
      }
    }

    const watermarkedBytes = await pdfDoc.save();
    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, watermarkedBytes);

    console.log(`[add-watermark] Done: ${outFile}`);

    res.download(outFile, "watermarked.pdf", () => {
      scheduleCleanup(req.file.path);
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[add-watermark] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Photos → PDF (Enhanced Multi-image)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/photos-to-pdf", upload.array("images", 30), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0)
    return res.status(400).json({ error: "No images provided" });

  console.log(`[photos-to-pdf] Start: ${files.length} file(s)`);

  try {
    const pageOrder = JSON.parse(req.body.pageOrder || "[]");
    const settings = JSON.parse(req.body.settings || "{}");
    
    const { 
      pageSize = "a4", 
      orientation = "portrait", 
      margin = "none", 
      imageFit = "fit" 
    } = settings;

    // Reorder files based on pageOrder array if provided
    let sortedFiles = [...files];
    if (pageOrder.length === files.length) {
      sortedFiles = pageOrder.map(index => files[index]);
    }

    const pdfDoc = await PDFDocument.create();

    // Page size constants in points
    const SIZES = {
      a4: { width: 595.28, height: 841.89 },
      letter: { width: 612, height: 792 }
    };

    // Margin constants in points
    const MARGINS = {
      none: 0,
      small: 10,
      medium: 20,
      large: 40
    };

    const marginPoints = MARGINS[margin] || 0;

    for (const file of sortedFiles) {
      let imageBytes = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname).toLowerCase();
      
      let embeddedImage;
      // Convert WEBP to PNG using sharp if needed
      if (ext === ".webp") {
        imageBytes = await sharp(imageBytes).png().toBuffer();
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else if (ext === ".jpg" || ext === ".jpeg") {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else if (ext === ".png") {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        // Try to convert any other format to PNG using sharp
        try {
          imageBytes = await sharp(imageBytes).png().toBuffer();
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } catch (e) {
          continue; // Skip unsupported
        }
      }

      let pageWidth, pageHeight;
      
      if (pageSize === "match") {
        pageWidth = embeddedImage.width + (marginPoints * 2);
        pageHeight = embeddedImage.height + (marginPoints * 2);
      } else {
        const baseSize = SIZES[pageSize] || SIZES.a4;
        
        let isLandscape = orientation === "landscape";
        if (orientation === "auto") {
          isLandscape = embeddedImage.width > embeddedImage.height;
        }
        
        pageWidth = isLandscape ? baseSize.height : baseSize.width;
        pageHeight = isLandscape ? baseSize.width : baseSize.height;
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      const availableWidth = pageWidth - (marginPoints * 2);
      const availableHeight = pageHeight - (marginPoints * 2);
      
      let drawWidth, drawHeight, x, y;

      if (imageFit === "fill") {
        drawWidth = pageWidth;
        drawHeight = pageHeight;
        x = 0;
        y = 0;
      } else if (imageFit === "original") {
        drawWidth = embeddedImage.width;
        drawHeight = embeddedImage.height;
        x = (availableWidth - drawWidth) / 2 + marginPoints;
        y = (availableHeight - drawHeight) / 2 + marginPoints;
      } else { // "fit" (default)
        const scale = Math.min(
          availableWidth / embeddedImage.width,
          availableHeight / embeddedImage.height
        );
        drawWidth = embeddedImage.width * scale;
        drawHeight = embeddedImage.height * scale;
        x = (availableWidth - drawWidth) / 2 + marginPoints;
        y = (availableHeight - drawHeight) / 2 + marginPoints;
      }

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const outFile = path.join(OUTPUT_DIR, `${uuidv4()}.pdf`);
    fs.writeFileSync(outFile, pdfBytes);

    console.log(`[photos-to-pdf] Done: ${outFile}`);

    res.download(outFile, "photos-converted.pdf", () => {
      files.forEach((f) => scheduleCleanup(f.path));
      scheduleCleanup(outFile);
    });
  } catch (err) {
    console.error("[photos-to-pdf] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
