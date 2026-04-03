import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "PowerPoint to PDF — Free, No Limit | DocFlow AI",
  description: "Convert PowerPoint presentations to PDF. Preserves layout, fonts and images. 100% free, no limits, no signups. Fast and secure.",
  keywords: "ppt to pdf, pptx to pdf, powerpoint converter, free pdf converter, no limit, no signup",
  alternates: {
    canonical: "/ppt-to-pdf",
  },
};

export default function PptToPdfPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight text-foreground">PowerPoint to PDF</h1>
        <p className="text-base md:text-xl text-foreground/40 mb-10 md:mb-16 font-bold leading-relaxed">
          Convert PowerPoint presentations to PDF. <br className="hidden md:block" />
          Preserves layout, fonts and images. No limits, no signups, and completely free.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/ppt-to-pdf" 
          accept=".ppt,.pptx"
          buttonLabel="Convert to PDF"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-black uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}
