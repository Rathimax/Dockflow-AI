"use client";

import { useState, useCallback } from "react";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { 
  Upload, 
  Plus, 
  X, 
  GripHorizontal, 
  FileText, 
  Settings as SettingsIcon, 
  Download, 
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import Link from "next/link";

// --- Types ---
type Stage = "upload" | "arrange" | "settings" | "convert";

type PageSize = "a4" | "letter" | "match";
type Orientation = "portrait" | "landscape" | "auto";
type Margin = "none" | "small" | "medium" | "large";
type ImageFit = "fit" | "fill" | "original";

interface ConversionSettings {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
  imageFit: ImageFit;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

// --- Prop Types for Sub-components ---
interface UploadStageProps {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface ArrangeStageProps {
  images: ImageFile[];
  onDragEnd: (result: DropResult) => void;
  removeImage: (id: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStage: (stage: Stage) => void;
}

interface SettingsStageProps {
  settings: ConversionSettings;
  setSettings: React.Dispatch<React.SetStateAction<ConversionSettings>>;
  isConverting: boolean;
  handleConvert: () => void;
  setStage: (stage: Stage) => void;
  images: ImageFile[];
}

interface ConvertStageProps {
  images: ImageFile[];
  convertedUrl: string | null;
  customFileName: string;
  setCustomFileName: (name: string) => void;
  reset: () => void;
}

// --- Sub-components (Moved outside to fix focus issues) ---

const UploadStage = ({ handleFileUpload }: UploadStageProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const mockEvent = {
        target: { files: e.dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(mockEvent);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        className={cn(
          "group relative flex flex-col items-center justify-center w-full min-h-[300px] md:min-h-[450px] p-6 md:p-12 border-2 border-dashed rounded-[2rem] md:rounded-[4rem] transition-all duration-700 overflow-hidden",
          isDragging 
            ? "border-primary bg-primary/5 scale-[0.99] shadow-inner" 
            : "border-divider bg-card shadow-2xl shadow-black/5 hover:border-primary/20 hover:shadow-primary/5"
        )}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 transition-opacity duration-700",
          isDragging ? "opacity-100" : "opacity-0"
        )}></div>

        <div 
          onClick={() => document.getElementById("file-upload")?.click()}
          className="relative z-10 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-2xl md:rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/30 mb-5 md:mb-8 transition-all hover:scale-110 active:scale-95 cursor-pointer group-hover:rotate-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-10 md:h-10"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>
        
        <div className="relative z-10 text-center max-w-sm mb-8 md:mb-12 px-4 cursor-pointer" onClick={() => document.getElementById("file-upload")?.click()}>
          <h3 className="text-xl md:text-3xl font-black mb-2 md:mb-4 tracking-tight text-foreground">
            {isDragging ? "Drop to upload" : "Select or drag files"}
          </h3>
          <p className="text-foreground/40 font-bold text-xs md:text-lg mb-8 md:mb-12 max-w-md mx-auto leading-relaxed">
            Support for JPG, PNG, WEBP. <br className="hidden md:block" />
            Select up to 30 images.
          </p>
        </div>
        
        <label className="relative z-10 cursor-pointer w-full px-8 md:px-0 md:w-auto">
          <span className="flex items-center justify-center px-8 md:px-12 py-3.5 md:py-5 bg-foreground text-background rounded-xl md:rounded-2xl font-black text-sm md:text-lg shadow-xl shadow-black/20 hover:opacity-90 transition-all active:scale-95">
            Browse Files
          </span>
          <input 
            id="file-upload"
            type="file" 
            multiple 
            accept="image/jpeg,image/png,image/webp" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </label>
        
        <div className="mt-8 md:mt-10 flex items-center gap-3 py-2 px-5 md:px-6 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-full shadow-sm relative z-10">
           <span className="h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <p className="text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
              Accepted: JPG, PNG, WEBP
           </p>
        </div>
      </div>
    </div>
  );
};

const ArrangeStage = ({ images, onDragEnd, removeImage, handleFileUpload, setStage }: ArrangeStageProps) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card border border-divider p-6 rounded-3xl">
      <div>
         <h3 className="text-xl font-black mb-1 tracking-tight">Page Order</h3>
         <p className="text-foreground/40 font-bold text-sm">Drag images to reorder them. This will be the order in your PDF.</p>
      </div>
      <div className="flex gap-4">
         <button 
           onClick={() => document.getElementById("file-upload-more")?.click()}
           className="px-6 py-3 bg-muted border border-divider hover:border-primary/20 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
         >
           <Plus size={16} /> Add More
         </button>
         <input 
           id="file-upload-more"
           type="file" 
           multiple 
           accept="image/jpeg,image/png,image/webp" 
           className="hidden" 
           onChange={handleFileUpload} 
         />
         <button 
           onClick={() => setStage("settings")}
           className="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/10 transition-all hover:scale-105"
         >
           Next Step <ChevronRight size={16} />
         </button>
      </div>
    </div>

    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="images" direction="horizontal">
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
          >
            {images.map((img, index) => (
              <Draggable key={img.id} draggableId={img.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="group relative bg-card border border-divider rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all"
                  >
                    {/* Drag Handle Overlay */}
                    <div {...provided.dragHandleProps} className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 bg-black/5 flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity">
                       <GripHorizontal className="text-white drop-shadow-lg" size={32} />
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                      <img src={img.preview} alt={img.file.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    </div>

                    {/* Badge / Footer */}
                    <div className="p-3 md:p-4 border-t border-divider bg-card/80 backdrop-blur-md relative z-20">
                       <div className="flex items-center justify-between gap-2">
                           <div className="h-6 w-6 bg-primary text-white rounded-full flex items-center justify-center font-black text-[10px]">
                             {index + 1}
                           </div>
                           <p className="flex-1 truncate text-[10px] font-black text-foreground/40 uppercase tracking-tight">{img.file.name}</p>
                           <button 
                             onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                             className="p-1.5 text-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                           >
                             <X size={14} />
                           </button>
                       </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  </div>
);

const SettingsStage = ({ settings, setSettings, isConverting, handleConvert, setStage, images }: SettingsStageProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
    {/* Settings Panel */}
    <div className="bg-card border border-divider rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-black/5">
       <div className="mb-10 flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <SettingsIcon size={24} />
          </div>
          <div>
              <h3 className="text-2xl font-black tracking-tight leading-none mb-1">Export Settings</h3>
              <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-widest">Customize your output document</p>
          </div>
       </div>

       <div className="space-y-10">
          {/* Page Size */}
          <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4 ml-1">Page Size</label>
              <div className="grid grid-cols-3 gap-3">
                 {["a4", "letter", "match"].map((size) => (
                     <button
                       key={size}
                       onClick={() => setSettings(prev => ({ ...prev, pageSize: size as PageSize }))}
                       className={cn(
                           "py-4 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest border transition-all",
                           settings.pageSize === size ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-muted border-divider hover:border-primary/20"
                       )}
                     >
                       {size}
                     </button>
                 ))}
              </div>
          </div>

          {/* Orientation */}
          <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4 ml-1">Orientation</label>
              <div className="grid grid-cols-3 gap-3">
                 {["portrait", "landscape", "auto"].map((opt) => (
                     <button
                       key={opt}
                       onClick={() => setSettings(prev => ({ ...prev, orientation: opt as Orientation }))}
                       className={cn(
                           "py-4 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest border transition-all",
                           settings.orientation === opt ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-muted border-divider hover:border-primary/20"
                       )}
                     >
                       {opt}
                     </button>
                 ))}
              </div>
          </div>

          {/* Image Fit */}
          <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4 ml-1">Image Fit</label>
              <div className="grid grid-cols-3 gap-3">
                 {["fit", "fill", "original"].map((fit) => (
                     <button
                       key={fit}
                       onClick={() => setSettings(prev => ({ ...prev, imageFit: fit as ImageFit }))}
                       className={cn(
                           "py-4 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest border transition-all",
                           settings.imageFit === fit ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-muted border-divider hover:border-primary/20"
                       )}
                     >
                       {fit}
                     </button>
                 ))}
              </div>
          </div>

          {/* Margin */}
          <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4 ml-1">Margins</label>
              <div className="grid grid-cols-4 gap-3">
                 {["none", "small", "medium", "large"].map((m) => (
                     <button
                       key={m}
                       onClick={() => setSettings(prev => ({ ...prev, margin: m as Margin }))}
                       className={cn(
                           "py-3 rounded-lg md:rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all",
                           settings.margin === m ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-muted border-divider hover:border-primary/20"
                       )}
                     >
                       {m}
                     </button>
                 ))}
              </div>
          </div>
       </div>

       <div className="mt-12 flex flex-col md:flex-row gap-4">
          <button 
              onClick={() => setStage("arrange")}
              className="flex-1 py-5 bg-muted border border-divider hover:bg-card rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
          >
              Back to Arrange
          </button>
          <button 
              onClick={handleConvert}
              disabled={isConverting}
              className="flex-[2] py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
              {isConverting ? "Processing..." : "Create PDF"}
              {!isConverting && <ChevronRight size={18} />}
          </button>
       </div>
    </div>

    {/* Live Preview (Conceptual) */}
    <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-muted/30 border border-divider border-dashed rounded-[3rem] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10"></div>
        
        <div className={cn(
            "bg-white dark:bg-slate-900 shadow-2xl transition-all duration-500 flex items-center justify-center overflow-hidden border border-divider",
            settings.pageSize === "a4" ? (settings.orientation === "landscape" ? "w-[420px] h-[297px]" : "w-[297px] h-[420px]") :
            settings.pageSize === "letter" ? (settings.orientation === "landscape" ? "w-[400px] h-[310px]" : "w-[310px] h-[400px]") : "w-64 h-64 rounded-full"
        )}>
             <div className="text-center p-8">
                 <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4 animate-bounce">
                   <FileText size={32} />
                 </div>
                 <p className="font-black text-foreground uppercase text-[10px] tracking-widest">Generating {images.length} Pages</p>
             </div>
        </div>
        <div className="mt-12 text-center">
            <p className="font-black text-foreground/40 uppercase text-[10px] tracking-[0.3em] mb-2">Live Canvas</p>
            <div className="h-1 w-8 bg-primary mx-auto rounded-full"></div>
        </div>
    </div>
  </div>
);

const ConvertStage = ({ images, convertedUrl, customFileName, setCustomFileName, reset }: ConvertStageProps) => (
  <div className="max-w-2xl mx-auto text-center py-8 md:py-12 animate-in zoom-in-95 duration-700">
      <div className="h-20 w-20 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
          <Download size={32} />
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter leading-none">Your PDF is <span className="text-emerald-500">Ready!</span></h2>
      <p className="text-foreground/40 font-bold text-lg mb-10">
          Successfully combined {images.length} photos into a single document.
      </p>
      
      <div className="bg-card border border-divider rounded-[2rem] p-8 mb-8 text-left shadow-xl shadow-black/5">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 mb-4 ml-1">Rename File</label>
          <div className="relative group">
              <input 
                type="text" 
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full bg-muted border-2 border-divider focus:border-primary/20 focus:bg-background px-6 py-5 rounded-2xl outline-none transition-all font-black text-xl pr-20"
                placeholder="filename"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-lg uppercase">
                  .pdf
              </div>
          </div>
          <p className="mt-4 text-[10px] font-bold text-foreground/30 uppercase tracking-widest ml-1">
              Enter your preferred name for the document
          </p>
      </div>
      
      <div className="flex flex-col gap-4">
          <a 
            href={convertedUrl || "#"} 
            download={`${customFileName || "converted_photos"}.pdf`}
            className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-2xl tracking-tight shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4 group"
          >
              Download PDF
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"><path d="M7 7l10 10"/><path d="M17 7V17H7"/></svg>
          </a>
          
          <button 
              onClick={reset}
              className="py-4 text-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em] hover:text-primary transition-colors"
          >
              Convert more photos
          </button>
      </div>
  </div>
);

export default function PhotosToPdfPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    pageSize: "a4",
    orientation: "portrait",
    margin: "none",
    imageFit: "fit",
  });
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("converted_photos");

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newImages: ImageFile[] = newFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages(prev => [...prev, ...newImages].slice(0, 30));
      if (stage === "upload") setStage("arrange");
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length === 0) setStage("upload");
      return filtered;
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setImages(items);
  };

  const handleConvert = async () => {
    setIsConverting(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    images.forEach(img => formData.append("images", img.file));
    
    // Original indexes for backend to reorder
    const pageOrder = images.map((_, index) => index);
    formData.append("pageOrder", JSON.stringify(pageOrder));
    formData.append("settings", JSON.stringify(settings));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

    try {
      const response = await axios.post(`${apiUrl}/api/convert/photos-to-pdf`, formData, {
        responseType: "blob",
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setConvertedUrl(url);
      setStage("convert");
    } catch (err: any) {
      console.error("Conversion failed:", err);
      setError("Failed to create PDF. Please try again.");
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setStage("upload");
    setConvertedUrl(null);
    setError(null);
    setCustomFileName("converted_photos");
  };

  return (
    <div className="min-h-screen pt-8 pb-20 px-4">
      <main className="max-w-6xl mx-auto">
        {/* Hero Header matching other tools */}
        <div className="text-center mt-8 md:mt-16 mb-12 md:mb-20">
          <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter text-foreground">Photos to PDF</h1>
          <p className="text-foreground/40 font-bold text-base md:text-xl max-w-2xl mx-auto uppercase tracking-widest px-4">
             Convert images to PDF documents. Preserve layout, sequence, and quality. No limits, completely free.
          </p>
        </div>

        {/* Dynamic Stage Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {stage === "upload" && <UploadStage handleFileUpload={handleFileUpload} />}
            {stage === "arrange" && (
                <ArrangeStage 
                    images={images} 
                    onDragEnd={onDragEnd} 
                    removeImage={removeImage} 
                    handleFileUpload={handleFileUpload} 
                    setStage={setStage} 
                />
            )}
            {stage === "settings" && (
                <SettingsStage 
                    settings={settings} 
                    setSettings={setSettings} 
                    isConverting={isConverting} 
                    handleConvert={handleConvert} 
                    setStage={setStage} 
                    images={images} 
                />
            )}
            {stage === "convert" && (
                <ConvertStage 
                    images={images} 
                    convertedUrl={convertedUrl} 
                    customFileName={customFileName} 
                    setCustomFileName={setCustomFileName} 
                    reset={reset} 
                />
            )}
            
            {error && (
                <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-3xl font-bold text-center">
                    {error}
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
