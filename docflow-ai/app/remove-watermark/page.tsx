"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import { cn } from "@/lib/utils";
import axios from "axios";

export default function RemoveWatermark() {
  const [step, setStep] = useState<"upload" | "processing" | "download">("upload");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleRemoveWatermark = async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    setStep("processing");
    
    const formData = new FormData();
    formData.append("file", originalFile);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
    try {
      const res = await axios.post(`${apiUrl}/api/pdf/remove-watermark`, formData, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setConvertedBlobUrl(url);
      setCustomFileName(originalFile.name.replace(".pdf", "-cleaned"));
      setStep("download");
      setStatusMessage("Watermark removed. Please verify your PDF.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to remove watermark. Please try again.");
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    if (convertedBlobUrl) window.URL.revokeObjectURL(convertedBlobUrl);
    setConvertedBlobUrl(null);
    setOriginalFile(null);
    setStep("upload");
    setStatusMessage("");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl min-h-[85vh]">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">Remove Watermark</h1>
        <p className="text-foreground/60 max-w-2xl mx-auto font-bold lowercase tracking-tight">
          BEST EFFORT REMOVAL — COMPLEX WATERMARKS MAY REQUIRE MANUAL EDITING.
        </p>
      </div>

      {step === "upload" && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <UploadBox
            endpoint="/api/pdf/load" // Just to validate the PDF first
            responseType="json"
            accept=".pdf"
            buttonLabel="Select PDF to Clean"
            loadingLabel="Checking PDF..."
            onFileSelect={(files) => setOriginalFile(files[0])}
            onSuccess={() => {
                // We don't need the preview data here, just want to trigger the next step
            }}
          />
          
          <div className="mt-12 p-8 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
            <div className="h-12 w-12 shrink-0 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <p className="text-amber-500/80 font-bold text-sm md:text-base text-center md:text-left leading-relaxed">
              Our AI will attempt to detect and remove watermarks. <br className="hidden md:block" />
              Results may vary depending on how the watermark was added.
            </p>
          </div>

          {originalFile && (
            <button
              onClick={handleRemoveWatermark}
              className="w-full mt-8 py-6 bg-primary text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              Remove Watermark
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          )}
        </div>
      )}

      {step === "processing" && (
        <div className="max-w-xl mx-auto text-center py-20 animate-in fade-in duration-500">
          <div className="relative w-32 h-32 mx-auto mb-12">
            <div className="absolute inset-0 border-8 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-pulse"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tighter">Analyzing PDF...</h2>
          <p className="text-foreground/40 font-bold uppercase tracking-widest text-xs">Scanning for watermark layers and transparency masks</p>
        </div>
      )}

      {step === "download" && convertedBlobUrl && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="bg-card border border-divider rounded-[3rem] p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                
                <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">Success!</h2>
                <p className="text-foreground/60 font-bold text-lg mb-12">{statusMessage}</p>

                <div className="max-w-md mx-auto space-y-6">
                    <div className="group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 ml-1 text-left">File Name</label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={customFileName}
                                onChange={(e) => setCustomFileName(e.target.value)}
                                className="w-full bg-muted border-2 border-divider focus:border-primary/20 px-8 py-5 rounded-3xl outline-none font-black text-xl pr-20"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-lg uppercase">.pdf</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            const link = document.createElement("a");
                            link.href = convertedBlobUrl;
                            link.setAttribute("download", `${customFileName}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        }}
                        className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                    >
                        Download PDF
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-1 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    
                    <button 
                        onClick={reset}
                        className="w-full py-4 rounded-2xl font-bold text-foreground/40 hover:text-foreground flex items-center justify-center gap-2 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="M18 17V7"/></svg>
                        Process Another File
                    </button>
                </div>
           </div>
        </div>
      )}
    </div>
  );
}
