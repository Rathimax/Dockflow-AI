"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import axios from "axios";
import ReactMarkdown from "react-markdown";

// ─── Types ──────────────────────────────────────────────────────────────────

type ExamType = "university" | "competitive" | "self-learning";
type DepthLevel = "surface" | "intermediate" | "deep-dive";
type Difficulty = "easy" | "medium" | "hard";
type TopicMode = "equal" | "selective";

interface StudyConfig {
  files: File[];
  examType: ExamType | null;
  depthLevel: DepthLevel | null;
  topicMode: TopicMode;
  detectedTopics: string[];
  selectedTopics: string[];
  difficulty: Difficulty[];
  extractedText: string;
}

interface GeneratedContent {
  notes: string;
  summary: string;
  examPrep: string;
}

// ─── Step icons (Lucide-style SVGs) ─────────────────────────────────────────

const StepIcons: Record<number, React.ReactNode> = {
  1: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  2: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  3: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 5 4-9"/></svg>,
  4: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  5: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m6.8 15-3.5 2"/><path d="m20.7 7-3.5 2"/><path d="M6.8 9 3.3 7"/><path d="m20.7 17-3.5-2"/><path d="m9 22 3-8 3 8"/><path d="M8 22h8"/></svg>,
  6: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8h-2c0-3 2-4 2-6a4 4 0 0 0-4-4"/></svg>,
  7: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
};

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Exam Type" },
  { id: 3, label: "Depth" },
  { id: 4, label: "Topics" },
  { id: 5, label: "Difficulty" },
  { id: 6, label: "Generate" },
  { id: 7, label: "Download" },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function StudyToolPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<StudyConfig>({
    files: [],
    examType: null,
    depthLevel: null,
    topicMode: "equal",
    detectedTopics: [],
    selectedTopics: [],
    difficulty: [],
    extractedText: "",
  });
  const [isDetectingTopics, setIsDetectingTopics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"notes" | "summary" | "examPrep">("notes");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

  // ── Navigation ────────────────────────────────────────────────────────────

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1: return config.files.length > 0;
      case 2: return config.examType !== null;
      case 3: return config.depthLevel !== null;
      case 4: return config.detectedTopics.length > 0 && 
        (config.topicMode === "equal" || config.selectedTopics.length > 0);
      case 5: return config.difficulty.length > 0;
      default: return true;
    }
  }, [currentStep, config]);

  const goNext = async () => {
    if (!canProceed()) return;

    if (currentStep === 3 && config.detectedTopics.length === 0) {
      // Moving from depth to topics — detect topics first
      await detectTopics();
      return;
    }

    if (currentStep === 5) {
      // Moving from difficulty to generate — start generation
      setCurrentStep(6);
      await generateStudyMaterials();
      return;
    }

    setCurrentStep((s) => Math.min(s + 1, 7));
  };

  const goBack = () => {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (droppedFiles.length > 0) {
      setConfig((c) => ({ ...c, files: [...c.files, ...droppedFiles] }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setConfig((c) => ({ ...c, files: [...c.files, ...selected] }));
    }
  };

  const removeFile = (index: number) => {
    setConfig((c) => ({ ...c, files: c.files.filter((_, i) => i !== index) }));
  };

  // ── Topic Detection ───────────────────────────────────────────────────────

  const detectTopics = async () => {
    setIsDetectingTopics(true);
    setError(null);

    const formData = new FormData();
    config.files.forEach((file) => formData.append("files", file));

    try {
      const response = await axios.post(
        `${apiUrl}/api/ai/study/detect-topics`,
        formData
      );

      if (response.data.status === "ok") {
        setConfig((c) => ({
          ...c,
          detectedTopics: response.data.topics,
          extractedText: response.data.extractedText,
        }));
        setCurrentStep(4);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || "Failed to detect topics.";
      setError(msg);
    } finally {
      setIsDetectingTopics(false);
    }
  };

  // ── Generation ────────────────────────────────────────────────────────────

  const generateStudyMaterials = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    // Simulate phases for UX feedback
    const phases = [
      { label: "Analyzing your study material...", progress: 10 },
      { label: "Generating comprehensive notes...", progress: 30 },
      { label: "Creating revision summary...", progress: 55 },
      { label: "Building exam prep questions...", progress: 75 },
      { label: "Finalizing documents...", progress: 90 },
    ];

    let phaseIndex = 0;
    const phaseInterval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setGenerationPhase(phases[phaseIndex].label);
        setGenerationProgress(phases[phaseIndex].progress);
        phaseIndex++;
      }
    }, 4000);

    try {
      setGenerationPhase(phases[0].label);
      setGenerationProgress(phases[0].progress);

      const response = await axios.post(`${apiUrl}/api/ai/study/generate`, {
        text: config.extractedText,
        examType: config.examType,
        depthLevel: config.depthLevel,
        topicFocus: {
          mode: config.topicMode,
          selectedTopics: config.selectedTopics,
        },
        difficulty: config.difficulty,
      });

      clearInterval(phaseInterval);

      if (response.data.status === "ok") {
        setGenerated({
          notes: response.data.notes,
          summary: response.data.summary,
          examPrep: response.data.examPrep,
        });
        setGenerationProgress(100);
        setGenerationPhase("Complete!");

        setTimeout(() => setCurrentStep(7), 800);
      }
    } catch (err: any) {
      clearInterval(phaseInterval);
      const msg = err?.response?.data?.error || err.message || "Generation failed.";
      setError(msg);
      setCurrentStep(5);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Download helpers ──────────────────────────────────────────────────────

  const downloadFile = async (content: string, filename: string) => {
    // Dynamically import to avoid SSR 'window is not defined' issues
    const { marked } = await import("marked");
    // @ts-ignore
    const html2pdf = (await import("html2pdf.js")).default;

    // Convert markdown to HTML
    const rawHtml = await marked.parse(content);
    
    // Wrap in a styled container for professional look
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; line-height: 1.6; color: #111;">
        ${rawHtml}
      </div>
    `;

    const opt = {
      margin:       15,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt as any).from(html).save();
  };

  const downloadAll = () => {
    if (!generated) return;
    downloadFile(generated.notes, "study-notes.pdf");
    setTimeout(() => downloadFile(generated.summary, "revision-summary.pdf"), 500);
    setTimeout(() => downloadFile(generated.examPrep, "exam-prep-questions.pdf"), 1000);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setCurrentStep(1);
    setConfig({
      files: [],
      examType: null,
      depthLevel: null,
      topicMode: "equal",
      detectedTopics: [],
      selectedTopics: [],
      difficulty: [],
      extractedText: "",
    });
    setGenerated(null);
    setError(null);
    setGenerationPhase("");
    setGenerationProgress(0);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const fadeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-black mb-4 tracking-wider uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
          AI-Powered Study Assistant
        </div>
        <h1 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter mb-3">
          Exam Prep <span className="text-primary">Generator</span>
        </h1>
        <p className="text-sm md:text-lg text-foreground/50 max-w-2xl mx-auto font-bold tracking-tight">
          Upload your study material, configure your exam preferences, and get AI-generated notes, summaries, and practice questions.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center justify-between max-w-3xl mx-auto px-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl flex items-center justify-center text-sm md:text-lg font-black transition-all duration-500 shadow-lg",
                    currentStep === step.id
                      ? "bg-primary text-white scale-110 shadow-primary/30"
                      : currentStep > step.id
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-muted text-foreground/30 shadow-none"
                  )}
                >
                  {currentStep > step.id ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    StepIcons[step.id]
                  )}
                </div>
                <span className={cn(
                  "text-[8px] md:text-[10px] font-black uppercase tracking-wider mt-1.5 transition-colors",
                  currentStep === step.id ? "text-primary" : "text-foreground/30"
                )}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 md:mx-2 rounded-full transition-all duration-500",
                  currentStep > step.id ? "bg-emerald-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Upload ───────────────────────────────────────── */}
          {currentStep === 1 && (
            <motion.div key="step-1" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full min-h-[280px] p-8 md:p-12 border-2 border-dashed rounded-[2rem] md:rounded-[3rem] transition-all duration-500 overflow-hidden",
                  "border-divider bg-card shadow-2xl shadow-black/5 hover:border-primary/20 hover:shadow-primary/5"
                )}
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative z-10 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-2xl shadow-primary/30 mb-5 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2 tracking-tight text-foreground">Upload Study Material</h3>
                <p className="text-foreground/40 font-bold text-xs md:text-sm mb-6 text-center max-w-md">
                  Drag & drop your PDF files here, or click to browse.<br />
                  Upload textbooks, notes, or any study material.
                </p>
                <label className="cursor-pointer">
                  <span className="flex items-center justify-center px-8 py-3.5 bg-foreground text-background rounded-2xl font-black text-sm shadow-xl shadow-black/20 hover:opacity-90 transition-all active:scale-95">
                    Browse PDFs
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                  />
                </label>
                <div className="mt-6 flex items-center gap-3 py-2 px-5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Accepted: PDF (max 50MB each)
                  </p>
                </div>
              </div>

              {/* File list */}
              {config.files.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                    {config.files.length} {config.files.length === 1 ? "file" : "files"} selected
                  </p>
                  {config.files.map((file, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-card border border-divider rounded-2xl shadow-sm hover:border-primary/20 transition-all group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground truncate text-sm">{file.name}</p>
                        <p className="text-[10px] text-foreground/40 font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="p-2 text-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 2: Exam Type ────────────────────────────────────── */}
          {currentStep === 2 && (
            <motion.div key="step-2" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">What are you studying for?</h2>
                  <p className="text-foreground/40 font-bold text-sm">This helps us tailor the content to your exam format.</p>
                </div>
                <div className="grid gap-4">
                  {([
                    { value: "university" as ExamType, title: "University Exam", desc: "Semester exams with theory, derivations & conceptual depth", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
                    { value: "competitive" as ExamType, title: "Competitive Exam", desc: "Entrance exams, aptitude tests & problem-solving focus", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
                    { value: "self-learning" as ExamType, title: "Self-Learning", desc: "Personal mastery with practical applications & deep understanding", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConfig((c) => ({ ...c, examType: opt.value }))}
                      className={cn(
                        "flex items-center gap-5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 text-left transition-all duration-300 group cursor-pointer",
                        config.examType === opt.value
                          ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                          : "border-divider bg-card hover:border-primary/20 hover:shadow-lg"
                      )}
                    >
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shrink-0",
                        config.examType === opt.value ? "bg-primary/15 text-primary scale-110" : "bg-muted text-foreground/40 group-hover:scale-105"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-foreground text-lg tracking-tight">{opt.title}</h3>
                        <p className="text-foreground/40 font-bold text-xs md:text-sm mt-0.5">{opt.desc}</p>
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        config.examType === opt.value ? "border-primary bg-primary" : "border-foreground/20"
                      )}>
                        {config.examType === opt.value && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Depth Level ──────────────────────────────────── */}
          {currentStep === 3 && (
            <motion.div key="step-3" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">How deep should we go?</h2>
                  <p className="text-foreground/40 font-bold text-sm">Choose the level of detail for your study materials.</p>
                </div>
                <div className="grid gap-4">
                  {([
                    { value: "surface" as DepthLevel, title: "Surface Level", desc: "Key points & high-level overview for quick revision", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>, bars: 1 },
                    { value: "intermediate" as DepthLevel, title: "Intermediate", desc: "Moderate detail with examples & important subtopics", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/></svg>, bars: 2 },
                    { value: "deep-dive" as DepthLevel, title: "Deep Dive", desc: "Comprehensive coverage with derivations, edge cases & advanced concepts", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>, bars: 3 },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConfig((c) => ({ ...c, depthLevel: opt.value }))}
                      className={cn(
                        "flex items-center gap-5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 text-left transition-all duration-300 group cursor-pointer",
                        config.depthLevel === opt.value
                          ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                          : "border-divider bg-card hover:border-primary/20 hover:shadow-lg"
                      )}
                    >
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all shrink-0",
                        config.depthLevel === opt.value ? "bg-primary/15 text-primary scale-110" : "bg-muted text-foreground/40 group-hover:scale-105"
                      )}>
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-foreground text-lg tracking-tight">{opt.title}</h3>
                        <p className="text-foreground/40 font-bold text-xs md:text-sm mt-0.5">{opt.desc}</p>
                        {/* Depth indicator bars */}
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3].map((bar) => (
                            <div key={bar} className={cn(
                              "h-1 rounded-full transition-all",
                              bar <= opt.bars
                                ? config.depthLevel === opt.value ? "bg-primary w-8" : "bg-foreground/20 w-8"
                                : "bg-foreground/10 w-4"
                            )} />
                          ))}
                        </div>
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        config.depthLevel === opt.value ? "border-primary bg-primary" : "border-foreground/20"
                      )}>
                        {config.depthLevel === opt.value && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Topics ───────────────────────────────────────── */}
          {currentStep === 4 && (
            <motion.div key="step-4" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">Topic Focus</h2>
                  <p className="text-foreground/40 font-bold text-sm">AI detected {config.detectedTopics.length} topics. Choose your study focus.</p>
                </div>

                {/* Mode toggle */}
                <div className="flex gap-3 mb-6 p-1.5 bg-muted rounded-2xl">
                  <button
                    onClick={() => setConfig((c) => ({ ...c, topicMode: "equal", selectedTopics: [] }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-sm transition-all",
                      config.topicMode === "equal"
                        ? "bg-background text-foreground shadow-lg"
                        : "text-foreground/40 hover:text-foreground/60"
                    )}
                  >
                    Equal Depth for All
                  </button>
                  <button
                    onClick={() => setConfig((c) => ({ ...c, topicMode: "selective" }))}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-sm transition-all",
                      config.topicMode === "selective"
                        ? "bg-background text-foreground shadow-lg"
                        : "text-foreground/40 hover:text-foreground/60"
                    )}
                  >
                    Select Topics to Deep-Dive
                  </button>
                </div>

                {/* Topic list */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                  {config.detectedTopics.map((topic, i) => {
                    const isSelected = config.selectedTopics.includes(topic);
                    const isDisabled = config.topicMode === "equal";
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isDisabled) return;
                          setConfig((c) => ({
                            ...c,
                            selectedTopics: isSelected
                              ? c.selectedTopics.filter((t) => t !== topic)
                              : [...c.selectedTopics, topic],
                          }));
                        }}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                          isDisabled
                            ? "border-divider bg-card/50 opacity-60 cursor-default"
                            : isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-divider bg-card hover:border-primary/20 cursor-pointer"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          isDisabled
                            ? "border-foreground/10 bg-foreground/5"
                            : isSelected
                            ? "border-primary bg-primary"
                            : "border-foreground/20"
                        )}>
                          {(isSelected || isDisabled) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDisabled ? "currentColor" : "white"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isDisabled ? "text-foreground/20" : ""}><path d="M20 6 9 17l-5-5"/></svg>
                          )}
                        </div>
                        <span className="font-bold text-foreground text-sm">{topic}</span>
                        {isSelected && !isDisabled && (
                          <span className="ml-auto text-[9px] font-black text-primary uppercase tracking-wider">Deep Dive</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {config.topicMode === "equal" && (
                  <p className="text-center mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    All {config.detectedTopics.length} topics will be covered equally
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: Difficulty ───────────────────────────────────── */}
          {currentStep === 5 && (
            <motion.div key="step-5" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">Question Difficulty</h2>
                  <p className="text-foreground/40 font-bold text-sm">Select difficulty levels for your exam prep questions.</p>
                </div>

                {/* Select All toggle */}
                <button
                  onClick={() => {
                    const all: Difficulty[] = ["easy", "medium", "hard"];
                    setConfig((c) => ({
                      ...c,
                      difficulty: c.difficulty.length === 3 ? [] : all,
                    }));
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 font-black text-sm transition-all mb-4",
                    config.difficulty.length === 3
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-divider bg-card text-foreground/50 hover:border-primary/20"
                  )}
                >
                  {config.difficulty.length === 3 ? "✓ All Levels Selected" : "Select All Difficulty Levels"}
                </button>

                <div className="grid gap-4">
                  {([
                    { value: "easy" as Difficulty, title: "Easy", desc: "Basic recall, definitions & straightforward questions", color: "emerald", questions: "10 questions" },
                    { value: "medium" as Difficulty, title: "Medium", desc: "Application-based, analytical & multi-step questions", color: "amber", questions: "10 questions" },
                    { value: "hard" as Difficulty, title: "Hard", desc: "Advanced problem-solving, critical thinking & synthesis", color: "rose", questions: "5 questions" },
                  ]).map((opt) => {
                    const isSelected = config.difficulty.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            difficulty: isSelected
                              ? c.difficulty.filter((d) => d !== opt.value)
                              : [...c.difficulty, opt.value],
                          }))
                        }
                        className={cn(
                          "flex items-center gap-5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 text-left transition-all duration-300 group cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                            : "border-divider bg-card hover:border-primary/20 hover:shadow-lg"
                        )}
                      >
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all shrink-0",
                          isSelected ? "bg-primary/15 text-primary scale-110" : "bg-muted text-foreground/30 group-hover:scale-105"
                        )}>
                          {opt.value === "easy" ? "E" : opt.value === "medium" ? "M" : "H"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-foreground text-lg tracking-tight">{opt.title}</h3>
                            <span className="text-[9px] font-black uppercase tracking-wider text-foreground/30 bg-muted px-2 py-0.5 rounded-full">
                              {opt.questions}
                            </span>
                          </div>
                          <p className="text-foreground/40 font-bold text-xs md:text-sm mt-0.5">{opt.desc}</p>
                        </div>
                        <div className={cn(
                          "h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "border-primary bg-primary" : "border-foreground/20"
                        )}>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 6: Generating ───────────────────────────────────── */}
          {currentStep === 6 && (
            <motion.div key="step-6" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-lg mx-auto text-center py-16">
                <div className="relative mx-auto mb-8">
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 h-24 w-24 mx-auto rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="relative h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">
                  Generating Study Materials
                </h2>
                <p className="text-foreground/40 font-bold text-sm mb-8">
                  {generationPhase || "Preparing..."}
                </p>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-primary to-emerald-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
                  {generationProgress}% Complete
                </p>

                <p className="mt-8 text-foreground/30 font-bold text-xs">
                  This usually takes 30–90 seconds depending on the document size.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── STEP 7: Download Results ─────────────────────────────── */}
          {currentStep === 7 && generated && (
            <motion.div key="step-7" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
              <div className="max-w-3xl mx-auto">
                {/* Success header */}
                <div className="text-center mb-8">
                  <div className="h-16 w-16 mx-auto bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">Your Study Materials are Ready!</h2>
                  <p className="text-foreground/40 font-bold text-sm">Download individual files or grab everything at once.</p>
                </div>

                {/* Download cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {([
                    { key: "notes" as const, title: "Study Notes", desc: "Comprehensive notes with headings & key terms", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>, filename: "study-notes.pdf" },
                    { key: "summary" as const, title: "Revision Summary", desc: "Concise bullet-point summary for quick revision", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>, filename: "revision-summary.pdf" },
                    { key: "examPrep" as const, title: "Exam Prep", desc: "Practice questions with detailed answer key", icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, filename: "exam-prep-questions.pdf" },
                  ]).map((doc) => (
                    <div key={doc.key} className="p-5 bg-card border border-divider rounded-2xl shadow-sm hover:shadow-lg hover:border-primary/20 transition-all group">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{doc.icon}</div>
                      <h3 className="font-black text-foreground tracking-tight mb-1">{doc.title}</h3>
                      <p className="text-foreground/40 font-bold text-xs mb-4 leading-relaxed">{doc.desc}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadFile(generated[doc.key], doc.filename)}
                          className="flex-1 py-2.5 bg-primary text-white rounded-xl font-black text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => setPreviewTab(doc.key)}
                          className="py-2.5 px-3 bg-muted text-foreground/60 rounded-xl font-black text-xs hover:text-foreground transition-all"
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download All */}
                <button
                  onClick={downloadAll}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg tracking-tight shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Download All Files
                </button>

                <button onClick={reset} className="w-full py-3 text-foreground/40 hover:text-primary font-black text-sm uppercase tracking-widest transition-colors">
                  Start Over
                </button>

                {/* Preview panel */}
                <div className="mt-8 bg-card border border-divider rounded-[2rem] overflow-hidden shadow-xl">
                  <div className="flex border-b border-divider">
                    {(["notes", "summary", "examPrep"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setPreviewTab(tab)}
                        className={cn(
                          "flex-1 py-3 font-black text-xs uppercase tracking-wider transition-all",
                          previewTab === tab
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-foreground/30 hover:text-foreground/50"
                        )}
                      >
                        {tab === "examPrep" ? "Exam Prep" : tab === "notes" ? "Notes" : "Summary"}
                      </button>
                    ))}
                  </div>
                  <div className="p-6 md:p-8 max-h-[500px] overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed font-medium">
                      <ReactMarkdown>{generated[previewTab]}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-2xl text-center text-sm font-bold"
        >
          {error}
        </motion.div>
      )}

      {/* Navigation buttons */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between mt-8 max-w-2xl mx-auto">
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all",
              currentStep === 1
                ? "text-foreground/20 cursor-not-allowed"
                : "text-foreground/50 hover:text-foreground hover:bg-muted"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </button>

          <button
            onClick={goNext}
            disabled={!canProceed() || isDetectingTopics}
            className={cn(
              "flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-xl",
              canProceed() && !isDetectingTopics
                ? "bg-primary text-white hover:bg-primary/90 shadow-primary/20 active:scale-95"
                : "bg-muted text-foreground/30 cursor-not-allowed shadow-none"
            )}
          >
            {isDetectingTopics ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Detecting Topics...
              </>
            ) : currentStep === 5 ? (
              <>
                Generate Study Materials
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </>
            ) : (
              <>
                Continue
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-12 flex items-center justify-center gap-2 text-[9px] text-foreground/30 font-black uppercase tracking-[0.2em]">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Your files are deleted within 60 seconds • 5 Generations per day
      </div>
    </div>
  );
}
