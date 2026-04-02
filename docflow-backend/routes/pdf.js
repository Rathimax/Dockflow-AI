const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const crypto = require("crypto");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { scheduleCleanup } = require("../utils/fileCleanup");

const TMP_DIR = "/tmp/uploads";
const OUTPUT_DIR = "/tmp/output";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// --- Helper: Convert hex to RGB object ---
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

// --- LibreOffice / pdf2docx Helpers ---
const getLibreOfficeCommand = () => {
  if (process.platform === 'darwin') {
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
  }
  return 'libreoffice'; 
};

function runLibreOffice(args, inputFile, outputExt, cb) {
  const loCommand = getLibreOfficeCommand();
  const profileDir = `/tmp/lo_profile_${crypto.randomUUID()}`;
  const cmd = `"${loCommand}" -env:UserInstallation=file://${profileDir} --headless ${args} --outdir "${OUTPUT_DIR}" "${inputFile}"`;
  
  exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
    if (err) return cb(new Error(`LibreOffice error: ${stderr || err.message}`));
    
    const basename = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(OUTPUT_DIR, `${basename}${outputExt}`);
    if (!fs.existsSync(outputFile)) return cb(new Error("Output file not found"));
    cb(null, outputFile);
  });
}

function runPdf2Docx(inputFile, cb) {
  const basename = path.basename(inputFile, path.extname(inputFile));
  const outputFile = path.join(OUTPUT_DIR, `${basename}.docx`);
  const script = `python3 -c "from pdf2docx import parse; parse('${inputFile}', '${outputFile}')"`;
  
  exec(script, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) return cb(new Error(`pdf2docx error: ${stderr || err.message}`));
    if (!fs.existsSync(outputFile)) return cb(new Error("Output file not found"));
    cb(null, outputFile);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PDF → Images (POST /api/pdf/load)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/load", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const inputPath = req.file.path;
  const requestId = crypto.randomUUID();
  const outDir = path.join(OUTPUT_DIR, requestId);
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // pdftoppm -r 150 -png [input] [prefix]
  const prefix = path.join(outDir, "page");
  const cmd = `pdftoppm -r 150 -png "${inputPath}" "${prefix}"`;

  console.log(`[pdf-editor] Loading PDF: ${cmd}`);

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      console.error("[pdf-editor] pdftoppm error:", err, stderr);
      const isMissing = stderr.includes("not found") || err.code === 127;
      return res.status(500).json({ 
        error: isMissing 
          ? "PDF rendering engine (poppler-utils) is missing on this server. Please install it locally using 'brew install poppler' or use the Docker environment." 
          : "Failed to process PDF pages. The file might be corrupted or protected."
      });
    }

    try {
      const files = fs.readdirSync(outDir).sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)[1]);
        const numB = parseInt(b.match(/page-(\d+)\.png/)[1]);
        return numA - numB;
      });

      const pages = files.map(file => {
        const filePath = path.join(outDir, file);
        const data = fs.readFileSync(filePath, { encoding: "base64" });
        return `data:image/png;base64,${data}`;
      });

      // ── Extract text content with positions using pdfjs-dist ──
      let textItems = [];
      try {
        const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
        const pdfBytes = new Uint8Array(fs.readFileSync(inputPath));
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdfDocument = await loadingTask.promise;

        // ── Use pdf-lib to get REAL font names from PDF font dictionaries ──
        // PDF.js returns opaque names like "g_d0_f2" and generic "sans-serif".
        // pdf-lib can read BaseFont: /CAAAAA+TimesNewRomanPS-BoldMT
        let pageFontMaps = []; // per-page array of { F1: "TimesNewRomanPSMT", F2: "TimesNewRomanPS-BoldMT", ... }
        try {
          const pdfLibDoc = await PDFDocument.load(fs.readFileSync(inputPath));
          for (let pi = 0; pi < pdfLibDoc.getPageCount(); pi++) {
            const pg = pdfLibDoc.getPage(pi);
            const fontMap = {};
            try {
              const resources = pg.node.Resources();
              const fontDictRef = resources.get(require('pdf-lib').PDFName.of('Font'));
              if (fontDictRef) {
                const fontDict = pdfLibDoc.context.lookup(fontDictRef);
                if (fontDict && fontDict.entries) {
                  for (const [key, val] of fontDict.entries()) {
                    const fontObj = pdfLibDoc.context.lookup(val);
                    if (fontObj && fontObj.get) {
                      const baseFont = fontObj.get(require('pdf-lib').PDFName.of('BaseFont'));
                      if (baseFont) {
                        // key is like /F1, baseFont is like /BAAAAA+TimesNewRomanPSMT
                        const keyStr = key.toString().replace('/', '');
                        let bfStr = baseFont.toString().replace('/', '');
                        // Remove the subset prefix (e.g., "BAAAAA+")
                        if (bfStr.includes('+')) bfStr = bfStr.split('+')[1];
                        fontMap[keyStr] = bfStr;
                      }
                    }
                  }
                }
              }
            } catch (e) { /* font extraction for this page failed, non-fatal */ }
            pageFontMaps.push(fontMap);
            if (pi === 0) console.log(`[pdf-editor] Page ${pi+1} fonts:`, fontMap);
          }
        } catch (e) {
          console.log("[pdf-editor] pdf-lib font extraction failed (non-fatal):", e.message);
          pageFontMaps = Array.from({ length: pdfDocument.numPages }, () => ({}));
        }

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          
          const pageW = viewport.width;
          const pageH = viewport.height;
          const viewportTransform = viewport.transform; // [a, b, c, d, e, f]

          const styles = textContent.styles || {};
          const pageFonts = pageFontMaps[pageNum - 1] || {};
          
          // Helper: resolve the real font name from pdfjs fontName like "g_d0_f2"
          function resolveRealFont(pdfjsFontName) {
            const match = pdfjsFontName.match(/f(\d+)$/);
            if (match) {
              const idx = parseInt(match[1]);
              const fKey = `F${idx}`;
              if (pageFonts[fKey]) return pageFonts[fKey];
            }
            return null;
          }

          const items = textContent.items
            .filter(item => item.str && item.str.trim().length > 0)
            .map(item => {
              const tx = item.transform;
              const xBasis = tx[4];
              const yBasis = tx[5]; // Baseline y-position (bottom-left origin)
              const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12;
              const hScale = Math.abs(tx[0]) / (Math.abs(tx[3]) || 1);
              const width = item.width || (item.str.length * fontSize * 0.6 * hScale);

              // Use the font's actual ascent/descent from PDF.js styles
              const styleEntry = styles[item.fontName] || {};
              const ascent = styleEntry.ascent || 0.8;
              const descent = styleEntry.descent || -0.2;

              // To get top-left viewport coordinates, we map TWO points:
              // 1. The baseline start (xBasis, yBasis)
              // 2. The top of the text (xBasis, yBasis + fontSize * ascent)
              
              // Standard matrix transform: [x' y'] = [x y 1] * [ a b 0; c d 0; e f 1 ]
              // viewportTransform is [a, b, c, d, e, f]
              function map(px, py) {
                return [
                  viewportTransform[0] * px + viewportTransform[2] * py + viewportTransform[4],
                  viewportTransform[1] * px + viewportTransform[3] * py + viewportTransform[5]
                ];
              }

              const [vx, vyBaseline] = map(xBasis, yBasis);
              const [, vyTop] = map(xBasis, yBasis + fontSize * ascent);
              
              const viewportX = vx;
              const viewportY = vyTop; // This is now in top-left pixels
              const textHeight = Math.abs(vyBaseline - vyTop) * (1 - descent/ascent); 
              // Wait, simpler: height in pixels = |map(baseline) - map(top)| + |map(descent)|
              const [, vyBottom] = map(xBasis, yBasis + fontSize * descent);
              const viewportHeight = Math.abs(vyTop - vyBottom);
              const viewportWidth = width * (pageW / viewport.viewBox[2]); // Approximation if rotated, but usually correct

              // Resolve font
              const realFontName = resolveRealFont(item.fontName) || "";
              const styleFontFamily = (styleEntry.fontFamily || "").toLowerCase();
              const combined = `${realFontName.toLowerCase()} ${styleFontFamily} ${(item.fontName || "").toLowerCase()}`;
              
              let fontWeight = "normal";
              let fontStyle = "normal";
              if (combined.includes("bold") || combined.includes("black") || combined.includes("heavy")) fontWeight = "bold";
              if (combined.includes("italic") || combined.includes("oblique")) fontStyle = "italic";

              let fontF = "Helvetica, Arial, sans-serif";
              if (combined.includes("timesnewroman") || combined.includes("times") || combined.includes("roman")) {
                fontF = '"Times New Roman", Times, serif';
              } else if (combined.includes("courier") || combined.includes("mono")) {
                fontF = '"Courier New", Courier, monospace';
              } else if (combined.includes("georgia")) {
                fontF = 'Georgia, "Times New Roman", serif';
              }

              return {
                id: crypto.randomUUID(),
                str: item.str,
                x: (viewportX / pageW) * 100,
                y: (viewportY / pageH) * 100,
                width: (width / viewport.viewBox[2]) * 100,
                height: (viewportHeight / pageH) * 100,
                fontSize: Math.round(fontSize),
                fontFamily: fontF,
                fontWeight,
                fontStyle,
                hScale: hScale !== 1 ? hScale : undefined,
                ascent: ascent,
              };
            });
          
          textItems.push(items);
        }

        // --- Collect exact page dimensions ---
        const pageDimensions = [];
        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const pg = await pdfDocument.getPage(i);
          const vp = pg.getViewport({ scale: 1.0 });
          pageDimensions.push({ width: vp.width, height: vp.height });
        }

        console.log(`[pdf-editor] Extracted text from ${pdfDocument.numPages} pages`);
        res.json({ pageCount: pages.length, pages, textItems, pageDimensions });
      } catch (textErr) {
        console.error("[pdf-editor] Text extraction failed:", textErr.message);
        res.json({ pageCount: pages.length, pages, textItems: pages.map(() => []) });
      }

      // Cleanup
      scheduleCleanup(inputPath);
      scheduleCleanup(outDir); 
    } catch (readErr) {
      res.status(500).json({ error: "Failed to read processed pages" });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Save Edited PDF (POST /api/pdf/save)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/save", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  try {
    const edits = JSON.parse(req.body.edits);
    const existingPdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // 1. Process Page Manipulations (Reorder/Delete)
    // We create a new PDF to handle reordering easily
    const finalPdf = await PDFDocument.create();
    const pageOrder = edits.pageOrder || pdfDoc.getPageIndices();
    
    for (const index of pageOrder) {
      const [copiedPage] = await finalPdf.copyPages(pdfDoc, [index]);
      finalPdf.addPage(copiedPage);
    }
    
    const pages = finalPdf.getPages();

    // 2. Apply Edits per Page
    for (const pageEdit of edits.pages) {
      // Find the page in the NEW document based on its ORIGINAL index or current mapping
      // For simplicity, edits.pages should correspond to indices in the pageOrder array
      const page = pages[pageEdit.pageIndex];
      if (!page) continue;

      const { width, height } = page.getSize();
      
      // Apply Rotation
      if (pageEdit.rotation) {
        page.setRotation({ type: 'degrees', angle: pageEdit.rotation });
      }

      for (const el of pageEdit.elements) {
        const color = hexToRgb(el.color || "#000000");

        if (el.type === "text") {
          // Skip original text that hasn't been changed
          if (el.isOriginal && el.content === el.originalContent) continue;
          
          const font = await finalPdf.embedFont(StandardFonts.Helvetica);
          
          const elX = (el.x / 100) * width;
          const elY = height - ((el.y / 100) * height);
          const elW = (el.width / 100) * width;
          const elH = (el.height / 100) * height;

          // If original text was edited, white-out the old area first
          if (el.isOriginal && el.content !== el.originalContent) {
            page.drawRectangle({
              x: elX - 0.5,
              y: elY - elH - 0.5,
              width: elW + 1,
              height: elH + 1,
              color: rgb(1, 1, 1), // white
            });
          }
          
          // Draw the text (either new or edited original)
          if (el.content && el.content.trim()) {
            // Use the actual ascent for pixel-perfect baseline positioning
            const ascent = el.ascent || 0.8;
            page.drawText(el.content, {
              x: elX,
              y: elY - (el.fontSize || 12) * ascent, 
              size: el.fontSize || 12,
              font: font,
              color: rgb(color.r, color.g, color.b),
            });
          }
        } 
        else if (el.type === "highlight") {
          page.drawRectangle({
            x: (el.x / 100) * width,
            y: height - ((el.y / 100) * height) - ((el.height / 100) * height),
            width: (el.width / 100) * width,
            height: (el.height / 100) * height,
            color: rgb(color.r, color.g, color.b),
            opacity: el.opacity || 0.4,
          });
        }
        else if (el.type === "shape") {
          const borderColor = hexToRgb(el.borderColor || "#000000");
          const fillColor = el.fillColor === "transparent" ? null : hexToRgb(el.fillColor);
          
          const shapeProps = {
            x: (el.x / 100) * width,
            y: height - ((el.y / 100) * height) - ((el.height / 100) * height),
            width: (el.width / 100) * width,
            height: (el.height / 100) * height,
            borderWidth: el.borderWidth || 1,
            borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
          };
          
          if (fillColor) shapeProps.color = rgb(fillColor.r, fillColor.g, fillColor.b);

          if (el.shape === "rect") {
            page.drawRectangle(shapeProps);
          } else {
            page.drawEllipse({
              ...shapeProps,
              x: shapeProps.x + shapeProps.width / 2,
              y: shapeProps.y + shapeProps.height / 2,
              xScale: shapeProps.width / 2,
              yScale: shapeProps.height / 2,
            });
          }
        }
        else if (el.type === "draw") {
          if (el.paths && el.paths.length > 0) {
            for (const path of el.paths) {
              for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i+1];
                page.drawLine({
                  start: { x: (p1.x / 100) * width, y: height - (p1.y / 100) * height },
                  end: { x: (p2.x / 100) * width, y: height - (p2.y / 100) * height },
                  thickness: el.strokeWidth || 2,
                  color: rgb(color.r, color.g, color.b),
                });
              }
            }
          }
        }
        else if (el.type === "image" || el.type === "signature") {
          try {
            const imgData = el.base64Data.split(",")[1];
            const imgBytes = Buffer.from(imgData, "base64");
            const isPng = el.base64Data.includes("image/png");
            const embeddedImg = isPng ? await finalPdf.embedPng(imgBytes) : await finalPdf.embedJpg(imgBytes);
            
            page.drawImage(embeddedImg, {
              x: (el.x / 100) * width,
              y: height - ((el.y / 100) * height) - ((el.height / 100) * height),
              width: (el.width / 100) * width,
              height: (el.height / 100) * height,
            });
          } catch (e) {
            console.error("Image embed error:", e);
          }
        }
      }
    }

    const pdfBytes = await finalPdf.save();
    
    // Send the PDF buffer directly instead of forcing a download via res.download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBytes.length,
    });
    res.send(Buffer.from(pdfBytes));

    // Cleanup input file
    scheduleCleanup(req.file.path);
  } catch (err) {
    console.error("[pdf-editor] Save error:", err);
    res.status(500).json({ error: "Failed to save PDF" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Remove Watermark (POST /api/pdf/remove-watermark)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/remove-watermark", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log(`[remove-watermark] Start: ${req.file.path}`);

  try {
    // Attempt best-effort removal via roundtrip
    runPdf2Docx(req.file.path, (err, docxFile) => {
      if (err) {
        console.error("[remove-watermark] pdf2docx failed:", err.message);
        return res.status(500).json({ error: "Failed to process PDF for removal." });
      }

      runLibreOffice("--convert-to pdf", docxFile, ".pdf", (err, outFile) => {
        if (err) {
          console.error("[remove-watermark] LibreOffice failed:", err.message);
          return res.status(500).json({ error: "Failed to reconstruct PDF." });
        }

        res.setHeader("X-Removal-Status", "best-effort");
        res.download(outFile, `cleaned.pdf`, () => {
          scheduleCleanup(req.file.path);
          scheduleCleanup(docxFile);
          scheduleCleanup(outFile);
        });
      });
    });
  } catch (err) {
    console.error("[remove-watermark] Global error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
