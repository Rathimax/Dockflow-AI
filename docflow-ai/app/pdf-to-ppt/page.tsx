import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "PDF to PowerPoint — Free, No Limit | DocFlow AI",
  description: "Convert PDF to editable PowerPoint slides. Each PDF page becomes a slide. 100% free, no limits, no signups. Fast and secure.",
  keywords: "pdf to ppt, pdf to powerpoint, convert pdf to pptx, free pdf converter, no limit, no signup",
  alternates: {
    canonical: "/pdf-to-ppt",
  },
};

export default function PdfToPptPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight text-foreground">PDF to PowerPoint</h1>
        <p className="text-base md:text-xl text-foreground/40 mb-10 md:mb-16 font-bold leading-relaxed">
          Convert PDF to editable PowerPoint slides. <br className="hidden md:block" />
          Each PDF page becomes a slide. No limits, no signups, and completely free.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/pdf-to-ppt" 
          accept=".pdf"
          buttonLabel="Convert to PPTX"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-black uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}
