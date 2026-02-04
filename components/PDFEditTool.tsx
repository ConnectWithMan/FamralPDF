import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { 
  Upload, 
  Download, 
  Type, 
  Square, 
  Circle, 
  MousePointer2, 
  Loader2,
  Trash2,
  Pen,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Highlighter,
  Eraser,
  ArrowUp,
  ArrowDown,
  Minus,
  PenTool,
  X,
  RotateCw,
  RotateCcw,
  ArrowRight,
  Copy,
  PlusSquare,
  Lock,
  Stamp,
  Scissors,
  Sparkles,
  Maximize,
  Moon,
  Sun,
  Grid3X3,
  RefreshCcw,
  FilePlus,
  FolderOpen,
  FileCheck,
  Bold,
  Italic,
  RefreshCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  GripVertical,
  Settings,
  Layers,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  BringToFront,
  SendToBack,
  Shield,
  EyeOff,
  Layers as FlattenIcon,
  Hash,
  Info
} from 'lucide-react';
import { AIChatSidebar } from './AIChatSidebar';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type ToolMode = 'select' | 'text' | 'draw' | 'rect' | 'circle' | 'image' | 'highlight' | 'eraser' | 'line' | 'arrow' | 'redact';
type ActiveTab = 'home' | 'insert' | 'organize' | 'convert' | 'security' | 'tools' | 'view';
type TextAlign = 'left' | 'center' | 'right';
type SidebarTab = 'properties' | 'chat';

interface PageMetadata {
  id: string;
  originalIndex: number; // -1 for blank pages
  rotation: number; // 0, 90, 180, 270
}

interface EditorElement {
  id: string;
  pageId: string;
  type: ToolMode;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  color: string;
  fontSize: number;
  isBold?: boolean;
  isItalic?: boolean;
  textAlign?: TextAlign;
  opacity: number;
  rotation?: number; 
  points?: {x: number, y: number}[];
  strokeWidth: number;
}

interface PageNumberConfig {
  enabled: boolean;
  format: 'n' | 'Page n' | 'Page n of total';
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  fontSize: number;
  color: string;
  margin: number;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
};

const COLORS = ['#000000', '#334155', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

// --- Sub-component for individual page rendering ---
interface PDFPageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageMeta: PageMetadata;
  pageIndex: number;
  totalPages: number;
  scale: number;
  elements: EditorElement[];
  toolMode: ToolMode;
  selectedId: string | null;
  showGrid: boolean;
  isDarkMode: boolean;
  pageNumbering: PageNumberConfig;
  onSelect: (id: string | null) => void;
  onActionStart: (action: any, dir: string | null, start: {x: number, y: number}, pageId: string) => void;
  isDragging: boolean;
  action: any;
  resizeDir: string | null;
  currentPoints: {x: number, y: number}[];
  newElStart: {x: number, y: number};
  currentColor: string;
  currentFontSize: number;
  currentStrokeWidth: number;
  currentOpacity: number;
  onTextChange: (id: string, text: string) => void;
  onSizeChange: (id: string, width: number, height: number) => void;
  onSaveHistory: () => void;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pdfDoc, pageMeta, pageIndex, totalPages, scale, elements, toolMode, selectedId, showGrid, isDarkMode, pageNumbering,
  onSelect, onActionStart, isDragging, action, resizeDir, currentPoints, 
  newElStart, currentColor, currentFontSize, currentStrokeWidth, currentOpacity, 
  onTextChange, onSizeChange, onSaveHistory
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const pageElements = useMemo(() => elements.filter(el => el.pageId === pageMeta.id), [elements, pageMeta.id]);

  useEffect(() => {
    const render = async () => {
      if (!canvasRef.current) return;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      if (pageMeta.originalIndex === -1) {
        const w = 612 * scale;
        const h = 792 * scale;
        canvas.width = w; canvas.height = h;
        setSize({ width: w, height: h });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, w, h);
        return;
      }

      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageMeta.originalIndex);
        const viewport = page.getViewport({ scale, rotation: pageMeta.rotation });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setSize({ width: viewport.width, height: viewport.height });
        
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("PDF Page Render Error:", e);
        }
      }
    };
    render();
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }
    };
  }, [pdfDoc, pageMeta, scale]);

  const getPageNumberText = () => {
    const n = pageIndex + 1;
    if (pageNumbering.format === 'n') return `${n}`;
    if (pageNumbering.format === 'Page n') return `Page ${n}`;
    return `Page ${n} of ${totalPages}`;
  };

  const getPageNumberStyle = (): React.CSSProperties => {
    const margin = pageNumbering.margin * scale;
    const style: React.CSSProperties = {
      position: 'absolute',
      fontSize: pageNumbering.fontSize * scale,
      color: pageNumbering.color,
      zIndex: 10,
      pointerEvents: 'none',
      fontWeight: 'bold',
      fontFamily: 'sans-serif'
    };

    if (pageNumbering.position.includes('top')) style.top = margin;
    else style.bottom = margin;

    if (pageNumbering.position.includes('left')) style.left = margin;
    else if (pageNumbering.position.includes('right')) style.right = margin;
    else {
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    }

    return style;
  };

  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
  };

  const handleTextareaInput = (id: string, e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    onTextChange(id, target.value);
    
    target.style.width = 'auto';
    target.style.height = 'auto';
    
    const newWidth = Math.max(40, target.scrollWidth);
    const newHeight = Math.max(20, target.scrollHeight);
    
    target.style.width = `${newWidth}px`;
    target.style.height = `${newHeight}px`;
    
    onSizeChange(id, newWidth, newHeight);
  };

  return (
    <div 
      id={`page-${pageMeta.id}`}
      ref={containerRef}
      className={`relative shadow-2xl border rounded-[2px] mb-12 origin-top flex-shrink-0 group/page transition-all ${isDarkMode ? 'border-[#333]' : 'bg-white border-slate-200'}`}
      style={{ width: size.width, height: size.height }}
      onMouseDown={(e) => {
        if (!pdfDoc && pageMeta.originalIndex !== -1) return;
        const { x, y } = getPos(e);
        if (toolMode === 'select') { 
          onSelect(null); 
          setEditingId(null);
          return; 
        }
        
        const act = (toolMode === 'draw' || toolMode === 'highlight') ? 'drawing' : 'creating';
        onActionStart(act, null, {x, y}, pageMeta.id);
      }}
    >
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{
          backgroundImage: `linear-gradient(to right, ${isDarkMode ? '#333' : '#e5e7eb'} 1px, transparent 1px), linear-gradient(to bottom, ${isDarkMode ? '#333' : '#e5e7eb'} 1px, transparent 1px)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`
        }} />
      )}

      {pageNumbering.enabled && (
        <div style={getPageNumberStyle()} className="animate-in fade-in duration-300">
          {getPageNumberText()}
        </div>
      )}

      <canvas ref={canvasRef} className="block pointer-events-none z-0" />
      
      {pageElements.map(el => {
        const isEditing = editingId === el.id;
        const isSelected = selectedId === el.id;

        return (
          <div
            key={el.id}
            onMouseDown={(e) => {
              if (toolMode !== 'select') return;
              if (isSelected && el.type === 'text') {
                e.stopPropagation();
                setEditingId(el.id);
                return;
              }
              e.stopPropagation();
              onSelect(el.id);
              onActionStart('moving', null, { x: e.clientX, y: e.clientY }, pageMeta.id);
            }}
            onDoubleClick={(e) => {
              if (el.type === 'text') {
                e.stopPropagation();
                setEditingId(el.id);
              }
            }}
            className={`absolute group transition-shadow z-[2] ${isSelected ? 'ring-2 ring-blue-500 z-20' : 'hover:ring-1 hover:ring-blue-300 cursor-pointer'} ${!isEditing ? 'cursor-move' : ''}`}
            style={{
              left: el.x, top: el.y, width: el.width, height: el.height,
              backgroundColor: el.type === 'redact' ? '#000000' : 'transparent',
              border: (el.type === 'rect' || el.type === 'circle' || el.type === 'redact') ? `${el.strokeWidth}px solid ${el.type === 'redact' ? '#ef4444' : el.color}` : 'none',
              borderRadius: el.type === 'circle' ? '50%' : '0',
              opacity: el.opacity,
              transform: `rotate(${el.rotation || 0}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {el.type === 'redact' && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/20 uppercase font-bold pointer-events-none">Redact</div>}
            {el.type === 'text' && (
              <textarea 
                autoFocus={isEditing}
                value={el.content}
                readOnly={!isEditing}
                onInput={(e) => handleTextareaInput(el.id, e)}
                onBlur={() => { setEditingId(null); onSaveHistory(); }}
                className={`w-full h-full bg-transparent resize-none outline-none font-sans overflow-hidden leading-tight p-0 transition-all ${isEditing ? 'cursor-text relative z-[30]' : 'cursor-move'}`}
                style={{ 
                  fontSize: el.fontSize, 
                  color: el.color,
                  fontWeight: el.isBold ? 'bold' : 'normal',
                  fontStyle: el.isItalic ? 'italic' : 'normal',
                  textAlign: el.textAlign || 'left'
                }}
                onMouseDown={e => { if(isEditing) e.stopPropagation(); }}
                onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                spellCheck={false}
              />
            )}
            {el.type === 'image' && el.src && <img src={el.src} className="w-full h-full object-fill pointer-events-none select-none" />}
            {el.type === 'line' && (
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                <line x1="0" y1="0" x2={el.width} y2={el.height} stroke={el.color} strokeWidth={el.strokeWidth} />
              </svg>
            )}
            {el.type === 'arrow' && (
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                <defs><marker id={`arrowhead-${el.id}`} markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={el.color} /></marker></defs>
                <line x1="0" y1="0" x2={el.width} y2={el.height} stroke={el.color} strokeWidth={el.strokeWidth} markerEnd={`url(#arrowhead-${el.id})`} />
              </svg>
            )}
            {(el.type === 'draw' || el.type === 'highlight') && el.points && (
              <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ left: -el.x, top: -el.y }}>
                <path d={`M ${el.points.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke={el.color} strokeWidth={el.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isSelected && (
              <>
                <div 
                  onMouseDown={e => {
                    e.stopPropagation();
                    onActionStart('rotating', null, { x: e.clientX, y: e.clientY }, pageMeta.id);
                  }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-blue-500 rounded-full flex items-center justify-center cursor-alias shadow-md hover:bg-blue-50 z-30 group"
                  title="Rotate"
                  style={{ transform: `rotate(${- (el.rotation || 0)}deg)` }} 
                >
                  <RefreshCw size={12} className="text-blue-500" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[1px] h-4 bg-blue-500" />
                </div>
                {!isEditing && ['nw', 'ne', 'sw', 'se'].map(dir => (
                  <div key={dir} onMouseDown={e => {
                    e.stopPropagation();
                    onSelect(el.id);
                    onActionStart('resizing', dir, { x: e.clientX, y: e.clientY }, pageMeta.id);
                  }} className={`absolute w-3 h-3 bg-white border border-blue-500 z-30 shadow-sm ${dir === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : dir === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : dir === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : '-bottom-1.5 -right-1.5 cursor-se-resize'}`} />
                ))}
              </>
            )}
          </div>
        );
      })}

      {isDragging && action === 'drawing' && currentPoints.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-50">
          <path d={`M ${currentPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke={currentColor} strokeWidth={toolMode === 'highlight' ? 20 : currentStrokeWidth} strokeOpacity={toolMode === 'highlight' ? 0.35 : 1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
};

// --- Sub-component for sidebar page thumbnails ---
interface PDFThumbnailProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageMeta: PageMetadata;
}

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ pdfDoc, pageMeta }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const renderThumb = async () => {
      if (!canvasRef.current) return;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      if (pageMeta.originalIndex === -1) {
        canvas.width = 150;
        canvas.height = 200;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        setRendered(true);
        return;
      }

      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageMeta.originalIndex);
        const viewport = page.getViewport({ scale: 0.2, rotation: pageMeta.rotation });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        setRendered(true);
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("Thumb render error:", e);
        }
      }
    };
    renderThumb();
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
      }
    };
  }, [pdfDoc, pageMeta]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-white relative">
      {!rendered && <Loader2 size={14} className="animate-spin text-slate-300" />}
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-300 ${rendered ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};

