import type { Metadata } from "next";
import UploadBox from "@/components/UploadBox";

export const metadata: Metadata = {
  title: "PDF to Image — Free, No Limit | DocFlow AI",
  description: "Export pages from your PDF documents as high-quality JPG or PNG images. 100% free, no limits, no signup. Fast PDF to image exact converter.",
  keywords: "pdf to image, free pdf to jpg converter, no limit, no signup, extract images from pdf, pdf to png",
  alternates: {
    canonical: "/pdf-to-image",
  },
};

export default function PdfToImagePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto px-6 py-12 md:py-24 max-w-4xl text-center">
        <h1 className="text-3xl md:text-6xl font-black mb-6 tracking-tight">PDF to Image</h1>
        <p className="text-base md:text-xl text-foreground/60 mb-10 md:mb-16 font-medium">
          Export pages from your PDF documents as high-quality JPG or PNG images. 
          Extract images from large PDF files effortlessly.
        </p>
        
        <UploadBox 
          endpoint="/api/convert/pdf-to-image" 
          accept=".pdf"
        />

        <div className="ad-slot mt-16 p-8 bg-muted rounded-2xl border border-divider text-foreground/40 text-[10px] font-bold uppercase tracking-widest">
          Advertisement Placeholder
        </div>
      </main>
    </div>
  );
}

