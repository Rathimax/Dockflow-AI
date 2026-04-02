const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { PDFDocument } = require("pdf-lib");
const { scheduleCleanup } = require("../utils/fileCleanup");

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

module.exports = router;
