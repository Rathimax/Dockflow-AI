const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const convertRoutes = require("./routes/convert");
const aiRoutes = require("./routes/ai");
const pdfRoutes = require("./routes/pdf");

const app = express();
const PORT = process.env.PORT || 5005;

// --- Ensure temp upload directory exists ---
const TMP_DIR = "/tmp/uploads";
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// --- Middleware ---
app.use(cors({
  origin: "*", // Allow all origins for the public API
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Content-Disposition"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Health Check ---
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- Routes ---
app.use("/api/convert", convertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/pdf", pdfRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("[Error]", err.stack || err.message);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`✅ DocFlow backend running on port ${PORT}`);
});
