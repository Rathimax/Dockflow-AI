require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const { scheduleCleanup } = require("../utils/fileCleanup");
const { rateLimitAI } = require("../utils/rateLimit");

// --- Initialize Gemini API ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is not set in environment variables!");
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Configure Multer for temp storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "/tmp/uploads"),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// --- Helper: Extract text from PDF or DOCX ---
async function extractText(filePath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);
  
  if (ext === ".pdf") {
    try {
      if (typeof pdfParse === "function") {
        const data = await pdfParse(fileBuffer);
        return data.text || data;
      } else {
        const parser = new pdfParse.PDFParse({ data: fileBuffer });
        const data = await parser.getText();
        await parser.destroy();
        return data.text;
      }
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI Summarize
// ─────────────────────────────────────────────────────────────────────────────
router.post("/summarize", upload.single("file"), rateLimitAI, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    console.log(`[AI Summarize] Extracting text from ${req.file.originalname}...`);
    const documentText = await extractText(req.file.path, req.file.originalname);

    if (documentText.trim().length === 0) {
      throw new Error("Could not extract any text from the document.");
    }

    console.log(`[AI Summarize] Calling Gemini API...`);
    const prompt = `Summarize this document in 5 clear bullet points. Be concise.\n\nDocument text:\n${documentText.substring(0, 50000)}`; // limit chars to prevent exceeding token limits on massive files
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log(`[AI Summarize] Success.`);
    res.json({ status: "ok", summary });

  } catch (error) {
    console.error("[AI Summarize] Error:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    scheduleCleanup(req.file.path);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Chat with PDF
// ─────────────────────────────────────────────────────────────────────────────
// Note: Frontend extracts/passes text, or we do a 2-step. Here we accept text directly
// based on: "Accept: { text: 'extracted doc text', question: 'user's question' }"
router.post("/chat", rateLimitAI, async (req, res) => {
  const { text, question } = req.body;
  
  if (!text || !question) {
    return res.status(400).json({ error: "Missing document 'text' or user 'question' in request body." });
  }

  try {
    console.log(`[AI Chat] Calling Gemini API for question: "${question}"`);
    const prompt = `Based on this document: \n\n${text.substring(0, 50000)}\n\nAnswer this question: ${question}`;
    
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    console.log(`[AI Chat] Success.`);
    res.json({ status: "ok", answer });

  } catch (error) {
    console.error("[AI Chat] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Since the user request implies they MIGHT send the file for translation (unlike chat), 
// we also provide a helper specifically for extracting text from an uploaded file if needed on the frontend.
router.post("/extract-text", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const text = await extractText(req.file.path, req.file.originalname);
    res.json({ status: "ok", text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    scheduleCleanup(req.file.path);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Translate Document
// ─────────────────────────────────────────────────────────────────────────────
router.post("/translate", upload.single("file"), rateLimitAI, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const targetLanguage = req.body.targetLanguage;
  if (!targetLanguage) {
    scheduleCleanup(req.file.path);
    return res.status(400).json({ error: "No targetLanguage specified" });
  }

  try {
    console.log(`[AI Translate] Extracting text for translation to ${targetLanguage}...`);
    const documentText = await extractText(req.file.path, req.file.originalname);
    
    if (documentText.trim().length === 0) {
      throw new Error("Could not extract any text from the document.");
    }

    console.log(`[AI Translate] Calling Gemini API...`);
    const prompt = `Translate this document text to ${targetLanguage}. Preserve formatting exactly as provided.\n\nText:\n${documentText.substring(0, 30000)}`;
    
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text();

    console.log(`[AI Translate] Success.`);
    res.json({ status: "ok", translatedText });

  } catch (error) {
    console.error("[AI Translate] Error:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    scheduleCleanup(req.file.path);
  }
});

module.exports = router;
