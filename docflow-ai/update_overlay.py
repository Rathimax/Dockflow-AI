import re

with open("app/edit-pdf/page.tsx", "r") as f:
    content = f.read()

# 1. State changes
content = content.replace(
    """    const [isDraggingEl, setIsDraggingEl] = useState(false);
    const [isResizingEl, setIsResizingEl] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });""",
    """    const [isDraggingEl, setIsDraggingEl] = useState(false);
    const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
    const [isResizingEl, setIsResizingEl] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
    const [toolbarOffset, setToolbarOffset] = useState<Point>({ x: 0, y: 0 });"""
)

# 2. Drag handlers
content = content.replace(
    """    const onMouseDownDrag = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElementId(el.id);
      setIsDraggingEl(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };""",
    """    const onMouseDownToolbarDrag = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElementId(el.id);
      setIsDraggingToolbar(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const onMouseDownElDrag = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElementId(el.id);
      setIsDraggingEl(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };"""
)

# 3. useEffect
content = content.replace(
    """    useEffect(() => {
        if (!isDraggingEl && !isResizingEl) return;
        const onMouseMove = (e: MouseEvent) => {
            const dx = ((e.clientX - dragStart.x) / (canvasRef.current?.offsetWidth || 1)) * 100;""",
    """    useEffect(() => {
        if (!isDraggingEl && !isResizingEl && !isDraggingToolbar) return;
        const onMouseMove = (e: MouseEvent) => {
            if (isDraggingToolbar) {
                setToolbarOffset(prev => ({
                    x: prev.x + (e.clientX - dragStart.x),
                    y: prev.y + (e.clientY - dragStart.y)
                }));
                setDragStart({ x: e.clientX, y: e.clientY });
                return;
            }
            const dx = ((e.clientX - dragStart.x) / (canvasRef.current?.offsetWidth || 1)) * 100;"""
)

content = content.replace(
    """        const onMouseUp = () => {
            setIsDraggingEl(false);
            setIsResizingEl(false);
            saveToHistory(editorState);
        };""",
    """        const onMouseUp = () => {
            setIsDraggingEl(false);
            setIsDraggingToolbar(false);
            setIsResizingEl(false);
            saveToHistory(editorState);
        };"""
)

# 4. Floating toolbar
content = content.replace(
    """    const floatingToolbar = isSelected && (
        <div 
            className="absolute -top-12 left-0 flex items-center bg-background border border-divider rounded-2xl shadow-2xl p-1.5 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 pointer-events-auto"
            onMouseDown={e => e.stopPropagation()} // StopToolbar clicks from deselecting
        >
            {/* Move Handle (⠿) */}
            <div 
                onMouseDown={onMouseDownDrag}""",
    """    const floatingToolbar = isSelected && (
        <div 
            className="absolute -top-12 left-0 flex items-center bg-background border border-divider rounded-2xl shadow-2xl p-1.5 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 pointer-events-auto"
            style={{ transform: `translate(${toolbarOffset.x}px, ${toolbarOffset.y}px)` }}
            onMouseDown={e => e.stopPropagation()} // StopToolbar clicks from deselecting
        >
            {/* Move Handle (⠿) */}
            <div 
                onMouseDown={onMouseDownToolbarDrag}"""
)
content = content.replace('title="Drag to move"', 'title="Drag toolbar"')

# 5. Text element
content = content.replace(
    """            onClick={(e) => {
                e.stopPropagation();
                setSelectedElementId(el.id);
                if (activeTool === "erase") {
                    deleteElement(el.id);
                }
            }}
        >
            <textarea""",
    """            onClick={(e) => {
                e.stopPropagation();
                setSelectedElementId(el.id);
                if (activeTool === "erase") {
                    deleteElement(el.id);
                }
            }}
            onMouseDown={(e) => {
                if (activeTool === "select" && e.target === e.currentTarget) {
                    onMouseDownElDrag(e);
                }
            }}
        >
            <textarea"""
)

# 6. Highlight element
content = content.replace(
    """    if (el.type === "highlight") {
      return (
        <div 
            className="absolute z-10"
            style={{ ...commonStyles, backgroundColor: el.color, opacity: el.opacity }}
            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
        />
      );""",
    """    if (el.type === "highlight") {
      return (
        <div 
            className="absolute z-10 cursor-pointer"
            style={{ ...commonStyles, backgroundColor: el.color, opacity: el.opacity }}
            onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
            onMouseDown={(e) => { if (activeTool === "select") onMouseDownElDrag(e); }}
        />
      );"""
)

# 7. Shape element
content = content.replace(
    """    if (el.type === "shape") {
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
        );""",
    """    if (el.type === "shape") {
        return (
            <div 
                className="absolute z-20 cursor-pointer"
                style={{ 
                    ...commonStyles, 
                    border: `${el.borderWidth}px solid ${el.borderColor}`,
                    backgroundColor: el.fillColor,
                    borderRadius: el.shape === "circle" ? "50%" : "0%"
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
                onMouseDown={(e) => { if (activeTool === "select") onMouseDownElDrag(e); }}
            />
        );"""
)

# 8. Image/Signature element
content = content.replace(
    """    if (el.type === "image" || el.type === "signature") {
        return (
            <div 
                className={cn(
                    "absolute z-20",
                    isSelected && "ring-2 ring-primary shadow-2xl"
                )}
                style={commonStyles}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
            >""",
    """    if (el.type === "image" || el.type === "signature") {
        return (
            <div 
                className={cn(
                    "absolute z-20 cursor-pointer",
                    isSelected && "ring-2 ring-primary shadow-2xl"
                )}
                style={commonStyles}
                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); if (activeTool === "erase") deleteElement(el.id); }}
                onMouseDown={(e) => { if (activeTool === "select" && e.target === e.currentTarget) onMouseDownElDrag(e); }}
            >"""
)

with open("app/edit-pdf/page.tsx", "w") as f:
    f.write(content)

print("Done")
