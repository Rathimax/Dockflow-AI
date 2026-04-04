"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface UploadBoxProps {
  endpoint: string;
  accept?: string;
  multiple?: boolean;
  responseType?: "blob" | "json";
  onSuccess?: (data: any) => void;
  onFileSelect?: (files: File[]) => void;
  additionalData?: Record<string, string>;
  buttonLabel?: string;
  loadingLabel?: string;
}

export default function UploadBox({ 
  endpoint, 
  accept = "*", 
  multiple = false,
  responseType = "blob",
  onSuccess,
  onFileSelect,
  additionalData = {},
  buttonLabel = "Convert Now",
  loadingLabel = "Processing..."
}: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [fileExtension, setFileExtension] = useState("");


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(multiple ? filesArray : [filesArray[0]]);
      if (onFileSelect) onFileSelect(multiple ? filesArray : [filesArray[0]]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(multiple ? filesArray : [filesArray[0]]);
      if (onFileSelect) onFileSelect(multiple ? filesArray : [filesArray[0]]);
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsConverting(true);
    setStatusMessage(null);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append("file", file);
    });

    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const timeoutWarning = setTimeout(() => {
      const msg = responseType === "json" 
        ? "Processing documents with AI can take up to 60 seconds. Please wait..."
        : "Large file conversion in progress. This may take up to 60 seconds.";
      setStatusMessage(msg);
    }, 30000);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

    try {
      const response = await axios.post(`${apiUrl}${endpoint}`, formData, {
        responseType: responseType,
      });
      
      clearTimeout(timeoutWarning);

      if (responseType === "json") {
        setIsConverted(true);
        setStatusMessage("Analysis Complete!");
        if (onSuccess) onSuccess(response.data);
      } else {
        const contentDisposition = response.headers["content-disposition"];
        let filename = "converted-document";
        if (contentDisposition && contentDisposition.includes("filename=")) {
          filename = contentDisposition.split("filename=")[1].replace(/"/g, "");
        } else {
          if (endpoint.includes("to-word")) filename += ".docx";
          else if (endpoint.includes("to-pdf")) filename += ".pdf";
          else if (endpoint.includes("compress-pdf") || endpoint.includes("merge-pdf")) filename += ".pdf";
          else if (endpoint.includes("to-image")) filename += ".png";
        }

        const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);
        
        // Extract extension and base filename
        const dotIndex = filename.lastIndexOf(".");
        const ext = dotIndex !== -1 ? filename.substring(dotIndex) : "";
        const base = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;

        setConvertedBlobUrl(url);
        setCustomFileName(base);
        setFileExtension(ext);
        setShowReview(true);

        setIsConverted(true);
        setStatusMessage("Process Complete!");
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      clearTimeout(timeoutWarning);
      console.error("Conversion failed:", error);
      let errorMessage = "Something went wrong. Please try again.";
      
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Network error or CORS issue (no response from server)
          errorMessage = `Network Error: Cannot reach the backend at "${apiUrl}". Please verify your NEXT_PUBLIC_API_URL environment variable and check if the backend is running.`;
        } else {
          // Server responded with an error status
          const data = error.response.data;
          if (data instanceof Blob) {
            try {
              const text = await data.text();
              const json = JSON.parse(text);
              errorMessage = json.error || `Server Error (${error.response.status})`;
            } catch (e) {
              errorMessage = `Server Error (${error.response.status})`;
            }
          } else if (typeof data === "object" && data?.error) {
            errorMessage = data.error;
          } else if (typeof data === "string") {
            errorMessage = data;
          } else {
            errorMessage = `Backend Error: ${error.response.statusText}`;
          }
        }
      }
      setStatusMessage(errorMessage);
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    if (convertedBlobUrl) window.URL.revokeObjectURL(convertedBlobUrl);
    setConvertedBlobUrl(null);
    setShowReview(false);
    setSelectedFiles([]);
    setIsConverted(false);
    setIsConverting(false);
    setStatusMessage(null);
  };

  if (showReview && convertedBlobUrl) {
    const handleDownloadFinal = () => {
      const link = document.createElement("a");
      link.href = convertedBlobUrl;
      link.setAttribute("download", `${customFileName}${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    return (
      <div className="fixed inset-0 bg-background z-[200] flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden font-sans">
        {/* Left: Preview Panel */}
        <div className="flex-1 bg-muted flex flex-col items-center justify-center p-4 md:p-8 relative">
          <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-3xl overflow-hidden border border-divider relative">
             <object 
               data={`${convertedBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
               type={fileExtension === ".pdf" ? "application/pdf" : "application/octet-stream"}
               className="w-full h-full"
             >
               {/* Fallback */}
               <div className="flex flex-col items-center justify-center h-full p-12 text-center text-foreground/60 gap-6">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <p className="font-bold max-w-xs">{fileExtension === ".pdf" ? "Your browser doesn't support inline PDF previews." : "Preview not available for this file type."}</p>
                  <button 
                    onClick={handleDownloadFinal}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg"
                  >
                    Download Directly
                  </button>
               </div>
             </object>
          </div>
          {/* Tooltip hint */}
          <div className="mt-4 bg-black/5 backdrop-blur-md rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center">
              {fileExtension === '.pdf' ? 'PDF Preview Mode (Viewing Only)' : 'Document Ready for Download'}
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
                     <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-xs md:text-lg uppercase">{fileExtension}</span>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                      <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Status</div>
                      <div className="font-black text-emerald-500 text-xs md:text-sm">Optimized</div>
                  </div>
                  <div className="bg-muted/50 p-6 rounded-3xl border border-divider text-center md:text-left">
                      <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Protection</div>
                      <div className="font-black text-primary text-xs md:text-sm">Secured</div>
                  </div>
                </div>
              </div>
           </div>

           <div className="space-y-4 mt-12 md:mt-0">
              <button 
                onClick={handleDownloadFinal}
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
    );
  }

  if (selectedFiles.length > 0) {

    return (
      <div className="w-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="relative p-5 md:p-10 bg-card/70 backdrop-blur-2xl border border-divider rounded-2xl md:rounded-[3rem] shadow-2xl shadow-primary/5 overflow-hidden">

          <div className="mb-8 md:mb-10 text-center">
            <h3 className="text-lg md:text-2xl font-black tracking-tight mb-1 text-foreground">Ready to Process</h3>
            <p className="text-foreground/40 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Selected {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"}</p>
          </div>

          <div className="flex flex-col gap-3 md:gap-4 mb-8 md:mb-10">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-5 p-3.5 md:p-5 bg-card border border-divider rounded-xl md:rounded-2xl shadow-sm hover:border-primary/20 transition-all group">
                <div className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-lg md:rounded-xl bg-muted text-primary shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground truncate tracking-tight text-sm md:text-base">{file.name}</p>
                  <p className="text-[10px] md:text-xs text-foreground/40 font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                {!isConverting && !isConverted && (
                  <button onClick={reset} className="p-2 text-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleConvert}
              disabled={isConverting || isConverted}
              className={cn(
                "w-full py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-sm md:text-lg transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl",
                isConverted 
                  ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                  : "bg-primary text-white hover:bg-primary/95 shadow-primary/30",
                isConverting && "opacity-90 pointer-events-none"
              )}
            >
              {isConverting ? (
                <>
                  <svg className="animate-spin h-5 w-5 md:h-6 md:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingLabel}
                </>
              ) : isConverted ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Success
                </>
              ) : (
                <>
                  {buttonLabel}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </>
              )}
            </button>

            {statusMessage && (
              <div className={cn(
                "p-4 md:p-5 rounded-2xl text-center text-xs md:text-sm font-bold tracking-tight animate-in fade-in slide-in-from-top-4 duration-300",
                statusMessage.includes("failed") ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                statusMessage.includes("wait") || statusMessage.includes("longer") ? "bg-amber-500/10 text-amber-700 border border-amber-500/20" :
                "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
              )}>
                {statusMessage}
              </div>
            )}

            {isConverted && (
               <button onClick={reset} className="w-full text-[10px] md:text-sm text-foreground/40 hover:text-primary transition-all font-black uppercase tracking-widest mt-4">
                 Upload another file
               </button>
            )}
          </div>
        </div>
        
        <div className="mt-6 md:mt-8 flex items-center justify-center gap-2 text-[9px] md:text-[10px] text-foreground/40 font-bold uppercase tracking-[0.2em]">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Encrypted & Absolute Privacy
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center w-full min-h-[300px] md:min-h-[450px] p-6 md:p-12 border-2 border-dashed rounded-[2rem] md:rounded-[4rem] transition-all duration-700 overflow-hidden",
        isDragging 
          ? "border-primary bg-primary/5 scale-[0.99] shadow-inner" 
          : "border-divider bg-card shadow-2xl shadow-black/5 hover:border-primary/20 hover:shadow-primary/5"
      )}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 transition-opacity duration-700",
        isDragging ? "opacity-100" : "opacity-0"
      )}></div>

      <div 
        onClick={() => document.getElementById("fileInput")?.click()}
        className="relative z-10 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-2xl md:rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/30 mb-5 md:mb-8 transition-all hover:scale-110 active:scale-95 cursor-pointer group-hover:rotate-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-10 md:h-10"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      </div>
      
      <div className="relative z-10 text-center max-w-sm mb-8 md:mb-12 px-4">
        <h3 className="text-xl md:text-3xl font-black mb-2 md:mb-4 tracking-tight text-foreground">
          {isDragging ? "Drop to upload" : "Select or drag files"}
        </h3>
        <p className="text-foreground/40 font-bold text-xs md:text-lg mb-8 md:mb-12 max-w-md mx-auto leading-relaxed">
          Support for PDF, Word, Excel, and Images. <br className="hidden md:block" />
          Max file size 50MB.
        </p>
      </div>
      
      <label className="relative z-10 cursor-pointer w-full px-8 md:px-0 md:w-auto">
        <span className="flex items-center justify-center px-8 md:px-12 py-3.5 md:py-5 bg-foreground text-background rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-xl shadow-black/20 hover:opacity-90 transition-all active:scale-95">
          Browse Files
        </span>
        <input 
          id="fileInput"
          type="file" 
          className="hidden" 
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
      </label>
      
      <div className="mt-8 md:mt-10 flex items-center gap-3 py-2 px-5 md:px-6 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-full shadow-sm">
         <span className="h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500 rounded-full animate-pulse"></span>
         <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
            Accepted: {accept === "*" ? "All Formats" : accept.replace(/\./g, "").toUpperCase()}
         </p>
      </div>
    </div>
  );
}
