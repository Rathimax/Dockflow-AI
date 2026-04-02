"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import ReactMarkdown from "react-markdown";

export default function AISummarizePage() {
  const [summary, setSummary] = useState<string | null>(null);

  const handleSuccess = (data: any) => {
    if (data.summary) {
      setSummary(data.summary);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="text-center mb-10 md:mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-6xl font-black text-foreground tracking-tighter mb-4">
          AI Summarize
        </h1>
        <p className="text-sm md:text-lg text-foreground/60 max-w-2xl mx-auto font-bold tracking-tight">
          Extract the key points from your PDF or DOCX instantly using Google Gemini 2.5.
        </p>

      </div>

      <UploadBox 
        endpoint="/api/ai/summarize" 
        accept=".pdf,.docx" 
        responseType="json"
        onSuccess={handleSuccess}
        buttonLabel="Summarise with ai"
      />

      {summary && (
        <div className="mt-10 md:mt-12 bg-background border border-divider rounded-[2.5rem] shadow-2xl shadow-primary/5 p-6 md:p-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-xl bg-muted text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">Document Summary</h2>
          </div>
          <div className="prose prose-blue dark:prose-invert max-w-none text-foreground leading-relaxed font-medium">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Ad Placeholder */}
      <div className="mt-16 bg-muted border border-divider rounded-[2rem] h-32 flex items-center justify-center text-foreground/20 text-[10px] font-black uppercase tracking-widest">
        Advertisement Placeholder
      </div>
    </div>
  );
}
