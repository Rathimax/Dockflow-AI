import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "PDF to Word — Free, No Limit | DocFlow AI",
  description: "Convert your PDF documents to editable Microsoft Word files with high accuracy. 100% free, no limits, no signups. Fast and secure.",
  keywords: "pdf to word, free pdf to docx converter, no limit, no signup, edit pdf, convert pdf to word online",
  alternates: {
    canonical: "/pdf-to-word",
  },
};

export default function PdfToWordPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">PDF to Word</h1>
        <p className="text-base md:text-xl text-foreground/60 mb-10 md:mb-16 font-medium">
          Convert your PDF documents to editable Microsoft Word files with high accuracy. 
          No limits, no signups, and completely free.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/pdf-to-word" 
          accept=".pdf"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-bold uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}

