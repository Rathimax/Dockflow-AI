"use client";

import { useState, useRef, useEffect } from "react";
import UploadBox from "@/components/UploadBox";
import { cn } from "@/lib/utils";
import axios from "axios";

type WatermarkConfig = {
  type: "text" | "image";
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  applyTo: "all" | "first" | "range";
  pageRange: [number, number];
  imageBase64: string | null;
};

export default function AddWatermark() {
  const [step, setStep] = useState<"upload" | "customize" | "download">("upload");
  const [pdfData, setPdfData] = useState<{ pages: string[]; pageCount: number; pageDimensions?: { width: number; height: number }[] } | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");

  const [config, setConfig] = useState<WatermarkConfig>({
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 60,
    color: "#FF0000",
    opacity: 0.3,
    rotation: 45,
    position: "center",
    applyTo: "all",
    pageRange: [1, 1],
    imageBase64: null,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig((prev) => ({ ...prev, imageBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyWatermark = async () => {
    if (!originalFile) return;

    setIsApplying(true);
    const formData = new FormData();
    formData.append("file", originalFile);
    formData.append("watermarkConfig", JSON.stringify({ ...config, type: activeTab }));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";
    try {
      const res = await axios.post(`${apiUrl}/api/convert/add-watermark`, formData, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setConvertedBlobUrl(url);
      setCustomFileName(originalFile.name.replace(".pdf", "-watermarked"));
      setStep("download");
    } catch (err: any) {
      console.error(err);
      alert("Failed to apply watermark. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const reset = () => {
    if (convertedBlobUrl) window.URL.revokeObjectURL(convertedBlobUrl);
    setConvertedBlobUrl(null);
    setPdfData(null);
    setOriginalFile(null);
    setStep("upload");
    setConfig({
      type: "text",
      text: "CONFIDENTIAL",
      fontSize: 60,
      color: "#FF0000",
      opacity: 0.3,
      rotation: 45,
      position: "center",
      applyTo: "all",
      pageRange: [1, 1],
      imageBase64: null,
    });
  };

  // Helper for live preview positioning
  const getPreviewStyles = () => {
    const styles: React.CSSProperties = {
      position: "absolute",
      opacity: config.opacity,
      transform: `rotate(${config.rotation}deg)`,
      pointerEvents: "none",
      transformOrigin: "center center",
      whiteSpace: "nowrap",
      zIndex: 20,
    };

    switch (config.position) {
      case "top-left":
        styles.top = "10%";
        styles.left = "10%";
        break;
      case "top-right":
        styles.top = "10%";
        styles.right = "10%";
        break;
      case "bottom-left":
        styles.bottom = "10%";
        styles.left = "10%";
        break;
      case "bottom-right":
        styles.bottom = "10%";
        styles.right = "10%";
        break;
      case "center":
      default:
        styles.top = "50%";
        styles.left = "50%";
        styles.transform += " translate(-50%, -50%)";
        break;
    }

    return styles;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl min-h-[85vh]">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">Add Watermark</h1>
        <p className="text-foreground/60 max-w-2xl mx-auto font-bold">
          Protect your documents with custom text or image watermarks. Real-time preview and full control over position and opacity.
        </p>
      </div>

      {step === "upload" && (
        <div className="max-w-4xl mx-auto">
          <UploadBox
            endpoint="/api/pdf/load"
            responseType="json"
            accept=".pdf"
            buttonLabel="Select PDF to Watermark"
            loadingLabel="Preparing preview..."
            onFileSelect={(files) => setOriginalFile(files[0])}
            onSuccess={(data) => {
              setPdfData(data);
              setStep("customize");
              if (data.pageCount) {
                setConfig(prev => ({ ...prev, pageRange: [1, data.pageCount] }));
              }
            }}
          />
        </div>
      )}

      {step === "customize" && pdfData && (
        <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Left: Preview Panel */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black">Preview (Page 1)</h2>
                <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                  Live View
                </div>
              </div>
              
              <div className="relative aspect-[1/1.414] bg-white shadow-2xl rounded-3xl overflow-hidden border border-divider group">
                <img 
                  src={pdfData.pages[0]} 
                  alt="Page 1 Preview" 
                  className="w-full h-full object-contain pointer-events-none"
                />
                
                {/* Watermark Overlay */}
                <div style={getPreviewStyles()} className="flex items-center justify-center">
                  {activeTab === "text" ? (
                    <div 
                      style={{ 
                        fontSize: `${config.fontSize / 3}px`, // Scale for preview
                        color: config.color,
                        fontWeight: "bold",
                        fontFamily: "sans-serif"
                      }}
                    >
                      {config.text || "CONFIDENTIAL"}
                    </div>
                  ) : config.imageBase64 ? (
                    <img 
                      src={config.imageBase64} 
                      alt="Watermark logo" 
                      style={{ width: "150px", height: "auto" }} // Scale for preview
                    />
                  ) : (
                    <div className="text-foreground/20 font-black italic">Upload Logo</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Settings Panel */}
          <div className="w-full lg:w-[450px] order-1 lg:order-2">
            <div className="bg-card border border-divider rounded-[2.5rem] p-8 md:p-10 shadow-xl">
              <div className="flex p-1.5 bg-muted rounded-2xl mb-10">
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all",
                    activeTab === "text" ? "bg-background shadow-lg text-primary" : "text-foreground/40 hover:text-foreground"
                  )}
                >
                  Text
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all",
                    activeTab === "image" ? "bg-background shadow-lg text-primary" : "text-foreground/40 hover:text-foreground"
                  )}
                >
                  Image
                </button>
              </div>

              <div className="space-y-8">
                {activeTab === "text" ? (
                  <>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Watermark Text</label>
                      <input 
                        type="text"
                        value={config.text}
                        onChange={(e) => setConfig({ ...config, text: e.target.value })}
                        className="w-full bg-muted border-2 border-divider focus:border-primary/20 px-6 py-4 rounded-2xl outline-none font-bold text-lg"
                        placeholder="e.g. CONFIDENTIAL"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Font Size</label>
                        <input 
                          type="number"
                          value={config.fontSize}
                          onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) || 20 })}
                          className="w-full bg-muted border-2 border-divider px-6 py-4 rounded-2xl outline-none font-bold"
                          min="20" max="150"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color"
                            value={config.color}
                            onChange={(e) => setConfig({ ...config, color: e.target.value })}
                            className="w-16 h-[58px] rounded-2xl border-2 border-divider cursor-pointer bg-muted p-1"
                          />
                          <input 
                            type="text"
                            value={config.color}
                            onChange={(e) => setConfig({ ...config, color: e.target.value })}
                            className="flex-1 bg-muted border-2 border-divider px-4 py-4 rounded-2xl outline-none font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Logo Image (PNG)</label>
                    <div className="relative h-40 bg-muted border-2 border-dashed border-divider rounded-3xl flex flex-col items-center justify-center gap-3 group cursor-pointer overflow-hidden">
                      {config.imageBase64 ? (
                        <>
                          <img src={config.imageBase64} className="h-24 w-auto object-contain" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfig({ ...config, imageBase64: null }); }}
                            className="bg-red-500 text-white p-2 rounded-full absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          <span className="text-xs font-black uppercase tracking-widest text-foreground/40">Select Image</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/png" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Opacity</label>
                    <span className="text-xs font-black text-primary">{Math.round(config.opacity * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.1" max="1" step="0.05"
                    value={config.opacity}
                    onChange={(e) => setConfig({ ...config, opacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Rotation</label>
                    <span className="text-xs font-black text-primary">{config.rotation}°</span>
                  </div>
                  <input 
                    type="range"
                    min="0" max="360" step="5"
                    value={config.rotation}
                    onChange={(e) => setConfig({ ...config, rotation: parseInt(e.target.value) })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Position</label>
                  <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full aspect-square max-w-[180px] mx-auto p-2 bg-muted rounded-3xl border-2 border-divider">
                    {(["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const).map((pos) => {
                      const isActive = config.position === pos;
                      const gridPos = {
                        "top-left": "col-start-1 row-start-1",
                        "top-right": "col-start-3 row-start-1",
                        "bottom-left": "col-start-1 row-start-3",
                        "bottom-right": "col-start-3 row-start-3",
                        "center": "col-start-2 row-start-2",
                      }[pos];

                      return (
                        <button
                          key={pos}
                          onClick={() => setConfig({ ...config, position: pos })}
                          className={cn(
                            "rounded-xl transition-all border-2",
                            gridPos,
                            isActive ? "bg-primary border-primary shadow-lg scale-110" : "bg-card border-divider hover:border-primary/30"
                          )}
                          title={pos.replace("-", " ")}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-divider">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Apply To</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["all", "first", "range"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setConfig({ ...config, applyTo: type as any })}
                        className={cn(
                          "py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter border-2 transition-all",
                          config.applyTo === type ? "bg-primary text-white border-primary shadow-lg" : "bg-muted text-foreground/60 border-transparent hover:border-divider"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  
                  {config.applyTo === "range" && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input 
                        type="number"
                        min="1" max={pdfData.pageCount}
                        value={config.pageRange[0]}
                        onChange={(e) => setConfig({ ...config, pageRange: [parseInt(e.target.value) || 1, config.pageRange[1]] })}
                        className="w-full bg-muted border-2 border-divider px-4 py-3 rounded-xl outline-none font-bold text-center"
                      />
                      <span className="font-black text-foreground/20">to</span>
                      <input 
                        type="number"
                        min={config.pageRange[0]} max={pdfData.pageCount}
                        value={config.pageRange[1]}
                        onChange={(e) => setConfig({ ...config, pageRange: [config.pageRange[0], parseInt(e.target.value) || 1] })}
                        className="w-full bg-muted border-2 border-divider px-4 py-3 rounded-xl outline-none font-bold text-center"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleApplyWatermark}
                  disabled={isApplying || (activeTab === "image" && !config.imageBase64)}
                  className={cn(
                    "w-full py-6 rounded-[2rem] font-black text-xl tracking-tight transition-all flex items-center justify-center gap-4 mt-4 shadow-2xl",
                    isApplying ? "bg-primary/50 cursor-not-allowed" : "bg-primary text-white hover:scale-[1.02] active:scale-95 shadow-primary/30"
                  )}
                >
                  {isApplying ? (
                    <>
                      <div className="animate-spin h-6 w-6 border-4 border-white/20 border-t-white rounded-full"></div>
                      Applying...
                    </>
                  ) : (
                    <>
                      Apply Watermark
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "download" && convertedBlobUrl && (
        <div className="fixed inset-0 bg-background z-[200] flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden">
          {/* Left: Preview Panel */}
          <div className="flex-1 bg-muted flex flex-col items-center justify-center p-4 md:p-8 relative">
            <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-3xl overflow-hidden border border-divider relative">
               <object 
                 data={`${convertedBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                 type="application/pdf"
                 className="w-full h-full"
               >
                 <div className="h-full flex items-center justify-center font-bold">PDF Preview not supported</div>
               </object>
            </div>
          </div>

          {/* Right: Actions Panel */}
          <div className="w-full md:w-[450px] bg-background border-l border-divider p-8 md:p-12 flex flex-col justify-between shrink-0 overflow-y-auto font-sans">
             <div>
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter leading-none">All Done!</h2>
                <p className="text-foreground/40 font-bold uppercase tracking-[0.2em] text-[10px] mb-12">Your file is ready for download</p>

                <div className="space-y-8">
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3 ml-1">File Name</label>
                    <div className="relative">
                       <input 
                          type="text"
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          className="w-full bg-muted border-2 border-divider focus:border-primary/20 px-6 py-5 rounded-3xl outline-none font-black text-xl pr-20"
                       />
                       <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-lg uppercase">.pdf</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="space-y-4">
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
                  className="w-full py-4 rounded-2xl font-bold text-foreground/40 hover:text-foreground group flex items-center justify-center gap-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="M18 17V7"/></svg>
                  Start Over
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
