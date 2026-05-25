require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { scheduleCleanup } = require("../utils/fileCleanup");
const { extractText } = require("../utils/textExtractor");

// --- Initialize Gemini API ---
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Configure Multer ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "/tmp/uploads"),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter: 5 study generations per day (separate from main AI limit)
// ─────────────────────────────────────────────────────────────────────────────
const studyUsageStore = {};

function rateLimitStudy(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const today = new Date().toISOString().split("T")[0];

  if (!studyUsageStore[ip] || studyUsageStore[ip].date !== today) {
    studyUsageStore[ip] = { count: 0, date: today };
  }

  if (studyUsageStore[ip].count >= 5) {
    return res.status(429).json({
      error: "You have reached your daily limit of 5 study generations. Please try again tomorrow.",
    });
  }

  studyUsageStore[ip].count++;
  console.log(`[StudyRateLimit] Request allowed for ${ip}. Status: ${studyUsageStore[ip].count}/5 today.`);
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Detect Topics — POST /api/ai/study/detect-topics
// ─────────────────────────────────────────────────────────────────────────────
router.post("/detect-topics", upload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const filePaths = req.files.map((f) => f.path);

  try {
    // Extract text from all uploaded PDFs, concatenate
    let combinedText = "";
    for (const file of req.files) {
      console.log(`[Study] Extracting text from ${file.originalname}...`);
      const text = await extractText(file.path, file.originalname);
      combinedText += text + "\n\n--- END OF DOCUMENT ---\n\n";
    }

    if (combinedText.trim().length === 0) {
      throw new Error("Could not extract any text from the uploaded documents.");
    }

    // Cap at 100k characters
    const cappedText = combinedText.substring(0, 100000);

    console.log(`[Study] Detecting topics from ${cappedText.length} characters...`);

    const prompt = `You are an academic assistant. Analyze this study material and identify the main topics/chapters/subjects covered.

Return ONLY a JSON array of topic names. No explanations, no markdown, just the raw JSON array.
Example: ["Linear Algebra", "Calculus", "Probability"]

Study material:
${cappedText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Parse the JSON array from the response
    let topics;
    try {
      // Try to extract JSON array from the response (Gemini sometimes wraps in markdown)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseErr) {
      console.error("[Study] Failed to parse topics:", responseText);
      // Fallback: split by newlines/commas
      topics = responseText
        .replace(/[\[\]"]/g, "")
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    console.log(`[Study] Detected ${topics.length} topics.`);
    res.json({
      status: "ok",
      topics,
      extractedText: cappedText, // Send text back so frontend doesn't re-upload for generation
    });
  } catch (error) {
    console.error("[Study] Topic detection error:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    // Cleanup all uploaded files
    filePaths.forEach((fp) => scheduleCleanup(fp));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Generate Study Materials — POST /api/ai/study/generate
// ─────────────────────────────────────────────────────────────────────────────
router.post("/generate", rateLimitStudy, async (req, res) => {
  const { text, examType, depthLevel, topicFocus, difficulty } = req.body;

  if (!text || !examType || !depthLevel || !topicFocus || !difficulty) {
    return res.status(400).json({
      error: "Missing required fields: text, examType, depthLevel, topicFocus, difficulty",
    });
  }

  // Validate inputs
  const validExamTypes = ["university", "competitive", "self-learning"];
  const validDepths = ["surface", "intermediate", "deep-dive"];
  const validDifficulties = ["easy", "medium", "hard"];

  if (!validExamTypes.includes(examType)) {
    return res.status(400).json({ error: "Invalid exam type" });
  }
  if (!validDepths.includes(depthLevel)) {
    return res.status(400).json({ error: "Invalid depth level" });
  }
  if (!Array.isArray(difficulty) || difficulty.length === 0) {
    return res.status(400).json({ error: "At least one difficulty level required" });
  }

  const cappedText = text.substring(0, 100000);

  // Build context strings for prompts
  const examContext = {
    university: "university semester exams with focus on theory, definitions, derivations, and conceptual understanding",
    competitive: "competitive exams (entrance exams, aptitude tests) with focus on problem-solving, shortcuts, and tricky concepts",
    "self-learning": "self-learning and personal mastery with focus on deep understanding, practical applications, and real-world examples",
  };

  const depthContext = {
    surface: "Keep explanations brief and high-level. Cover key points only.",
    intermediate: "Provide moderate detail with examples. Cover important subtopics.",
    "deep-dive": "Provide comprehensive, in-depth coverage. Include detailed explanations, derivations, edge cases, and advanced concepts.",
  };

  const topicInstruction =
    topicFocus.mode === "equal"
      ? "Cover ALL topics with equal depth and attention."
      : `Focus primarily on these selected topics with extra depth: ${topicFocus.selectedTopics.join(", ")}. Cover other topics briefly.`;

  const difficultyStr = difficulty.join(", ");

  try {
    // ── Step 1: Generate Notes ──────────────────────────────────────────────
    console.log(`[Study] Generating notes (${examType}, ${depthLevel})...`);

    const notesPrompt = `You are an expert academic tutor creating study notes for a student preparing for ${examContext[examType]}.

DEPTH LEVEL: ${depthContext[depthLevel]}
TOPIC FOCUS: ${topicInstruction}

Create comprehensive, well-organized study notes from the following material. Use clear headings, subheadings, bullet points, and highlight key terms in **bold**. Include definitions, formulas, diagrams described in text, and important relationships between concepts.

Format the output as clean Markdown with proper hierarchy (# for main topics, ## for subtopics, ### for sub-subtopics).

Study Material:
${cappedText}`;

    const notesResult = await model.generateContent(notesPrompt);
    const notes = notesResult.response.text();
    console.log(`[Study] Notes generated (${notes.length} chars).`);

    // ── Step 2: Generate Summary ────────────────────────────────────────────
    console.log(`[Study] Generating summary...`);

    const summaryPrompt = `You are an expert academic tutor. Create a concise revision summary from the following study notes. This summary should be perfect for last-minute exam revision.

EXAM TYPE: ${examContext[examType]}
TOPIC FOCUS: ${topicInstruction}

Include:
- Key concepts in bullet points
- Important formulas/definitions in a quick-reference format
- Memory aids/mnemonics where helpful
- Common mistakes to avoid
- Quick-review tables where appropriate

Keep it concise but comprehensive. Format as clean Markdown.

Study Notes:
${notes.substring(0, 50000)}`;

    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();
    console.log(`[Study] Summary generated (${summary.length} chars).`);

    // ── Step 3: Generate Exam Prep Questions ────────────────────────────────
    console.log(`[Study] Generating exam questions (${difficultyStr})...`);

    const questionCounts = {
      easy: difficulty.includes("easy") ? 10 : 0,
      medium: difficulty.includes("medium") ? 10 : 0,
      hard: difficulty.includes("hard") ? 5 : 0,
    };

    const examPrepPrompt = `You are an expert exam paper setter creating practice questions for ${examContext[examType]}.

TOPIC FOCUS: ${topicInstruction}

Generate exam-style practice questions with detailed answers/solutions.

${questionCounts.easy > 0 ? `## Easy Questions (${questionCounts.easy} questions)\nBasic recall, definitions, and straightforward application questions.\n` : ""}
${questionCounts.medium > 0 ? `## Medium Questions (${questionCounts.medium} questions)\nApplication-based, analytical, and multi-step questions.\n` : ""}
${questionCounts.hard > 0 ? `## Hard Questions (${questionCounts.hard} questions)\nAdvanced problem-solving, critical thinking, and synthesis questions.\n` : ""}

For each question:
1. State the question clearly with a number
2. After ALL questions in each section, provide a detailed **Answer Key** section with full solutions/explanations

Format the entire output as clean Markdown. Use proper headings and numbering.

Study Material:
${cappedText.substring(0, 60000)}`;

    const examResult = await model.generateContent(examPrepPrompt);
    const examPrep = examResult.response.text();
    console.log(`[Study] Exam prep generated (${examPrep.length} chars).`);

    // Return all three documents
    res.json({
      status: "ok",
      notes,
      summary,
      examPrep,
    });
  } catch (error) {
    console.error("[Study] Generation error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
