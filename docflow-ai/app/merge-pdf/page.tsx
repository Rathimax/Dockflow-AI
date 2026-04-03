import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "Merge PDF — Free, No Limit | DocFlow AI",
  description: "Combine multiple PDF files into one single document in seconds. 100% free, no limits, no signup. Secure and fast PDF merger tool.",
  keywords: "merge pdf, free pdf merger, combine pdf files, no limit, no signup, join pdf, merge pdf online",
  alternates: {
    canonical: "/merge-pdf",
  },
};

export default function MergePdfPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">Merge PDF</h1>
        <p className="text-base md:text-xl text-foreground/60 mb-10 md:mb-16 font-medium">
          Combine multiple PDF files into one single document in seconds. 
          Drag and drop your files in the order you want them merged.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/merge-pdf" 
          accept=".pdf"
          multiple={true}
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-bold uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}

