"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import CustomSelect from "@/components/ui/CustomSelect";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, FileText, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TranslatePDFPage() {
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [showReview, setShowReview] = useState(false);

  const languages = [
    "Spanish", "French", "German", "Chinese", "Japanese", 
    "Korean", "Hindi", "Arabic", "Russian", "Portuguese"
  ];

  const handleSuccess = (data: any) => {
    setIsTranslating(false);
    if (data.translatedText) {
      setTranslatedText(data.translatedText);
      setCustomFileName(`translated_${targetLanguage.toLowerCase()}`);
      setShowReview(true);
    }
  };

  const handleDownload = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${customFileName}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const reset = () => {
    setShowReview(false);
    setTranslatedText(null);
    setIsTranslating(false);
  };

  if (showReview && translatedText) {
    return (
      <div className="fixed inset-0 bg-background z-[200] flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden font-sans">
        {/* Left: Preview Panel */}
        <div className="flex-1 bg-muted flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
          <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-3xl overflow-hidden border border-divider relative flex flex-col">
            <div className="p-6 border-b border-divider bg-card/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-black text-sm uppercase tracking-widest text-foreground/60">Translation Preview</span>
              </div>
              <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest bg-muted px-3 py-1.5 rounded-full">
                {targetLanguage}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 prose prose-blue dark:prose-invert max-w-none">
               <pre className="whitespace-pre-wrap font-medium text-foreground/80 leading-relaxed text-sm md:text-base selection:bg-primary/20 selection:text-primary">
                 {translatedText}
               </pre>
            </div>
          </div>
          <div className="mt-4 bg-black/5 backdrop-blur-md rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center">
              Translated Content (Text Format)
          </div>
        </div>

        {/* Right: Actions Panel */}
        <div className="w-full md:w-[450px] bg-background border-l border-divider p-8 md:p-12 flex flex-col justify-between shrink-0 overflow-y-auto">
           <div>
              <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-emerald-500/10">
                <Check className="w-8 h-8" strokeWidth={3} />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter leading-none text-foreground">Done!</h1>
              <p className="text-foreground/40 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Review and name your translation</p>

              <div className="space-y-8">
                {/* File Name Input */}
                <div className="group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 ml-1 group-focus-within:text-primary transition-colors">File Name</label>
                  <div className="relative">
                     <input 
                        type="text"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="w-full bg-muted border-2 border-divider focus:border-primary/20 focus:bg-background px-6 py-5 rounded-2xl md:rounded-3xl outline-none transition-all font-black text-sm md:text-xl pr-20 text-foreground"
                        placeholder="translation_name"
                     />
                     <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-xs md:text-lg uppercase">.txt</span>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                      <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Format</div>
                      <div className="font-black text-primary text-xs md:text-sm">Plain Text</div>
                  </div>
                  <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                      <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Target</div>
                      <div className="font-black text-emerald-500 text-xs md:text-sm">{targetLanguage}</div>
                  </div>
                </div>
              </div>
           </div>

           <div className="space-y-4 mt-12 md:mt-0">
              <button 
                onClick={handleDownload}
                className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                  Download File
                  <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" strokeWidth={3} />
              </button>
              
              <button 
                onClick={reset}
                className="w-full py-4 rounded-2xl font-bold text-foreground/40 hover:text-foreground group flex items-center justify-center gap-2 transition-all mb-4 md:mb-0"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                Return & Upload New
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 min-h-screen">
      <div className="text-center mb-10 md:mb-14 animate-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter mb-4">
          Translate Document
        </h1>
        <p className="text-sm md:text-lg text-foreground/60 max-w-2xl mx-auto font-bold tracking-tight">
          Instantly translate your PDF or DOCX files into any language using Gemini AI.
        </p>
      </div>

      <div className={cn("max-w-2xl mx-auto mb-10 md:mb-14 animate-in fade-in duration-500 delay-150 relative z-30")}>
        <CustomSelect 
          label="Select Target Language"
          options={languages}
          value={targetLanguage}
          onChange={setTargetLanguage}
          placeholder="Choose language..."
        />
      </div>

      <div onClick={() => setIsTranslating(true)} className="relative z-10">
        <UploadBox 
          endpoint="/api/ai/translate" 
          accept=".pdf,.docx" 
          responseType="json"
          additionalData={{ targetLanguage }}
          onSuccess={handleSuccess}
        />
      </div>

      <AnimatePresence>
        {isTranslating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="max-w-2xl mx-auto mt-8 text-center"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 text-primary rounded-full font-black text-xs md:text-sm uppercase tracking-widest animate-pulse">
              <span className="h-2 w-2 bg-primary rounded-full animate-bounce"></span>
              Translating to {targetLanguage}...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Placeholder */}
      <div className="mt-20 bg-muted border border-divider rounded-[2rem] h-32 flex items-center justify-center text-foreground/20 text-[10px] font-black uppercase tracking-widest">
        Advertisement Placeholder
      </div>
    </div>
  );
}
