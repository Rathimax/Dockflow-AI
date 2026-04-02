"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import UploadBox from "@/components/UploadBox";
import axios from "axios";
import { cn } from "@/lib/utils";

// --- Types ---
type Tool = "select" | "text" | "highlight" | "draw" | "shape" | "image" | "erase" | "signature";
type ShapeType = "rect" | "circle";

interface Point {
  x: number;
  y: number;
}

interface Element {
  id: string;
  type: "text" | "highlight" | "draw" | "shape" | "image" | "signature";
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  opacity?: number;
  paths?: Point[][];
  shape?: ShapeType;
  borderColor?: string;
  fillColor?: string;
  borderWidth?: number;
  base64Data?: string;
  strokeWidth?: number;
  isOriginal?: boolean; // true if extracted from the original PDF
  originalContent?: string; // original text before user edits
  hScale?: number; // horizontal scale factor
  ascent?: number; // baseline ascent factor
}

interface PageDimension {
  width: number;
  height: number;
}

interface PageEdit {
  pageIndex: number;
  rotation: number;
  elements: Element[];
}

interface EditorState {
  pages: PageEdit[];
  pageOrder: number[];
}

// --- Main Page Component ---
export default function EditPDFPage() {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [pagesImages, setPagesImages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [editorState, setEditorState] = useState<EditorState>({ pages: [], pageOrder: [] });
  const [history, setHistory] = useState<EditorState[]>([]);
  const [undoPointer, setUndoPointer] = useState(-1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState("");

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Tool settings
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [shapeBorderColor, setShapeBorderColor] = useState("#000000");
  const [shapeFillColor, setShapeFillColor] = useState("transparent");
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawWidth, setDrawWidth] = useState(3);
  const [highlightColor, setHighlightColor] = useState("#FFFF00");

  // --- Helpers ---
  const saveToHistory = useCallback((newState: EditorState) => {
    const newHistory = history.slice(0, undoPointer + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setUndoPointer(newHistory.length - 1);
  }, [history, undoPointer]);

  const updateState = (updater: (prev: EditorState) => EditorState) => {
    setEditorState(prev => {
      const newState = updater(prev);
      saveToHistory(newState);
      return newState;
    });
  };

  const handleUploadSuccess = (data: any) => {
    if (data.pages) {
      setPagesImages(data.pages);
      const textItems: any[][] = data.textItems || data.pages.map(() => []);
      
      if (data.pageDimensions) setPageDimensions(data.pageDimensions);
      
      const initialPages = data.pages.map((_: any, i: number) => {
        // Convert extracted text items into editable Element objects
        const elements: Element[] = (textItems[i] || []).map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          type: "text" as const,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          content: item.str,
          originalContent: item.str,
          fontSize: item.fontSize || 12,
          fontFamily: item.fontFamily || "Arial",
          fontWeight: item.fontWeight || "normal",
          fontStyle: item.fontStyle || "normal",
          color: "#000000",
          isOriginal: true,
          hScale: item.hScale,
        }));

        return {
          pageIndex: i,
          rotation: 0,
          elements,
        };
      });

      const initialState = { pages: initialPages, pageOrder: Array.from({ length: data.pages.length }, (_, i) => i) };
      setEditorState(initialState);
      setHistory([initialState]);
      setUndoPointer(0);
      setStage(2);
    }
  };

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  // --- Interaction Handlers ---
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only process clicks that originated directly on the canvas (not bubbled from elements)
    if (e.target !== e.currentTarget && activeTool === "select") {
      return; // Click was on a child element, don't interfere
    }

    if (activeTool === "select") {
      // Clicked empty canvas space -> deselect
      setSelectedElementId(null);
      return;
    }

    if (activeTool === "text") {
      const coords = getRelativeCoords(e);
      const newEl: Element = {
        id: crypto.randomUUID(),
        type: "text",
        x: coords.x,
        y: coords.y,
        width: 20,
        height: 5,
        content: "",
        fontSize,
        fontFamily,
        color: textColor
      };
      updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
      }));
      setSelectedElementId(newEl.id);
      setActiveTool("select");
    } else if (activeTool === "shape") {
        const coords = getRelativeCoords(e);
        const newEl: Element = {
          id: crypto.randomUUID(),
          type: "shape",
          shape: "rect",
          x: coords.x,
          y: coords.y,
          width: 15,
          height: 10,
          borderColor: shapeBorderColor,
          fillColor: shapeFillColor,
          borderWidth: 2
        };
        updateState(prev => ({
          ...prev,
          pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
        }));
        setSelectedElementId(newEl.id);
        setActiveTool("select");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "draw" || activeTool === "highlight") {
      setIsDrawing(true);
      const coords = getRelativeCoords(e);
      setCurrentPath([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getRelativeCoords(e);
    setCurrentPath(prev => [...prev, coords]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === "highlight" && currentPath.length > 1) {
      const minX = Math.min(...currentPath.map(p => p.x));
      const minY = Math.min(...currentPath.map(p => p.y));
      const maxX = Math.max(...currentPath.map(p => p.x));
      const maxY = Math.max(...currentPath.map(p => p.y));
      const newEl: Element = {
        id: crypto.randomUUID(),
        type: "highlight",
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        color: highlightColor,
        opacity: 0.4
      };
      updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
      }));
    } else if (activeTool === "draw" && currentPath.length > 1) {
      const newEl: Element = {
        id: crypto.randomUUID(),
        type: "draw",
        x: 0, y: 0, width: 100, height: 100, // drawing paths are global per page
        paths: [currentPath],
        color: drawColor,
        strokeWidth: drawWidth
      };
      updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
      }));
    }
    setCurrentPath([]);
  };

  const deleteElement = (id: string) => {
    updateState(prev => ({
      ...prev,
      pages: prev.pages.map((p, i) => i === currentPageIndex ? { 
        ...p, 
        elements: p.elements.filter(el => el.id !== id) 
      } : p)
    }));
    setSelectedElementId(null);
  };
  
  const bringToFront = (id: string) => {
    updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === currentPageIndex ? {
            ...p,
            elements: [...p.elements.filter(el => el.id !== id), ...p.elements.filter(el => el.id === id)]
        } : p)
    }));
  };

  const sendToBack = (id: string) => {
    updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === currentPageIndex ? {
            ...p,
            elements: [...p.elements.filter(el => el.id === id), ...p.elements.filter(el => el.id !== id)]
        } : p)
    }));
  };

  const movePage = (from: number, to: number) => {
    updateState(prev => {
        const newOrder = [...prev.pageOrder];
        const [removed] = newOrder.splice(from, 1);
        newOrder.splice(to, 0, removed);
        return { ...prev, pageOrder: newOrder };
    });
  };

  const deletePage = (idx: number) => {
    if (editorState.pageOrder.length <= 1) return;
    updateState(prev => ({
        ...prev,
        pageOrder: prev.pageOrder.filter((_, i) => i !== idx)
    }));
    if (currentPageIndex >= editorState.pageOrder.length - 1) {
        setCurrentPageIndex(Math.max(0, editorState.pageOrder.length - 2));
    }
  };

  const rotatePage = (idx: number, dir: 'left' | 'right') => {
    const actualIdx = editorState.pageOrder[idx];
    updateState(prev => ({
        ...prev,
        pages: prev.pages.map((p, i) => i === actualIdx ? { ...p, rotation: (p.rotation + (dir === 'left' ? -90 : 90)) % 360 } : p)
    }));
  };

  const duplicatePage = (idx: number) => {
    const actualIdx = editorState.pageOrder[idx];
    updateState(prev => {
        const newPages = [...prev.pages];
        const newPageIndex = newPages.length;
        newPages.push({
            ...prev.pages[actualIdx],
            elements: prev.pages[actualIdx].elements.map(el => ({ ...el, id: crypto.randomUUID() }))
        });
        const newOrder = [...prev.pageOrder];
        newOrder.splice(idx + 1, 0, newPageIndex);
        return { pages: newPages, pageOrder: newOrder };
    });
  };

  const handleSave = async () => {
    if (!originalFile) return;
    setIsSaving(true);
    const formData = new FormData();
    formData.append("file", originalFile);
    formData.append("edits", JSON.stringify(editorState));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    try {
      const response = await axios.post(`${apiUrl}/api/pdf/save`, formData, { responseType: 'blob' });
      // CRITICAL: Specify the mime type so browsers recognize it as a PDF
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Revoke old URL if it exists
      if (savedPdfUrl) window.URL.revokeObjectURL(savedPdfUrl);
      
      setSavedPdfUrl(url);
      
      // Default filename: original name + _edited
      const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
      setCustomFileName(`${baseName}_edited`);
      
      setStage(3);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save PDF. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFinal = () => {
    if (!savedPdfUrl) return;
    const link = document.createElement("a");
    link.href = savedPdfUrl;
    link.setAttribute("download", `${customFileName || 'edited_document'}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleUndo = () => {
    if (undoPointer > 0) {
      setUndoPointer(undoPointer - 1);
      setEditorState(history[undoPointer - 1]);
    }
  };

  const handleRedo = () => {
    if (undoPointer < history.length - 1) {
      setUndoPointer(undoPointer + 1);
      setEditorState(history[undoPointer + 1]);
    }
  };

  // --- Sub-components ---

  const ElementOverlay = ({ el }: { el: Element }) => {
    const isSelected = selectedElementId === el.id;
    const [isDraggingEl, setIsDraggingEl] = useState(false);
    const [isResizingEl, setIsResizingEl] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
    const [localContent, setLocalContent] = useState(el.content || "");
    const textRef = useRef<HTMLTextAreaElement>(null);

    // Sync local content
    useEffect(() => {
        if (el.type === 'text' && document.activeElement !== textRef.current) {
            setLocalContent(el.content || "");
        }
    }, [el.content]);

    // Auto focus when created
    useEffect(() => {
        if (isSelected && el.type === 'text' && textRef.current) {
            textRef.current.focus();
        }
    }, [isSelected, el.type]);

    const onMouseDownDrag = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElementId(el.id);
      setIsDraggingEl(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const onMouseDownResize = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedElementId(el.id);
        setIsResizingEl(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    useEffect(() => {
        if (!isDraggingEl && !isResizingEl) return;
        const onMouseMove = (e: MouseEvent) => {
            const dx = ((e.clientX - dragStart.x) / (canvasRef.current?.offsetWidth || 1)) * 100;
            const dy = ((e.clientY - dragStart.y) / (canvasRef.current?.offsetHeight || 1)) * 100;
            
            setEditorState(prev => ({
                ...prev,
                pages: prev.pages.map((p, i) => i === currentPageIndex ? {
                    ...p,
                    elements: p.elements.map(eItem => {
                        if (eItem.id !== el.id) return eItem;
                        if (isDraggingEl) {
                            return { ...eItem, x: Math.max(0, Math.min(100 - eItem.width, eItem.x + dx)), y: Math.max(0, Math.min(100 - eItem.height, eItem.y + dy)) };
                        } else if (isResizingEl) {
                            return { ...eItem, width: Math.max(2, eItem.width + dx), height: Math.max(2, eItem.height + dy) };
                        }
                        return eItem;
                    })
                } : p)
            }));
            setDragStart({ x: e.clientX, y: e.clientY });
        };
        const onMouseUp = () => {
            setIsDraggingEl(false);
            setIsResizingEl(false);
            saveToHistory(editorState);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDraggingEl, isResizingEl, dragStart, el.id]);

    const updateElement = (changes: Partial<Element>) => {
        updateState(prev => ({
            ...prev,
            pages: prev.pages.map((p, i) => i === currentPageIndex ? {
                ...p,
                elements: p.elements.map(eItem => eItem.id === el.id ? { ...eItem, ...changes } : eItem)
            } : p)
        }));
    };

    const isTextElement = el.type === 'text';
    const showBorder = isSelected || activeTool === "erase" || (activeTool === "select" && isTextElement);

    const commonStyles: React.CSSProperties = {
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
      height: `${el.height}%`,
      borderColor: isSelected ? '#3b82f6' : (showBorder ? 'var(--divider)' : 'transparent'),
      borderWidth: '2px',
      borderStyle: isSelected ? 'solid' : (showBorder ? 'dashed' : 'none'),
      cursor: activeTool === "erase" ? 'not-allowed' : (activeTool === "select" ? 'pointer' : 'default'),
      pointerEvents: (activeTool === "select" || activeTool === "erase") ? 'auto' : 'none',
    };

    const floatingToolbar = isSelected && (
        <div 
            className="absolute -top-12 left-0 flex items-center bg-background border border-divider rounded-2xl shadow-2xl p-1.5 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 pointer-events-auto"
            onMouseDown={e => e.stopPropagation()} // StopToolbar clicks from deselecting
        >
            {/* Move Handle (⠿) */}
            <div 
                onMouseDown={onMouseDownDrag}
                className="p-1 px-1.5 hover:bg-muted rounded-lg cursor-move text-foreground/40 group/handle"
                title="Drag to move"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/handle:text-primary"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>

            <div className="w-px h-4 bg-divider mx-0.5" />

            {el.type === 'text' && (
                <>
                    <button onClick={() => updateElement({ fontSize: (el.fontSize || 24) - 2 })} className="p-1 px-2 hover:bg-muted rounded-lg text-[10px] font-black">-</button>
                    <span className="text-[10px] font-black w-6 text-center">{el.fontSize}</span>
                    <button onClick={() => updateElement({ fontSize: (el.fontSize || 24) + 2 })} className="p-1 px-2 hover:bg-muted rounded-lg text-[10px] font-black">+</button>
                    <div className="w-px h-4 bg-divider mx-0.5" />
                    {[ '#000000', '#EF4444', '#3B82F6' ].map(c => (
                        <button key={c} onClick={() => updateElement({ color: c })} className={cn("w-3.5 h-3.5 rounded-full border border-divider", el.color === c && "ring-2 ring-primary ring-offset-1")} style={{ backgroundColor: c }} />
                    ))}
                    <div className="w-px h-4 bg-divider mx-0.5" />
                    <button 
                        onClick={() => {
                            const current = (el.fontFamily || '').toLowerCase();
                            const next = current.includes('arial') || current.includes('helvetica') ? 'Courier New, Courier, monospace' : 
                                         current.includes('courier') ? 'Times New Roman, Times, serif' : 
                                         'Helvetica, Arial, sans-serif';
                            updateElement({ fontFamily: next });
                        }} 
                        className="p-1 px-2 hover:bg-muted rounded-lg text-[9px] font-black uppercase tracking-wider truncate max-w-[80px]"
                    >
                        {(el.fontFamily || 'Arial').split(',')[0].replace(/['"]/g, '')}
                    </button>
                    <button 
                        onClick={() => updateElement({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })} 
                        className={cn("p-1 px-2 hover:bg-muted rounded-lg text-[10px] font-bold font-serif", el.fontWeight === 'bold' && "bg-muted")}
                    >B</button>
                    <button 
                        onClick={() => updateElement({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })} 
                        className={cn("p-1 px-2 hover:bg-muted rounded-lg text-[10px] italic font-serif", el.fontStyle === 'italic' && "bg-muted")}
                    >I</button>
                </>
            )}

            <div className="w-px h-4 bg-divider mx-0.5" />

            {/* Layering */}
            <button onClick={() => bringToFront(el.id)} className="p-1 px-1.5 hover:bg-muted rounded-lg" title="Bring to Front">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 5 5 5-5"/><path d="m11 7 5 5-5 5"/><path d="m11 17 5 5-5-5"/><circle cx="12" cy="12" r="10"/></svg>
            </button>
            <button onClick={() => sendToBack(el.id)} className="p-1 px-1.5 hover:bg-muted rounded-lg" title="Send to Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 7-5-5-5 5"/><path d="m13 17-5-5 5-5"/><path d="m13 7-5-5-5 5"/><circle cx="12" cy="12" r="10"/></svg>
            </button>

            <div className="w-px h-4 bg-divider mx-0.5" />

            <button onClick={() => deleteElement(el.id)} className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>
    );

    if (el.type === "text") {
      const isOriginalText = el.isOriginal === true;
      const wasEdited = isOriginalText && localContent !== el.originalContent;
      
      return (
        <div 
            className={cn(
                "absolute z-20 group",
                // When selected: solid white background to hide the image text behind
                isSelected && "ring-2 ring-blue-400/60 bg-background",
                // User-added text (not original): always show blue hint
                !isSelected && activeTool === "select" && !isOriginalText && "bg-blue-50/30 hover:bg-blue-50/50 hover:ring-1 hover:ring-blue-300/40",
                // Original text: invisible normally, subtle highlight on hover 
                !isSelected && activeTool === "select" && isOriginalText && !wasEdited && "hover:bg-yellow-50/40 hover:ring-1 hover:ring-yellow-300/30",
                // Edited original text: white background to cover original, thin border
                wasEdited && !isSelected && "bg-background ring-1 ring-yellow-300/50",
            )}
            style={{ 
                ...commonStyles, 
                // For original text: use the EXACT extracted height (don't auto-size)
                height: isOriginalText ? commonStyles.height : 'auto',
                minWidth: isOriginalText ? undefined : '100px', 
                minHeight: isOriginalText ? undefined : '30px',
                borderStyle: isSelected ? 'solid' : (isOriginalText ? 'none' : commonStyles.borderStyle),
                borderColor: isSelected ? '#3b82f6' : commonStyles.borderColor,
                // Ensure overflow is visible so text doesn't get clipped
                overflow: 'visible',
            }}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedElementId(el.id);
                if (activeTool === "erase") {
                    deleteElement(el.id);
                }
            }}
        >
            <textarea 
                ref={textRef}
                className={cn(
                    "w-full h-full outline-none resize-none overflow-hidden",
                    // Zero padding for original text to match pixel-perfect PDF coordinates
                    isOriginalText ? "p-0 m-0" : "p-1",
                    // White background when editing or edited to hide the image text behind
                    (isSelected || wasEdited) ? "bg-background" : "bg-transparent"
                )}
                style={{ 
                    fontSize: `${el.fontSize}px`, 
                    fontFamily: el.fontFamily, 
                    fontWeight: el.fontWeight || 'normal',
                    fontStyle: el.fontStyle || 'normal',
                    // Original text: transparent until selected or edited
                    color: isOriginalText && !isSelected && !wasEdited ? 'transparent' : el.color,
                    cursor: activeTool === "select" ? 'text' : 'default',
                    pointerEvents: activeTool === "select" ? 'auto' : 'none',
                    // lineHeight: 1 since the bounding box height already accounts for ascent+descent
                    lineHeight: isOriginalText ? '1.1' : '1.3',
                    letterSpacing: '0px',
                    border: 'none',
                    boxSizing: 'border-box',
                    display: 'block',
                    minHeight: isOriginalText ? '100%' : '28px',
                    transform: el.hScale ? `scaleX(${el.hScale})` : undefined,
                    transformOrigin: 'left center',
                    width: el.hScale ? `${Math.round(100 / el.hScale)}%` : '100%',
                }}
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onFocus={() => setSelectedElementId(el.id)}
                onBlur={() => {
                   if (localContent !== el.content) updateElement({ content: localContent });
                }}
                placeholder={isOriginalText ? "" : "Type here..."}
            />
            {floatingToolbar}
        </div>
      );
    }

    if (el.type === "highlight") {
      return (
        <div 
            className="absolute z-10"
            style={{ ...commonStyles, backgroundColor: el.color, opacity: el.opacity }}
            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
        />
      );
    }

    if (el.type === "shape") {
        return (
            <div 
                className="absolute z-20"
                style={{ 
                    ...commonStyles, 
                    border: `${el.borderWidth}px solid ${el.borderColor}`,
                    backgroundColor: el.fillColor,
                    borderRadius: el.shape === "circle" ? "50%" : "0%"
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
            />
        );
    }

    if (el.type === "image" || el.type === "signature") {
        return (
            <div 
                className={cn(
                    "absolute z-20",
                    isSelected && "ring-2 ring-primary shadow-2xl"
                )}
                style={commonStyles}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
            >
                <img src={el.base64Data} className="w-full h-full object-contain pointer-events-none" />
                {floatingToolbar}
                {isSelected && (
                    <div 
                        onMouseDown={onMouseDownResize}
                        className="absolute -bottom-1 -right-1 h-3 w-3 bg-primary rounded-full cursor-nwse-resize shadow-lg z-30"
                        title="Resize"
                    />
                )}
            </div>
        );
    }

    return null;
  };

  // --- Rendering Functions ---

  if (stage === 1) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter text-foreground">Edit PDF</h1>
        <p className="text-foreground/40 font-bold text-base md:text-xl mb-12 uppercase tracking-widest px-4">
            Upload your file to start visual editing. NO LIMITS.
        </p>
        <UploadBox 
          endpoint="/api/pdf/load" 
          accept=".pdf" 
          responseType="json"
          buttonLabel="Edit PDF"
          loadingLabel="Loading Editor..."
          onSuccess={(data) => handleUploadSuccess(data)}
          onFileSelect={(files) => setOriginalFile(files[0])}
        />
        <input 
            type="file" 
            id="hidden-pdf-upload" 
            className="hidden" 
            onChange={(e) => {
                if(e.target.files?.[0]) setOriginalFile(e.target.files[0]);
            }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
            document.getElementById('hidden-pdf-upload')?.parentElement.querySelector('input[type=file]')?.addEventListener('change', (e) => {
                // This is a hack to capture the file because UploadBox handles its own state
            });
        `}} />
      </div>
    );
  }

  const activePage = editorState.pages[editorState.pageOrder[currentPageIndex]];

  return (
    <div className="fixed top-0 md:top-20 inset-x-0 bottom-0 flex flex-col bg-muted overflow-hidden font-sans z-[45]">
      {/* Top Bar */}
      <header className="h-16 md:h-20 bg-background border-b border-divider px-4 md:px-8 flex items-center justify-between shrink-0 z-50 relative">
        <div className="flex items-center gap-2 md:gap-6">
          <div className="bg-muted rounded-xl px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-foreground/40">
            Page {currentPageIndex + 1} of {editorState.pageOrder.length}
          </div>
          <div className="flex gap-1 md:gap-2">
            <button onClick={handleUndo} disabled={undoPointer <= 0} className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
            </button>
            <button onClick={handleRedo} disabled={undoPointer >= history.length - 1} className="p-2 hover:bg-muted rounded-lg disabled:opacity-30 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-white px-6 md:px-10 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          {isSaving ? "Saving..." : "Save PDF"}
          {!isSaving && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
        </button>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Sidebar (Thumbnails) */}
        <aside className={cn(
            "w-56 md:w-72 bg-background border-r border-divider overflow-y-auto p-4 md:p-6 transition-all shrink-0 md:relative absolute h-full z-40",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:p-0"
        )}>
            <div className="flex flex-col gap-6">
                {editorState.pageOrder.map((pageIdx, displayIdx) => (
                    <div 
                        key={`${pageIdx}-${displayIdx}`}
                        onClick={() => setCurrentPageIndex(displayIdx)}
                        className={cn(
                            "group relative cursor-pointer rounded-2xl border-4 transition-all overflow-hidden",
                            currentPageIndex === displayIdx ? "border-primary shadow-2xl scale-[1.02]" : "border-muted hover:border-divider"
                        )}
                    >
                        <img 
                            src={pagesImages[pageIdx]} 
                            className="w-full aspect-auto object-cover" 
                            style={{ 
                                transform: `rotate(${editorState.pages[pageIdx].rotation}deg)`,
                                aspectRatio: pageDimensions[pageIdx] ? `${pageDimensions[pageIdx].width}/${pageDimensions[pageIdx].height}` : '1/1.41'
                            }}
                        />
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-black px-2 py-1 rounded-md backdrop-blur-sm">
                            {displayIdx + 1}
                        </div>
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                             <button onClick={(e) => { e.stopPropagation(); rotatePage(displayIdx, 'left'); }} className="p-1.5 bg-background rounded-lg shadow-lg hover:text-primary transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); deletePage(displayIdx); }} className="p-1.5 bg-background rounded-lg shadow-lg hover:text-rose-500 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); duplicatePage(displayIdx); }} className="p-1.5 bg-background rounded-lg shadow-lg hover:text-blue-500 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        </aside>

        {/* Center Editor + Right Toolbar */}
        <main className="flex-1 flex relative overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 p-4 md:p-8 overflow-auto flex items-start justify-center bg-muted">
                <div 
                    ref={canvasRef}
                    className="relative bg-background shadow-2xl transition-transform duration-300 origin-center select-none my-auto"
                    style={{ 
                        width: '700px', 
                        aspectRatio: pageDimensions[editorState.pageOrder[currentPageIndex]] 
                            ? `${pageDimensions[editorState.pageOrder[currentPageIndex]].width}/${pageDimensions[editorState.pageOrder[currentPageIndex]].height}`
                            : '1/1.41', 
                        transform: `rotate(${activePage?.rotation || 0}deg)` 
                    }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img 
                        src={pagesImages[editorState.pageOrder[currentPageIndex]]} 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                    />
                    
                    {/* SVG Layer for Freehand and Current Draw */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {activePage?.elements.filter(el => el.type === "draw").map(el => (
                            <g key={el.id}>
                                {el.paths?.map((path, pIdx) => (
                                    <polyline 
                                        key={pIdx}
                                        points={path.map(p => `${(p.x/100)*700},${(p.y/100)*700*1.41}`).join(' ')}
                                        fill="none"
                                        stroke={el.color}
                                        strokeWidth={(el.strokeWidth || 2) * (700/1000)} // scale stroke
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ))}
                            </g>
                        ))}
                        {isDrawing && currentPath.length > 0 && activeTool === "draw" && (
                             <polyline 
                                points={currentPath.map(p => `${(p.x/100)*700},${(p.y/100)*700*1.41}`).join(' ')}
                                fill="none"
                                stroke={drawColor}
                                strokeWidth={drawWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                             />
                        )}
                        {isDrawing && currentPath.length > 0 && activeTool === "highlight" && (
                            <rect 
                                x={`${Math.min(...currentPath.map(p => p.x))}%`}
                                y={`${Math.min(...currentPath.map(p => p.y))}%`}
                                width={`${Math.max(...currentPath.map(p => p.x)) - Math.min(...currentPath.map(p => p.x))}%`}
                                height={`${Math.max(...currentPath.map(p => p.y)) - Math.min(...currentPath.map(p => p.y))}%`}
                                fill={highlightColor}
                                opacity="0.4"
                            />
                        )}
                    </svg>

                    {/* Interactive Elements Layer */}
                    {activePage?.elements.filter(el => el.type !== "draw").map(el => (
                        <ElementOverlay key={el.id} el={el} />
                    ))}
                </div>
            </div>

            {/* Right Toolbar (Vertical) */}
            <aside className="w-16 md:w-20 bg-background border-l border-divider flex flex-col items-center py-4 gap-1 overflow-y-auto shrink-0">
                {[
                  { id: 'select', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>, label: 'Select' },
                  { id: 'text', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>, label: 'Text' },
                  { id: 'highlight', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>, label: 'Highlight' },
                  { id: 'draw', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>, label: 'Draw' },
                  { id: 'shape', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="5"/></svg>, label: 'Shape' },
                  { id: 'image', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>, label: 'Image' },
                  { id: 'signature', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/></svg>, label: 'Sign' },
                  { id: 'erase', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.4 4.4c1 1 1 2.5 0 3.4L11 21"/><path d="m22 21-5.9-5.9"/><path d="M11 21H7"/></svg>, label: 'Erase' },
                ].map(tool => (
                    <button 
                        key={tool.id} 
                        onClick={() => {
                            if (tool.id === 'image') {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                        const newEl: Element = {
                                            id: crypto.randomUUID(),
                                            type: "image",
                                            x: 25, y: 25, width: 50, height: 30,
                                            base64Data: re.target?.result as string
                                        };
                                        updateState(prev => ({
                                            ...prev,
                                            pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
                                        }));
                                    };
                                    reader.readAsDataURL(file);
                                };
                                input.click();
                            } else if (tool.id === 'signature') {
                                setShowSignatureModal(true);
                            } else {
                                setActiveTool(tool.id as Tool);
                                if (tool.id !== 'erase') setSelectedElementId(null);
                            }
                        }}
                        className={cn(
                            "flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl transition-all gap-0.5 group",
                            activeTool === tool.id 
                                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                : "text-foreground/40 hover:bg-muted hover:text-foreground"
                        )}
                        title={tool.label}
                    >
                        <div className="transition-transform group-hover:scale-110">{tool.icon}</div>
                        <span className="text-[7px] font-bold uppercase tracking-wider">{tool.label}</span>
                    </button>
                ))}
            </aside>

            {/* Sidebar Toggle */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute left-6 bottom-6 h-12 w-12 bg-background rounded-2xl shadow-xl border border-divider flex items-center justify-center hover:text-primary transition-all z-50 lg:hidden"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            </button>
        </main>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-background rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-divider flex justify-between items-center bg-muted/50">
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Add Signature</h2>
                    <button onClick={() => setShowSignatureModal(false)} className="p-2 text-foreground/40 hover:text-rose-500 hover:bg-background rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <div className="p-8">
                      <div className="bg-muted border-2 border-dashed border-divider rounded-[2rem] aspect-[2/1] flex flex-col items-center justify-center relative overflow-hidden group">
                         <p className="text-foreground/20 font-black uppercase tracking-widest text-xs">Draw signature here</p>
                         <canvas 
                            className="absolute inset-0 cursor-crosshair dark:invert dark:hue-rotate-180"
                            onMouseDown={(e) => {
                                const canvas = e.currentTarget;
                                const ctx = canvas.getContext('2d');
                                if (!ctx) return;
                                ctx.strokeStyle = '#000';
                                ctx.lineWidth = 3;
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                                (canvas as any).isDrawingSignature = true;
                            }}
                            onMouseMove={(e) => {
                                const canvas = e.currentTarget;
                                if (!(canvas as any).isDrawingSignature) return;
                                const ctx = canvas.getContext('2d');
                                if (!ctx) return;
                                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                                ctx.stroke();
                            }}
                            onMouseUp={(e) => {
                                (e.currentTarget as any).isDrawingSignature = false;
                            }}
                            width={500}
                            height={250}
                         />
                      </div>
                      <div className="mt-8 flex gap-4">
                          <button 
                            onClick={() => {
                                const canvas = document.querySelector('canvas');
                                if (!canvas) return;
                                const data = canvas.toDataURL();
                                const newEl: Element = {
                                    id: crypto.randomUUID(),
                                    type: "signature",
                                    x: 35, y: 35, width: 30, height: 15,
                                    base64Data: data
                                };
                                updateState(prev => ({
                                    ...prev,
                                    pages: prev.pages.map((p, i) => i === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p)
                                }));
                                setShowSignatureModal(false);
                            }}
                            className="flex-1 bg-primary text-white py-4 rounded-2xl font-black tracking-tight shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                              Apply Signature
                          </button>
                          <button 
                            onClick={() => {
                                const canvas = document.querySelector('canvas');
                                const ctx = canvas?.getContext('2d');
                                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                            }}
                            className="px-6 border border-divider rounded-2xl font-bold text-foreground/40 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          >
                              Clear
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Save Stage (Review & Rename) */}
      {stage === 3 && (
        <div className="fixed inset-0 bg-background z-[200] flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden font-sans">
          {/* Left: Preview Panel */}
          <div className="flex-1 bg-muted flex flex-col items-center justify-center p-4 md:p-8 relative">
            <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-3xl overflow-hidden border border-divider relative">
               {savedPdfUrl ? (
                 <object 
                   data={`${savedPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                   type="application/pdf"
                   className="w-full h-full"
                 >
                   {/* Fallback for browsers that don't support PDF embedding */}
                   <div className="flex flex-col items-center justify-center h-full p-12 text-center text-foreground/60 gap-6">
                      <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <p className="font-bold max-w-xs">Your browser doesn't support inline PDF previews.</p>
                      <button 
                        onClick={handleDownloadFinal}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg"
                      >
                        Download Directly
                      </button>
                   </div>
                 </object>
               ) : (
                 <div className="flex items-center justify-center h-full text-foreground/40 font-bold uppercase tracking-widest animate-pulse">
                    Processing Preview...
                 </div>
               )}
            </div>
            {/* Tooltip hint */}
            <div className="mt-4 bg-black/5 backdrop-blur-md rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                PDF Preview Mode (Viewing Only)
            </div>
          </div>

          {/* Right: Actions Panel */}
          <div className="w-full md:w-[450px] bg-background border-l border-divider p-8 md:p-12 flex flex-col justify-between shrink-0">
             <div>
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter leading-none text-foreground">PDF Ready!</h1>
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
                          className="w-full bg-muted border-2 border-divider focus:border-primary/20 focus:bg-background px-6 py-5 rounded-2xl md:rounded-3xl outline-none transition-all font-black text-lg md:text-xl pr-16 text-foreground"
                          placeholder="document_name"
                       />
                       <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-foreground/20 text-lg">.pdf</span>
                    </div>
                  </div>

                  {/* Summary Stats (Optional but Premium) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-6 rounded-3xl border border-divider">
                        <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Status</div>
                        <div className="font-black text-emerald-500 text-sm">Optimized</div>
                    </div>
                    <div className="bg-muted/50 p-6 rounded-3xl border border-divider">
                        <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Protection</div>
                        <div className="font-black text-primary text-sm">Secured</div>
                    </div>
                  </div>
                </div>
             </div>

             <div className="space-y-4">
                <button 
                  onClick={handleDownloadFinal}
                  className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-xl tracking-tight shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                    Download File
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"><path d="M7 7l10 10"/><path d="M17 7V17H7"/></svg>
                </button>
                
                <button 
                  onClick={() => setStage(2)}
                  className="w-full py-4 rounded-2xl font-bold text-foreground/40 hover:text-foreground group flex items-center justify-center gap-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="M18 17V7"/></svg>
                  Return to editor
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
