import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "Word to PDF — Free, No Limit | DocFlow AI",
  description: "Convert Microsoft Word documents to professional PDF files instantly. 100% free, no limits, no signup required. Secure and fast Word to PDF converter.",
  keywords: "word to pdf, free word to pdf converter, no limit, no signup, convert docx to pdf, online word converter",
  alternates: {
    canonical: "/word-to-pdf",
  },
};

export default function WordToPdfPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">Word to PDF</h1>
        <p className="text-base md:text-xl text-foreground/60 mb-10 md:mb-16 font-medium">
          Transform your Word documents (.docx, .doc) into professional PDF files instantly. 
          Fast, secure, and preserves your formatting.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/word-to-pdf" 
          accept=".docx,.doc"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-bold uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}