export const PDFEditTool: React.FC = () => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [pageSequence, setPageSequence] = useState<PageMetadata[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0); 
  const [scale, setScale] = useState(1.0);
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [documentText, setDocumentText] = useState("");

  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ elements: EditorElement[], sequence: PageMetadata[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('properties');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  
  const [pdfPassword, setPdfPassword] = useState("");
  const [watermarkText, setWatermarkText] = useState("");

  // Page Numbering State
  const [pageNumbering, setPageNumbering] = useState<PageNumberConfig>({
    enabled: false,
    format: 'Page n of total',
    position: 'bottom-center',
    fontSize: 12,
    color: '#64748b',
    margin: 20
  });

  const [currentColor, setCurrentColor] = useState('#0ea5e9');
  const [currentFontSize, setCurrentFontSize] = useState(16);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentOpacity, setCurrentOpacity] = useState(1);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [action, setAction] = useState<'moving' | 'creating' | 'drawing' | 'resizing' | 'rotating' | null>(null);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [newElStart, setNewElStart] = useState({ x: 0, y: 0 });
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const isDrawingSign = useRef(false);

  const selectedElement = useMemo(() => elements.find(el => el.id === selectedId), [elements, selectedId]);

  // Contextual Auto-Show Sidebar logic
  useEffect(() => {
    if (selectedId) {
      setSidebarTab('properties');
      setIsSidebarOpen(true);
    } else if (activeTab === 'organize' && pageNumbering.enabled) {
      setSidebarTab('properties');
      setIsSidebarOpen(true);
    } else {
      if (sidebarTab === 'properties') {
        setIsSidebarOpen(false);
      }
    }
  }, [selectedId, sidebarTab, activeTab, pageNumbering.enabled]);

  const scrollToPage = (pageId: string) => {
    const element = document.getElementById(`page-${pageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const index = pageSequence.findIndex(p => p.id === pageId);
      if (index !== -1) setCurrentPageIndex(index);
    }
  };

  const saveToHistory = useCallback((newElements: EditorElement[] = elements, newSequence: PageMetadata[] = pageSequence) => {
    const clonedElements = newElements.map(el => ({ ...el, points: el.points ? [...el.points] : undefined }));
    const clonedSequence = newSequence.map(p => ({ ...p }));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: clonedElements, sequence: clonedSequence });
    if (newHistory.length > 30) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, elements, pageSequence]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setElements([...prev.elements]);
      setPageSequence([...prev.sequence]);
      setHistoryIndex(historyIndex - 1);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setElements([...next.elements]);
      setPageSequence([...next.sequence]);
      setHistoryIndex(historyIndex + 1);
      setSelectedId(null);
    }
  };

  const updateSelectedElement = (updates: Partial<EditorElement>) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...updates } : el));
  };

  const bringToFront = () => {
    if (!selectedId) return;
    const index = elements.findIndex(el => el.id === selectedId);
    if (index === -1) return;
    const newElements = [...elements];
    const [element] = newElements.splice(index, 1);
    newElements.push(element);
    setElements(newElements);
    saveToHistory(newElements);
  };

  const sendToBack = () => {
    if (!selectedId) return;
    const index = elements.findIndex(el => el.id === selectedId);
    if (index === -1) return;
    const newElements = [...elements];
    const [element] = newElements.splice(index, 1);
    newElements.unshift(element);
    setElements(newElements);
    saveToHistory(newElements);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setFileName(file.name);
    setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    const buffer = await file.arrayBuffer();
    setFileBytes(buffer.slice(0)); // Store original slice
    try {
      const loadedPdf = await pdfjsLib.getDocument(new Uint8Array(buffer.slice(0))).promise;
      setPdfDoc(loadedPdf);
      const initialSequence: PageMetadata[] = Array.from({ length: loadedPdf.numPages }, (_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        originalIndex: i + 1,
        rotation: 0
      }));
      setPageSequence(initialSequence);
      setCurrentPageIndex(0);
      setElements([]);
      setHistory([]);
      setHistoryIndex(-1);
      saveToHistory([], initialSequence);
      let extractedText = "";
      for (let i = 1; i <= Math.min(loadedPdf.numPages, 10); i++) {
        const page = await loadedPdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
      }
      setDocumentText(extractedText);
    } catch (err) {
      alert("Error loading PDF");
    } finally {
      setIsLoading(false);
      setIsFileMenuOpen(false);
    }
  };

  const handlePageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('pageIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('pageIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    const newSequence = [...pageSequence];
    const [movedPage] = newSequence.splice(sourceIndex, 1);
    newSequence.splice(targetIndex, 0, movedPage);
    setPageSequence(newSequence);
    saveToHistory(elements, newSequence);
    setCurrentPageIndex(targetIndex);
  };

  const organizeAction = (type: 'rotate' | 'move' | 'delete' | 'duplicate' | 'blank', param?: any, specificIndex?: number) => {
    let newSequence = [...pageSequence];
    let newElements = [...elements];
    const targetIdx = specificIndex !== undefined ? specificIndex : currentPageIndex;
    const pageId = pageSequence[targetIdx].id;

    switch (type) {
      case 'rotate':
        newSequence[targetIdx].rotation = (newSequence[targetIdx].rotation + (param === 'cw' ? 90 : -90) + 360) % 360;
        break;
      case 'move':
        const moveTarget = param === 'up' ? targetIdx - 1 : targetIdx + 1;
        if (moveTarget >= 0 && moveTarget < newSequence.length) {
          [newSequence[targetIdx], newSequence[moveTarget]] = [newSequence[moveTarget], newSequence[targetIdx]];
          setCurrentPageIndex(moveTarget);
        }
        break;
      case 'delete':
        if (newSequence.length > 1) {
          newSequence.splice(targetIdx, 1);
          newElements = newElements.filter(el => el.pageId !== pageId);
          setCurrentPageIndex(Math.max(0, targetIdx - 1));
        } else {
          alert("Document must have at least one page.");
          return;
        }
        break;
      case 'duplicate':
        const originalPage = newSequence[targetIdx];
        const newId = Math.random().toString(36).substr(2, 9);
        newSequence.splice(targetIdx + 1, 0, { ...originalPage, id: newId });
        const currentElements = elements.filter(el => el.pageId === originalPage.id);
        const clonedElements = currentElements.map(el => ({ ...el, id: Date.now().toString() + Math.random(), pageId: newId }));
        newElements = [...newElements, ...clonedElements];
        setCurrentPageIndex(targetIdx + 1);
        break;
      case 'blank':
        const blankId = Math.random().toString(36).substr(2, 9);
        newSequence.splice(targetIdx + 1, 0, { id: blankId, originalIndex: -1, rotation: 0 });
        setCurrentPageIndex(targetIdx + 1);
        break;
    }

    setPageSequence(newSequence);
    setElements(newElements);
    saveToHistory(newElements, newSequence);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const { x, y } = { x: e.clientX, y: e.clientY };
    if (action === 'drawing') {
      const rect = document.getElementById(`page-${activePageId}`)?.getBoundingClientRect();
      if (rect) { setCurrentPoints(prev => [...prev, { x: x - rect.left, y: y - rect.top }]); }
    } else if (action === 'moving' && selectedId) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setDragStart({ x, y });
      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el));
    } else if (action === 'resizing' && selectedId && resizeDir) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setDragStart({ x, y });
      setElements(prev => prev.map(item => {
        if (item.id !== selectedId) return item;
        let { x: ex, y: ey, width, height } = item;
        if (resizeDir.includes('e')) width += dx;
        if (resizeDir.includes('s')) height += dy;
        if (resizeDir.includes('w')) { ex += dx; width -= dx; }
        if (resizeDir.includes('n')) { ey += dy; height -= dy; }
        return { ...item, x: ex, y: ey, width: Math.max(10, width), height: Math.max(10, height) };
      }));
    } else if (action === 'rotating' && selectedId && activePageId) {
      const el = elements.find(e => e.id === selectedId);
      const rect = document.getElementById(`page-${activePageId}`)?.getBoundingClientRect();
      if (el && rect) {
        const centerX = rect.left + el.x + el.width / 2;
        const centerY = rect.top + el.y + el.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
        let finalAngle = angle + 90;
        if (e.shiftKey) finalAngle = Math.round(finalAngle / 15) * 15;
        updateSelectedElement({ rotation: (Math.round(finalAngle) + 360) % 360 });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    if (action === 'drawing' && activePageId && currentPoints.length > 2) {
      const minX = Math.min(...currentPoints.map(p => p.x));
      const minY = Math.min(...currentPoints.map(p => p.y));
      const maxX = Math.max(...currentPoints.map(p => p.x));
      const maxY = Math.max(...currentPoints.map(p => p.y));
      const newEl: EditorElement = { id: Date.now().toString(), pageId: activePageId, type: toolMode === 'highlight' ? 'highlight' : 'draw', x: minX, y: minY, width: maxX - minX, height: maxY - minY, points: currentPoints, color: currentColor, fontSize: currentFontSize, opacity: toolMode === 'highlight' ? 0.35 : currentOpacity, strokeWidth: toolMode === 'highlight' ? 20 : currentStrokeWidth, rotation: 0 };
      const updated = [...elements, newEl];
      setElements(updated);
      saveToHistory(updated);
    } else if (action === 'creating' && activePageId) {
      const rect = document.getElementById(`page-${activePageId}`)?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = x - newElStart.x;
        const h = y - newElStart.y;
        const newEl: EditorElement = { 
          id: Date.now().toString(), pageId: activePageId, type: toolMode, 
          x: (toolMode === 'line' || toolMode === 'arrow') ? newElStart.x : Math.min(x, newElStart.x), 
          y: (toolMode === 'line' || toolMode === 'arrow') ? newElStart.y : Math.min(y, newElStart.y), 
          width: (toolMode === 'line' || toolMode === 'arrow') ? Math.max(20, w) : Math.max(20, Math.abs(w)), 
          height: (toolMode === 'line' || toolMode === 'arrow') ? Math.max(20, h) : Math.max(20, Math.abs(h)), 
          color: toolMode === 'redact' ? '#000000' : currentColor, 
          fontSize: currentFontSize, 
          opacity: toolMode === 'redact' ? 1 : currentOpacity, 
          strokeWidth: toolMode === 'redact' ? 1 : currentStrokeWidth, 
          content: toolMode === 'text' ? 'Type here...' : undefined, 
          isBold: false, isItalic: false, textAlign: 'left', rotation: 0 
        };
        if (toolMode === 'text' || Math.abs(w) > 5 || Math.abs(h) > 5) { 
          const updated = [...elements, newEl]; 
          setElements(updated); 
          saveToHistory(updated); 
          if (toolMode !== 'text') setToolMode('select'); 
          setSelectedId(newEl.id); 
        }
      }
    } else if (action === 'moving' || action === 'resizing' || action === 'rotating') {
      saveToHistory(elements);
    }
    setIsDragging(false); setAction(null); setResizeDir(null); setCurrentPoints([]); setActivePageId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newEl: EditorElement = { id: Date.now().toString(), pageId: pageSequence[currentPageIndex].id, type: 'image', x: 100, y: 100, width: 200, height: 150, src: ev.target?.result as string, color: '#000', fontSize: 16, opacity: 1, strokeWidth: 0, rotation: 0 };
      const updated = [...elements, newEl];
      setElements(updated);
      saveToHistory(updated);
      setToolMode('select');
      setSelectedId(newEl.id);
    };
    reader.readAsDataURL(file);
  };

  const flattenPDF = async () => {
    if (!pageSequence.length) return;
    setIsSaving(true);
    try {
      // SLICE buffer to prevent detachment issues
      const sourceDoc = fileBytes ? await PDFDocument.load(fileBytes.slice(0)) : null;
      const outputDoc = await PDFDocument.create();
      const font = await outputDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await outputDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await outputDoc.embedFont(StandardFonts.HelveticaOblique);
      const boldItalicFont = await outputDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      
      for (let i = 0; i < pageSequence.length; i++) {
        const meta = pageSequence[i];
        let page;
        if (meta.originalIndex === -1) { 
          page = outputDoc.addPage([612, 792]); 
        } else { 
            try {
                if (sourceDoc && (meta.originalIndex - 1) < sourceDoc.getPageCount()) {
                  const copied = await outputDoc.copyPages(sourceDoc, [meta.originalIndex - 1]); 
                  page = copied[0]; 
                  outputDoc.addPage(page); 
                  page.setRotation({ type: 'degrees', angle: meta.rotation }); 
                } else {
                  page = outputDoc.addPage([612, 792]);
                }
            } catch (e) {
                page = outputDoc.addPage([612, 792]);
            }
        }
        
        const h = page.getHeight();
        const w = page.getWidth();

        // Draw Page Number if enabled
        if (pageNumbering.enabled) {
          const n = i + 1;
          let text = `${n}`;
          if (pageNumbering.format === 'Page n') text = `Page ${n}`;
          else if (pageNumbering.format === 'Page n of total') text = `Page ${n} of ${pageSequence.length}`;
          
          const fontSize = pageNumbering.fontSize;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const margin = pageNumbering.margin;
          
          let tx = margin;
          let ty = margin;
          
          if (pageNumbering.position.includes('top')) ty = h - margin - fontSize;
          if (pageNumbering.position.includes('center')) tx = (w - textWidth) / 2;
          else if (pageNumbering.position.includes('right')) tx = w - margin - textWidth;
          
          page.drawText(text, {
            x: tx,
            y: ty,
            size: fontSize,
            font: font,
            color: hexToRgb(pageNumbering.color)
          });
        }

        if (watermarkText) { 
            page.drawText(watermarkText, { x: 50, y: h / 2, size: 60, font: boldFont, color: rgb(0.8, 0.8, 0.8), opacity: 0.25, rotate: degrees(45) }); 
        }
        
        const pageElements = elements.filter(el => el.pageId === meta.id);
        for (const el of pageElements) {
          if (el.type === 'redact') continue;
          const px = el.x / scale; const py = h - (el.y / scale); 
          const pw = el.width / scale; const ph = el.height / scale;
          const rotVal = -(el.rotation || 0); const rot = degrees(rotVal);
          const cx = px + pw / 2; const cy = py - ph / 2;
          const getRotatedXY = (origX: number, origY: number) => {
            const angleRad = (rotVal * Math.PI) / 180;
            const cos = Math.cos(angleRad); const sin = Math.sin(angleRad);
            const dx = origX - cx; const dy = origY - cy;
            return { x: cx + (dx * cos - dy * sin), y: cy + (dx * sin + dy * cos) };
          };
          if (el.type === 'text') {
            let selectedFont = font;
            if (el.isBold && el.isItalic) selectedFont = boldItalicFont; 
            else if (el.isBold) selectedFont = boldFont; 
            else if (el.isItalic) selectedFont = italicFont;
            const pos = getRotatedXY(px, py - (el.fontSize / scale));
            page.drawText(el.content || ' ', { x: pos.x, y: pos.y, size: el.fontSize / scale, color: hexToRgb(el.color), font: selectedFont, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'rect') { 
            const pos = getRotatedXY(px, py - ph); 
            page.drawRectangle({ x: pos.x, y: pos.y, width: pw, height: ph, borderColor: hexToRgb(el.color), borderWidth: el.strokeWidth / scale, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'circle') { 
            page.drawEllipse({ x: cx, y: cy, xScale: pw/2, yScale: ph/2, borderColor: hexToRgb(el.color), borderWidth: el.strokeWidth / scale, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'line' || el.type === 'arrow') { 
            const start = getRotatedXY(px, py); const end = getRotatedXY(px + pw, py - ph); 
            page.drawLine({ start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y }, color: hexToRgb(el.color), thickness: el.strokeWidth / scale, opacity: el.opacity });
          } else if (el.type === 'image' && el.src) {
            try { 
                const img = el.src.includes('png') ? await outputDoc.embedPng(el.src) : await outputDoc.embedJpg(el.src); 
                const pos = getRotatedXY(px, py - ph); 
                page.drawImage(img, { x: pos.x, y: pos.y, width: pw, height: ph, opacity: el.opacity, rotate: rot }); 
            } catch (e) {}
          }
        }
        for (const el of pageElements.filter(e => e.type === 'redact')) {
          const px = el.x / scale; const py = h - (el.y / scale); 
          const pw = el.width / scale; const ph = el.height / scale;
          const rotVal = -(el.rotation || 0); const rot = degrees(rotVal);
          const cx = px + pw / 2; const cy = py - ph / 2;
          const angleRad = (rotVal * Math.PI) / 180;
          const cos = Math.cos(angleRad); const sin = Math.sin(angleRad);
          const dx = px - cx; const dy = (py - ph) - cy;
          const rx = cx + (dx * cos - dy * sin); const ry = cy + (dx * sin + dy * cos);
          page.drawRectangle({ x: rx, y: ry, width: pw, height: ph, color: rgb(0, 0, 0), rotate: rot });
        }
      }
      
      const bytes = await outputDoc.save();
      const newFileBytes = bytes.buffer;
      setFileBytes(newFileBytes);
      
      const loadedPdf = await pdfjsLib.getDocument(new Uint8Array(newFileBytes.slice(0))).promise;
      setPdfDoc(loadedPdf);

      const normalizedSequence: PageMetadata[] = pageSequence.map((p, idx) => ({
        ...p,
        originalIndex: idx + 1,
        rotation: 0             
      }));
      setPageSequence(normalizedSequence);
      setElements([]);
      saveToHistory([], normalizedSequence);
      
      alert("PDF successfully flattened. All annotations and page numbers are now part of the base document.");
    } catch (e) { 
      console.error("PDF Flatten Error:", e); 
      alert("Error flattening PDF."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDownload = async () => {
    if (!pageSequence.length) return;
    setIsSaving(true);
    try {
      // SLICE buffer to prevent detachment issues
      const sourceDoc = fileBytes ? await PDFDocument.load(fileBytes.slice(0)) : null;
      const outputDoc = await PDFDocument.create();
      const font = await outputDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await outputDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await outputDoc.embedFont(StandardFonts.HelveticaOblique);
      const boldItalicFont = await outputDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      
      for (let i = 0; i < pageSequence.length; i++) {
        const meta = pageSequence[i];
        let page;
        if (meta.originalIndex === -1) { 
          page = outputDoc.addPage([612, 792]); 
        } else { 
            try {
                const targetIndex = meta.originalIndex - 1;
                if (sourceDoc && targetIndex >= 0 && targetIndex < sourceDoc.getPageCount()) {
                  const copied = await outputDoc.copyPages(sourceDoc, [targetIndex]); 
                  page = copied[0]; 
                  outputDoc.addPage(page); 
                  page.setRotation({ type: 'degrees', angle: meta.rotation }); 
                } else {
                  page = outputDoc.addPage([612, 792]);
                }
            } catch (e) {
                page = outputDoc.addPage([612, 792]);
            }
        }
        
        const h = page.getHeight();
        const w = page.getWidth();

        // Draw Page Number if enabled
        if (pageNumbering.enabled) {
          const n = i + 1;
          let text = `${n}`;
          if (pageNumbering.format === 'Page n') text = `Page ${n}`;
          else if (pageNumbering.format === 'Page n of total') text = `Page ${n} of ${pageSequence.length}`;
          
          const fontSize = pageNumbering.fontSize;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const margin = pageNumbering.margin;
          
          let tx = margin;
          let ty = margin;
          
          if (pageNumbering.position.includes('top')) ty = h - margin - fontSize;
          if (pageNumbering.position.includes('center')) tx = (w - textWidth) / 2;
          else if (pageNumbering.position.includes('right')) tx = w - margin - textWidth;
          
          page.drawText(text, {
            x: tx,
            y: ty,
            size: fontSize,
            font: font,
            color: hexToRgb(pageNumbering.color)
          });
        }

        if (watermarkText) { 
            page.drawText(watermarkText, { x: 50, y: h / 2, size: 60, font: boldFont, color: rgb(0.8, 0.8, 0.8), opacity: 0.25, rotate: degrees(45) }); 
        }
        
        const pageElements = elements.filter(el => el.pageId === meta.id);
        for (const el of pageElements) {
          if (el.type === 'redact') continue;
          const px = el.x / scale; 
          const py = h - (el.y / scale); 
          const pw = el.width / scale; 
          const ph = el.height / scale;
          const rotVal = -(el.rotation || 0); 
          const rot = degrees(rotVal);
          const cx = px + pw / 2; 
          const cy = py - ph / 2;
          const getRotatedXY = (origX: number, origY: number) => {
            const angleRad = (rotVal * Math.PI) / 180;
            const cos = Math.cos(angleRad); const sin = Math.sin(angleRad);
            const dx = origX - cx; const dy = origY - cy;
            return { x: cx + (dx * cos - dy * sin), y: cy + (dx * sin + dy * cos) };
          };

          if (el.type === 'text') {
            let selectedFont = font;
            if (el.isBold && el.isItalic) selectedFont = boldItalicFont; 
            else if (el.isBold) selectedFont = boldFont; 
            else if (el.isItalic) selectedFont = italicFont;
            const pos = getRotatedXY(px, py - (el.fontSize / scale));
            page.drawText(el.content || ' ', { x: pos.x, y: pos.y, size: el.fontSize / scale, color: hexToRgb(el.color), font: selectedFont, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'rect') { 
            const pos = getRotatedXY(px, py - ph); 
            page.drawRectangle({ x: pos.x, y: pos.y, width: pw, height: ph, borderColor: hexToRgb(el.color), borderWidth: el.strokeWidth / scale, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'circle') { 
            page.drawEllipse({ x: cx, y: cy, xScale: pw/2, yScale: ph/2, borderColor: hexToRgb(el.color), borderWidth: el.strokeWidth / scale, opacity: el.opacity, rotate: rot });
          } else if (el.type === 'line' || el.type === 'arrow') { 
            const start = getRotatedXY(px, py); const end = getRotatedXY(px + pw, py - ph); 
            page.drawLine({ start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y }, color: hexToRgb(el.color), thickness: el.strokeWidth / scale, opacity: el.opacity });
          } else if (el.type === 'image' && el.src) {
            try { 
                const img = el.src.includes('png') ? await outputDoc.embedPng(el.src) : await outputDoc.embedJpg(el.src); 
                const pos = getRotatedXY(px, py - ph); 
                page.drawImage(img, { x: pos.x, y: pos.y, width: pw, height: ph, opacity: el.opacity, rotate: rot }); 
            } catch (e) {}
          }
        }
        for (const el of pageElements.filter(e => e.type === 'redact')) {
          const px = el.x / scale; const py = h - (el.y / scale); 
          const pw = el.width / scale; const ph = el.height / scale;
          const rotVal = -(el.rotation || 0); const rot = degrees(rotVal);
          const cx = px + pw / 2; const cy = py - ph / 2;
          const angleRad = (rotVal * Math.PI) / 180;
          const cos = Math.cos(angleRad); const sin = Math.sin(angleRad);
          const dx = px - cx; const dy = (py - ph) - cy;
          const rx = cx + (dx * cos - dy * sin);
          const ry = cy + (dx * sin + dy * cos);
          page.drawRectangle({ x: rx, y: ry, width: pw, height: ph, color: rgb(0, 0, 0), rotate: rot });
        }
      }

      const bytes = await outputDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${docTitle || 'document'}.pdf`; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e) { 
      console.error("PDF Gen Error:", e); 
      alert("Error generating PDF."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className={`flex flex-col h-full w-full select-none transition-colors duration-500 ${isDarkMode ? 'bg-[#1e1e1e] text-slate-100' : 'bg-[#f8f9fa] text-slate-900'}`} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={handleFileUpload} />
      
      <nav className={`${isDarkMode ? 'bg-[#252526] border-[#333]' : 'bg-white border-slate-200'} border-b flex flex-col shadow-sm transition-colors duration-500 relative z-50`}>
        <div className="h-12 flex items-center px-4 gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <img src="https://www.famral.com/pdf-editor.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className={`font-bold tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>PDF Editor</span>
          </div>
          <div className="flex-1 px-4">
            <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className={`bg-transparent border border-transparent rounded px-2 py-0.5 text-sm transition-all w-full max-w-xs outline-none font-medium ${isDarkMode ? 'hover:bg-[#37373d] focus:bg-[#3c3c3c] text-white' : 'hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-400 text-slate-700'}`} />
          </div>
        </div>
        <div className="h-10 flex items-center justify-between px-4">
          <div className={`flex items-center h-full gap-5 text-[13px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
             <div className="relative h-full flex items-center">
                <button onClick={() => setIsFileMenuOpen(!isFileMenuOpen)} className={`px-2 py-1 rounded transition-colors ${isFileMenuOpen ? (isDarkMode ? 'bg-[#3c3c3c] text-white' : 'bg-slate-100 text-slate-900') : 'hover:opacity-70'}`}>File</button>
                {isFileMenuOpen && (
                  <div className={`absolute top-full left-0 mt-1 w-56 rounded-lg shadow-2xl border animate-in slide-in-from-top-2 duration-150 overflow-hidden ${isDarkMode ? 'bg-[#2d2d2d] border-[#444]' : 'bg-white border-slate-200'}`}>
                    <div className="p-1">
                      <button onClick={() => { setPdfDoc(null); setPageSequence([{ id: Math.random().toString(36).substr(2, 9), originalIndex: -1, rotation: 0 }]); setIsFileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md hover:bg-slate-100 text-slate-700 transition-colors"><FilePlus size={16} className="text-blue-500" /> New Document</button>
                      <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-md hover:bg-slate-100 text-slate-700 transition-colors"><FolderOpen size={16} className="text-orange-500" /> Open File...</button>
                    </div>
                  </div>
                )}
             </div>
             {['home', 'insert', 'organize', 'security', 'tools', 'view'].map(tab => (
                <button key={tab} className={`relative px-2 py-1 h-full flex items-center transition-colors capitalize ${activeTab === tab ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'hover:opacity-70'}`} onClick={() => setActiveTab(tab as ActiveTab)}>{tab}<span className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#d93025] rounded-t-full transition-opacity ${activeTab === tab ? 'opacity-100' : 'opacity-0'}`}></span></button>
             ))}
          </div>
          <button onClick={handleDownload} disabled={!pageSequence.length || isSaving} className="flex items-center gap-2 bg-[#1a73e8] hover:bg-[#185abc] text-white text-[13px] font-bold px-4 py-1.5 rounded shadow-sm disabled:opacity-50 transition-all active:scale-95">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Download size={14} />} Download</button>
        </div>
      </nav>

      <div className={`h-12 border-b flex items-center px-4 gap-1 z-20 overflow-x-auto scrollbar-hide transition-colors duration-500 ${isDarkMode ? 'bg-[#2d2d2d] border-[#333]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={undo} disabled={historyIndex <= 0} className={`p-2 rounded disabled:opacity-20 transition-colors ${isDarkMode ? 'hover:bg-[#3c3c3c] text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} title="Undo"><Undo size={16} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`p-2 rounded disabled:opacity-20 transition-colors ${isDarkMode ? 'hover:bg-[#3c3c3c] text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} title="Redo"><Redo size={16} /></button>
          </div>
          <div className={`h-5 w-px mx-2 shrink-0 ${isDarkMode ? 'bg-[#444]' : 'bg-slate-200'}`} />
          <div className="flex items-center gap-0.5 shrink-0">
            {activeTab === 'home' && (
              <>
                <button onClick={() => setToolMode('select')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'select' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <MousePointer2 size={16} /> <span className="hidden sm:inline">Select</span>
                </button>
                <button onClick={() => setToolMode('text')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'text' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Type size={16} /> <span className="hidden sm:inline">Text</span>
                </button>
                <button onClick={() => setToolMode('draw')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'draw' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Pen size={16} /> <span className="hidden sm:inline">Draw</span>
                </button>
                <button onClick={() => setToolMode('highlight')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'highlight' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Highlighter size={16} /> <span className="hidden sm:inline">Highlight</span>
                </button>
                <button onClick={() => setToolMode('eraser')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'eraser' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Eraser size={16} /> <span className="hidden sm:inline">Eraser</span>
                </button>
              </>
            )}
            {activeTab === 'insert' && (
              <>
                <button onClick={() => setToolMode('rect')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'rect' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Square size={16} /> <span className="hidden sm:inline">Rectangle</span>
                </button>
                <button onClick={() => setToolMode('circle')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'circle' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Circle size={16} /> <span className="hidden sm:inline">Circle</span>
                </button>
                <button onClick={() => setToolMode('line')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'line' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Minus size={16} /> <span className="hidden sm:inline">Line</span>
                </button>
                <button onClick={() => setToolMode('arrow')} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${toolMode === 'arrow' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <ArrowRight size={16} /> <span className="hidden sm:inline">Arrow</span>
                </button>
                <div className="h-5 w-px mx-1 bg-slate-200" />
                <button onClick={() => setIsSignModalOpen(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600`}>
                  <PenTool size={16} /> <span className="hidden sm:inline">Signature</span>
                </button>
                <label className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600 cursor-pointer">
                  <ImageIcon size={16} /> <span className="hidden sm:inline">Image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </>
            )}
            {activeTab === 'organize' && (
              <>
                <button onClick={() => organizeAction('rotate', 'ccw')} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <RotateCcw size={16} /> <span className="hidden sm:inline">Rotate L</span>
                </button>
                <button onClick={() => organizeAction('rotate', 'cw')} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <RotateCw size={16} /> <span className="hidden sm:inline">Rotate R</span>
                </button>
                <div className="h-5 w-px mx-1 bg-slate-200" />
                <button onClick={() => organizeAction('move', 'up')} disabled={currentPageIndex === 0} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600 disabled:opacity-30">
                  <ArrowUp size={16} /> <span className="hidden sm:inline">Up</span>
                </button>
                <button onClick={() => organizeAction('move', 'down')} disabled={currentPageIndex === pageSequence.length-1} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600 disabled:opacity-30">
                  <ArrowDown size={16} /> <span className="hidden sm:inline">Down</span>
                </button>
                <div className="h-5 w-px mx-1 bg-slate-200" />
                <button onClick={() => setPageNumbering(p => ({ ...p, enabled: !p.enabled }))} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border transition-all ${pageNumbering.enabled ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <Hash size={16} /> <span className="hidden sm:inline">{pageNumbering.enabled ? 'Page Nos ON' : 'Page Numbering'}</span>
                </button>
                <button onClick={() => organizeAction('duplicate')} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <Copy size={16} /> <span className="hidden sm:inline">Duplicate</span>
                </button>
                <button onClick={() => organizeAction('blank')} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <PlusSquare size={16} /> <span className="hidden sm:inline">Blank Page</span>
                </button>
                <button onClick={() => organizeAction('delete')} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:text-red-500 hover:bg-red-50 text-slate-600">
                  <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
            {activeTab === 'security' && (
              <>
                <button onClick={() => setIsPasswordModalOpen(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${pdfPassword ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'hover:bg-slate-100 text-slate-600'}`}>
                  {pdfPassword ? <Shield size={16}/> : <Lock size={16}/>} <span className="hidden sm:inline">{pdfPassword ? 'Protected' : 'Protect'}</span>
                </button>
                <button onClick={() => setToolMode('redact')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${toolMode === 'redact' ? 'bg-red-50 text-red-700 border border-red-200' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <EyeOff size={16}/> <span className="hidden sm:inline">Redact</span>
                </button>
                <div className="h-5 w-px mx-1 bg-slate-200" />
                <button onClick={() => setIsWatermarkModalOpen(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${watermarkText ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Stamp size={16}/> <span className="hidden sm:inline">Watermark</span>
                </button>
              </>
            )}
            {activeTab === 'view' && (
              <>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>} <span className="hidden sm:inline">Theme</span>
                </button>
                <button onClick={() => setShowGrid(!showGrid)} className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition-all ${showGrid ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <Grid3X3 size={16}/> <span className="hidden sm:inline">Grid</span>
                </button>
                <div className={`h-5 w-px mx-1 shrink-0 ${isDarkMode ? 'bg-[#444]' : 'bg-slate-200'}`} />
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <ZoomOut size={16}/> <span className="hidden sm:inline">Out</span>
                </button>
                <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold hover:bg-slate-100 text-slate-600">
                  <ZoomIn size={16}/> <span className="hidden sm:inline">In</span>
                </button>
              </>
            )}
            {activeTab === 'tools' && (
              <>
                <button onClick={() => { setSidebarTab('chat'); setIsSidebarOpen(true); }} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-100 text-slate-600`}>
                  <Sparkles size={16}/> <span className="hidden sm:inline">AI Assistant</span>
                </button>
                <button onClick={flattenPDF} disabled={isSaving || elements.length === 0} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-50 transition-colors disabled:opacity-30 text-slate-600`}>
                   {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FlattenIcon size={16} className="text-blue-500" />}
                   <span className="hidden sm:inline">Flatten PDF</span>
                </button>
                <button onClick={() => { if(confirm("Clear all elements?")) setElements([]); }} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 text-red-600">
                  <RefreshCcw size={16}/> <span className="hidden sm:inline">Reset</span>
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-[20px]" />
          {pageSequence.length > 0 && (
             <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border shrink-0 shadow-sm transition-colors ${isDarkMode ? 'bg-[#3c3c3c] border-[#555]' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-[11px] font-bold tabular-nums min-w-[60px] text-center ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{currentPageIndex + 1} / {pageSequence.length}</span>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono w-9 text-center font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{Math.round(scale * 100)}%</span>
                </div>
             </div>
          )}
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        {pageSequence.length > 0 && (
          <aside className={`w-44 border-r overflow-y-auto flex flex-col p-4 gap-4 transition-colors ${isDarkMode ? 'bg-[#1a1a1a] border-[#333]' : 'bg-[#fcfcfc] border-slate-200 shadow-inner'}`}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Pages</div>
            {pageSequence.map((p, i) => (
              <div key={p.id} draggable onDragStart={(e) => handlePageDragStart(e, i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handlePageDrop(e, i)} onClick={() => scrollToPage(p.id)} className={`relative cursor-pointer group/thumb transition-all rounded p-1.5 ${currentPageIndex === i ? 'ring-2 ring-blue-500 bg-blue-50/50 shadow-md' : 'hover:bg-slate-200/50'}`}>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/thumb:opacity-100 transition-opacity p-0.5 text-slate-400"><GripVertical size={12} /></div>
                <div className={`aspect-[3/4] bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] text-slate-400 overflow-hidden relative group-hover/thumb:shadow-md transition-shadow`}>
                   <PDFThumbnail pdfDoc={pdfDoc} pageMeta={p} />
                   <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); organizeAction('rotate', 'cw', i); }} className="p-1 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-blue-500"><RotateCw size={10}/></button>
                      <button onClick={(e) => { e.stopPropagation(); organizeAction('delete', null, i); }} className="p-1 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-red-50 text-red-500"><Trash2 size={10}/></button>
                   </div>
                </div>
                <div className="mt-1.5 text-center text-[10px] font-bold text-slate-500">{i + 1}</div>
              </div>
            ))}
          </aside>
        )}
        <main ref={mainRef} className={`flex-1 overflow-auto flex flex-col items-center py-12 px-8 scrollbar-hide shadow-inner transition-colors duration-500 ${isDarkMode ? 'bg-[#181818]' : 'bg-[#f1f3f4]'}`}>
            {(!pdfDoc && !pageSequence.length && !isLoading) && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg text-center">
                <div className={`w-24 h-24 border-2 border-dashed rounded-3xl flex items-center justify-center mb-8 shadow-sm ${isDarkMode ? 'bg-[#252526] border-[#444]' : 'bg-white border-slate-200'}`}><Upload size={40} className="text-slate-300 opacity-50" /></div>
                <h2 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Professional PDF Editor</h2>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Upload a document to start annotating, signing, or modifying your content.</p>
                <label className="mt-8 px-8 py-3 bg-[#1a73e8] text-white rounded-full cursor-pointer hover:bg-[#185abc] font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">Upload PDF<input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} /></label>
            </div>
            )}
            {isLoading && <div className="flex flex-col items-center gap-4 mt-20 animate-pulse"><Loader2 className="animate-spin text-brand-600" size={48} /><span className="text-sm font-bold tracking-widest uppercase text-brand-600">Processing...</span></div>}
            {pageSequence.map((p, idx) => (
              <PDFPage 
                key={p.id} pdfDoc={pdfDoc} pageMeta={p} pageIndex={idx} totalPages={pageSequence.length} scale={scale} elements={elements} toolMode={toolMode} selectedId={selectedId}
                showGrid={showGrid} isDarkMode={isDarkMode} pageNumbering={pageNumbering} onSelect={setSelectedId}
                onActionStart={(act, dir, start, pId) => { setAction(act); setResizeDir(dir); setNewElStart(start); setDragStart({ x: start.x, y: start.y }); setIsDragging(true); setActivePageId(pId); if (act === 'drawing') setCurrentPoints([start]); }}
                isDragging={isDragging} action={action} resizeDir={resizeDir} currentPoints={currentPoints} newElStart={newElStart}
                currentColor={currentColor} currentFontSize={currentFontSize} currentStrokeWidth={currentStrokeWidth} currentOpacity={currentOpacity}
                onTextChange={(id, text) => setElements(prev => prev.map(el => el.id === id ? {...el, content: text} : el))} 
                onSizeChange={(id, w, h) => setElements(prev => prev.map(el => el.id === id ? {...el, width: w, height: h} : el))}
                onSaveHistory={() => saveToHistory()}
              />
            ))}
        </main>
        <aside className={`relative flex flex-col border-l transition-all duration-300 ease-in-out overflow-visible ${isDarkMode ? 'bg-[#252526] border-[#333]' : 'bg-white border-slate-200'} ${isSidebarOpen ? 'w-80' : 'w-0 border-l-0'}`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`absolute top-1/2 -left-6 -translate-y-1/2 w-6 h-12 rounded-l-lg border flex items-center justify-center transition-colors z-[60] shadow-sm ${isDarkMode ? 'bg-[#2d2d2d] border-[#444] text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>{isSidebarOpen ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}</button>
          <div className={`flex flex-col h-full overflow-hidden w-80 shrink-0 ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>
             <div className="flex items-center gap-1 p-2 border-b border-slate-100/10">
                <button onClick={() => setSidebarTab('properties')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sidebarTab === 'properties' ? (isDarkMode ? 'bg-[#37373d] text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:bg-slate-50/5'}`}>Properties</button>
                <button onClick={() => setSidebarTab('chat')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${sidebarTab === 'chat' ? (isDarkMode ? 'bg-[#37373d] text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:bg-slate-50/5'}`}>AI Assistant</button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sidebarTab === 'chat' ? (
                  <AIChatSidebar isOpen={true} onClose={() => setSidebarTab('properties')} documentText={documentText} fileName={fileName} />
                ) : (
                  <div className="p-5 space-y-8 animate-in fade-in duration-300">
                    {selectedElement ? (
                      <div className="space-y-6">
                         <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100/10">
                            <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand-600 flex items-center gap-2">{selectedElement.type}</h3>
                            <button onClick={() => { setElements(prev => prev.filter(e => e.id !== selectedId)); setSelectedId(null); saveToHistory(); }} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                         </div>
                         {selectedElement.type === 'text' && (
                           <div className="space-y-4">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Typography</label>
                              <div className="space-y-3">
                                 <div className="flex items-center gap-4"><div className="flex-1 space-y-1"><div className="flex justify-between items-center"><span className="text-xs font-medium">Font Size</span><span className="text-xs font-bold">{selectedElement.fontSize}px</span></div><input type="range" min="8" max="120" value={selectedElement.fontSize} onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) })} onMouseUp={() => saveToHistory()} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" /></div></div>
                                 <div className="flex items-center gap-2"><button onClick={() => { updateSelectedElement({ isBold: !selectedElement.isBold }); saveToHistory(); }} className={`flex-1 py-2 rounded-lg border transition-all flex items-center justify-center ${selectedElement.isBold ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Bold size={16}/></button><button onClick={() => { updateSelectedElement({ isItalic: !selectedElement.isItalic }); saveToHistory(); }} className={`flex-1 py-2 rounded-lg border transition-all flex items-center justify-center ${selectedElement.isItalic ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Italic size={16}/></button></div>
                                 <div className="flex items-center gap-1 p-1 bg-slate-50/5 rounded-lg border border-slate-200/50">{(['left', 'center', 'right'] as TextAlign[]).map(align => (<button key={align} onClick={() => { updateSelectedElement({ textAlign: align }); saveToHistory(); }} className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition-all ${selectedElement.textAlign === align ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}>{align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}</button>))}</div>
                              </div>
                           </div>
                         )}
                         <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appearance</label>
                            <div className="space-y-4">
                               {selectedElement.type !== 'redact' && <div className="space-y-1.5"><span className="text-xs font-medium">Theme Color</span><div className="grid grid-cols-5 gap-2">{COLORS.map(c => (<button key={c} onClick={() => { updateSelectedElement({ color: c }); saveToHistory(); }} className={`aspect-square rounded-full border-2 transition-all ${selectedElement.color === c ? 'border-brand-600 scale-110 shadow-sm' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>}
                               {selectedElement.type !== 'redact' && <div className="space-y-1"><div className="flex justify-between items-center"><span className="text-xs font-medium">Opacity</span><span className="text-xs font-bold">{Math.round(selectedElement.opacity * 100)}%</span></div><input type="range" min="0.1" max="1" step="0.05" value={selectedElement.opacity} onChange={(e) => updateSelectedElement({ opacity: parseFloat(e.target.value) })} onMouseUp={() => saveToHistory()} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" /></div>}
                               <div className="space-y-1"><div className="flex justify-between items-center"><span className="text-xs font-medium">Rotation</span><span className="text-xs font-bold">{selectedElement.rotation}°</span></div><div className="flex items-center gap-3"><input type="range" min="0" max="360" value={selectedElement.rotation || 0} onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) })} onMouseUp={() => saveToHistory()} className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" /><button onClick={() => { updateSelectedElement({ rotation: 0 }); saveToHistory(); }} className="text-[10px] font-bold text-slate-400 hover:text-brand-600">RESET</button></div></div>
                               {(selectedElement.type !== 'text' && selectedElement.type !== 'image' && selectedElement.type !== 'redact') && (<div className="space-y-1"><div className="flex justify-between items-center"><span className="text-xs font-medium">Stroke Width</span><span className="text-xs font-bold">{selectedElement.strokeWidth}px</span></div><input type="range" min="1" max="20" value={selectedElement.strokeWidth} onChange={(e) => updateSelectedElement({ strokeWidth: parseInt(e.target.value) })} onMouseUp={() => saveToHistory()} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" /></div>)}
                            </div>
                         </div>
                      </div>
                    ) : (activeTab === 'organize' && pageNumbering.enabled) ? (
                      <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                          <Hash size={18}/><span className="text-sm font-extrabold uppercase tracking-tight">Page Numbering</span>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position</label>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 border rounded-lg">
                            {(['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right'] as const).map(pos => (
                              <button 
                                key={pos} 
                                onClick={() => setPageNumbering(p => ({ ...p, position: pos }))} 
                                className={`p-1 rounded text-[8px] font-bold border transition-all ${pageNumbering.position === pos ? 'bg-white shadow-sm text-blue-600 border-blue-200' : 'border-transparent text-slate-400 hover:bg-white/50'}`}
                              >
                                {pos.replace('-',' ').toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Format</label>
                          <select 
                            value={pageNumbering.format} 
                            onChange={(e) => setPageNumbering(p => ({ ...p, format: e.target.value as any }))} 
                            className={`w-full text-xs p-2.5 border rounded-lg outline-none font-medium ${isDarkMode ? 'bg-[#3c3c3c] border-[#555]' : 'bg-white border-slate-200'}`}
                          >
                            <option value="n">1, 2, 3...</option>
                            <option value="Page n">Page 1, Page 2...</option>
                            <option value="Page n of total">Page 1 of 10...</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Font Size</label>
                            <span className="text-[10px] font-bold">{pageNumbering.fontSize}px</span>
                          </div>
                          <input 
                            type="range" min="8" max="48" value={pageNumbering.fontSize} 
                            onChange={(e) => setPageNumbering(p => ({ ...p, fontSize: parseInt(e.target.value) }))} 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margin</label>
                            <span className="text-[10px] font-bold">{pageNumbering.margin}px</span>
                          </div>
                          <input 
                            type="range" min="5" max="100" value={pageNumbering.margin} 
                            onChange={(e) => setPageNumbering(p => ({ ...p, margin: parseInt(e.target.value) }))} 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color</label>
                          <div className="grid grid-cols-5 gap-2">
                            {COLORS.map(c => (
                              <button 
                                key={c} 
                                onClick={() => setPageNumbering(p => ({ ...p, color: c }))} 
                                className={`aspect-square rounded-full border-2 transition-all ${pageNumbering.color === c ? 'border-blue-600 scale-110 shadow-sm' : 'border-transparent'}`} 
                                style={{ backgroundColor: c }} 
                              />
                            ))}
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3">
                          <Info size={16} className="text-blue-600 shrink-0"/>
                          <p className="text-[10px] leading-relaxed text-blue-800">Page numbers automatically update as you reorder pages. They will be permanently embedded when you download or flatten the PDF.</p>
                        </div>

                        <button 
                          onClick={() => setPageNumbering(p => ({ ...p, enabled: false }))} 
                          className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                        >
                          Remove All Numbers
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                         <Settings size={40} className="text-slate-200" />
                         <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-500">No Selection</p>
                            <p className="text-xs text-slate-400">Select an object or activate a tool to view properties.</p>
                         </div>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        </aside>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className={`w-96 rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-[#252526] border border-[#444]' : 'bg-white'}`}>
             <h3 className="text-lg font-bold mb-4">Protect Document</h3>
             <p className="text-xs text-slate-500 mb-4">Set a password to protect this PDF. (Note: Encryption build limit - security applied to metadata only).</p>
             <input type="password" value={pdfPassword} onChange={(e) => setPdfPassword(e.target.value)} placeholder="Type password..." className={`w-full px-4 py-2 rounded-lg border mb-4 outline-none ${isDarkMode ? 'bg-[#3c3c3c] border-[#555]' : 'bg-slate-50 border-slate-200'}`} />
             <div className="flex justify-end gap-2">
               <button onClick={() => { setPdfPassword(""); setIsPasswordModalOpen(false); }} className="px-4 py-2 text-xs font-bold text-slate-500">Remove</button>
               <button onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Apply Protection</button>
             </div>
          </div>
        </div>
      )}
      {isWatermarkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className={`w-96 rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-[#252526] border border-[#444]' : 'bg-white'}`}>
             <h3 className="text-lg font-bold mb-4">Add Watermark</h3>
             <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="e.g. CONFIDENTIAL" className={`w-full px-4 py-2 rounded-lg border mb-4 outline-none ${isDarkMode ? 'bg-[#3c3c3c] border-[#555]' : 'bg-slate-50 border-slate-200'}`} />
             <div className="flex justify-end gap-2"><button onClick={() => { setWatermarkText(""); setIsWatermarkModalOpen(false); }} className="px-4 py-2 text-xs font-bold text-slate-500">Clear</button><button onClick={() => setIsWatermarkModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Apply</button></div>
          </div>
        </div>
      )}
      {isSignModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className={`w-[500px] rounded-2xl p-6 shadow-2xl ${isDarkMode ? 'bg-[#252526] border border-[#444]' : 'bg-white'}`}>
             <h3 className="text-lg font-bold mb-4">Draw Signature</h3>
             <div className="border border-slate-300 rounded-xl bg-slate-50 h-48 mb-4 overflow-hidden relative"><canvas ref={signCanvasRef} width={500} height={200} onMouseDown={(e) => { isDrawingSign.current = true; const ctx = signCanvasRef.current?.getContext('2d'); ctx?.beginPath(); ctx?.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }} onMouseMove={(e) => { if(isDrawingSign.current) { const ctx = signCanvasRef.current?.getContext('2d'); if(ctx) { ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke(); }}} onMouseUp={() => isDrawingSign.current = false} className="w-full h-full cursor-crosshair" /></div>
             <div className="flex justify-end gap-2"><button onClick={() => signCanvasRef.current?.getContext('2d')?.clearRect(0,0,500,200)} className="px-4 py-2 text-xs font-bold text-slate-500">Clear</button><button onClick={() => { const dataUrl = signCanvasRef.current?.toDataURL(); if(dataUrl) { const newEl: EditorElement = { id: Date.now().toString(), pageId: pageSequence[currentPageIndex].id, type: 'image', x: 50, y: 50, width: 150, height: 75, src: dataUrl, color: '#000', fontSize: 16, opacity: 1, strokeWidth: 0, rotation: 0 }; setElements(prev => [...prev, newEl]); setSelectedId(newEl.id); saveToHistory([...elements, newEl]); } setIsSignModalOpen(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Use Signature</button></div>
          </div>
        </div>
      )}
    </div>
  );
};