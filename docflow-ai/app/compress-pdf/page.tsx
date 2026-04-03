import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "Compress PDF — Free, No Limit | DocFlow AI",
  description: "Reduce the file size of your PDF documents without losing quality. 100% free, no limits, no signup. Fast and secure PDF compressor.",
  keywords: "compress pdf, free pdf compressor, no limit, no signup, reduce pdf size, optimize pdf, shrink pdf file",
  alternates: {
    canonical: "/compress-pdf",
  },
};

export default function CompressPdfPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">Compress PDF</h1>
        <p className="text-base md:text-xl text-foreground/60 mb-10 md:mb-16 font-medium">
          Reduce the file size of your PDF documents without sacrificing quality. 
          Make your files easier to send via email or upload to the web.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/compress-pdf" 
          accept=".pdf"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-bold uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}

