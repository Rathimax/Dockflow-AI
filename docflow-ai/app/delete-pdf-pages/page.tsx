"use client";

import { useState } from "react";
import UploadBox from "@/components/UploadBox";
import { cn } from "@/lib/utils";
import axios from "axios";

export default function DeletePdfPages() {
  const [pdfData, setPdfData] = useState<{ pages: string[], pageCount: number } | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [deletedIndexes, setDeletedIndexes] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finalPageCount, setFinalPageCount] = useState(0);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");

  const togglePageDeletion = (index: number) => {
    setDeletedIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    if (!pdfData) return;
    const all = new Set(Array.from({ length: pdfData.pageCount }, (_, i) => i));
    setDeletedIndexes(all);
  };

  const deselectAll = () => {
    setDeletedIndexes(new Set());
  };

  const handleDeletePages = async () => {
    if (deletedIndexes.size === 0 || !originalFile || !pdfData) return;

    if (deletedIndexes.size >= pdfData.pageCount) {
      alert("You must keep at least 1 page.");
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append("file", originalFile);
    formData.append("deletedPageIndexes", JSON.stringify(Array.from(deletedIndexes)));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
    try {
      const res = await axios.post(`${apiUrl}/api/convert/delete-pages`, formData, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setConvertedBlobUrl(url);
      setCustomFileName(originalFile.name.replace(".pdf", "-edited"));
      
      setFinalPageCount(pdfData.pageCount - deletedIndexes.size);
      setSaved(true);
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          alert(json.error || "Failed to delete pages");
        } catch {
          alert("Failed to delete pages");
        }
      } else {
        alert("Failed to delete pages");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    if (convertedBlobUrl) window.URL.revokeObjectURL(convertedBlobUrl);
    setConvertedBlobUrl(null);
    setPdfData(null);
    setOriginalFile(null);
    setDeletedIndexes(new Set());
    setSaved(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl min-h-[80vh]">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Delete PDF Pages</h1>
        <p className="text-foreground/60 max-w-2xl mx-auto font-bold">
          Remove unwanted pages from your PDF instantly. Preview all pages and select which ones to delete.
        </p>
      </div>

      {!pdfData && !saved && (
        <UploadBox
          endpoint="/api/pdf/load"
          responseType="json"
          accept=".pdf"
          buttonLabel="Load PDF"
          loadingLabel="Loading pages..."
          onFileSelect={(files) => setOriginalFile(files[0])}
          onSuccess={(data) => setPdfData(data)}
        />
      )}

      {pdfData && !saved && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black">Select Pages to Delete</h2>
            <div className="flex gap-4">
              <button onClick={selectAll} className="text-sm font-bold text-foreground/60 hover:text-foreground">Select All</button>
              <button onClick={deselectAll} className="text-sm font-bold text-foreground/60 hover:text-foreground">Deselect All</button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pb-40">
            {pdfData.pages.map((imgSrc, i) => {
              const isDeleted = deletedIndexes.has(i);
              return (
                <div 
                  key={i} 
                  onClick={() => togglePageDeletion(i)}
                  className={cn(
                    "cursor-pointer relative rounded-2xl overflow-hidden border-4 transition-all duration-300",
                    isDeleted ? "border-red-500 scale-[0.98] opacity-80" : "border-transparent hover:border-primary/30"
                  )}
                >
                  <img src={imgSrc} alt={`Page ${i + 1}`} className="w-full h-auto bg-white" />
                  
                  {isDeleted && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-red-500 text-white rounded-full p-4 shadow-xl rotate-12 scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 z-10">
                    <div className={cn(
                      "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                      isDeleted ? "bg-red-500 border-red-500 text-white" : "border-black/20 dark:border-white/20 bg-black/20 dark:bg-white/20 backdrop-blur-sm"
                    )}>
                      {isDeleted && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 dark:bg-white/80 text-white dark:text-black shadow-lg backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest z-10">
                    Page {i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="fixed bottom-6 left-0 right-0 px-4 z-50 animate-in slide-in-from-bottom duration-500 pointer-events-none">
            <div className="container mx-auto max-w-3xl pointer-events-auto">
              <div className="bg-background/70 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-3 md:px-6 rounded-full flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
                <div className="font-bold text-sm md:text-base text-foreground flex items-center justify-center md:justify-start">
                  <span className="text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md mr-3 font-black text-sm">{deletedIndexes.size}</span>
                  <span>pages selected for deletion</span>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {deletedIndexes.size >= pdfData.pageCount && pdfData.pageCount > 0 && (
                    <span className="text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-widest text-right flex-1 md:flex-none">
                      Warning: Keep ≥ 1 page
                    </span>
                  )}
                  <button
                    onClick={handleDeletePages}
                    disabled={deletedIndexes.size === 0 || deletedIndexes.size >= pdfData.pageCount || isSaving}
                    className={cn(
                      "px-6 py-2.5 rounded-full font-bold flex justify-center items-center gap-2 transition-all w-full md:w-auto text-sm",
                      (deletedIndexes.size === 0 || deletedIndexes.size >= pdfData.pageCount) 
                        ? "bg-foreground/5 text-foreground/40 cursor-not-allowed border border-divider" 
                        : "bg-red-500 text-white hover:bg-red-600 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/25"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Delete Pages
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {saved && convertedBlobUrl && (
        <div className="fixed inset-0 bg-background z-[200] flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden font-sans">
          {/* Left: Preview Panel */}
          <div className="flex-1 bg-muted flex flex-col items-center justify-center p-4 md:p-8 relative">
            <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-3xl overflow-hidden border border-divider relative">
               <object 
                 data={`${convertedBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                 type="application/pdf"
                 className="w-full h-full"
               >
                 <div className="flex flex-col items-center justify-center h-full p-12 text-center text-foreground/60 gap-6">
                    <p className="font-bold max-w-xs">Your browser doesn't support inline PDF previews.</p>
                 </div>
               </object>
            </div>
            <div className="mt-4 bg-black/5 backdrop-blur-md rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center">
                PDF Preview Mode (Viewing Only)
            </div>
          </div>

          {/* Right: Actions Panel */}
          <div className="w-full md:w-[450px] bg-background border-l border-divider p-8 md:p-12 flex flex-col justify-between shrink-0 overflow-y-auto">
             <div>
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter leading-none text-foreground">Ready!</h1>
                <p className="text-foreground/40 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Review and name your document</p>

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
                          placeholder="document_name"
                       />
                       <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-xs md:text-lg uppercase">.pdf</span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                        <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Status</div>
                        <div className="font-black text-emerald-500 text-xs md:text-sm">Optimized</div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                        <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Pages</div>
                        <div className="font-black text-primary text-xs md:text-sm">{finalPageCount} remaining</div>
                    </div>
                  </div>
                </div>
             </div>

             <div className="space-y-4 mt-12 md:mt-0">
                <button 
                  onClick={() => {
                    if (!convertedBlobUrl) return;
                    const link = document.createElement("a");
                    link.href = convertedBlobUrl;
                    link.setAttribute("download", `${customFileName}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                  className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                    Download File
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"><path d="M7 7l10 10"/><path d="M17 7V17H7"/></svg>
                </button>
                
                <button 
                  onClick={reset}
                  className="w-full py-4 rounded-2xl font-bold text-foreground/40 hover:text-foreground group flex items-center justify-center gap-2 transition-all mb-4 md:mb-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="M18 17V7"/></svg>
                  Return & Upload New
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
