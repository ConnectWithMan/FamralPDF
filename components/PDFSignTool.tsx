import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  PenTool, 
  Download, 
  X, 
  Image as ImageIcon, 
  Loader2
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface SignatureObject {
  id: string;
  image: string; // Data URL
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PDFSignTool: React.FC = () => {
  // --- State ---
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Signature State
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [signatures, setSignatures] = useState<SignatureObject[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Dragging & Resizing State ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeState, setResizeState] = useState<{
    active: boolean;
    direction: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setPdfDoc(null);
    setSignatures([]);
    setSelectedSignatureId(null);

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const arrayBuffer = this.result as ArrayBuffer;
      const bufferForSaving = arrayBuffer.slice(0);
      setFileBytes(bufferForSaving);

      const typedarray = new Uint8Array(arrayBuffer);
      try {
        const loadedPdf = await pdfjsLib.getDocument(typedarray).promise;
        setPdfDoc(loadedPdf);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading PDF", err);
        alert("Failed to load PDF.");
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      }
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error("Render error", error);
      }
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
    return () => {
       if (renderTaskRef.current) {
         try { renderTaskRef.current.cancel(); } catch(e) {}
       }
    };
  }, [renderPage]);

  // --- Signature Drawing Logic ---

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearDrawingCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const newSig: SignatureObject = {
        id: Date.now().toString(),
        image: dataUrl,
        x: 50 + (signatures.length * 20),
        y: 50 + (signatures.length * 20),
        width: 200,
        height: 100
      };
      setSignatures([...signatures, newSig]);
      setSelectedSignatureId(newSig.id);
      setIsDrawingModalOpen(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newSig: SignatureObject = {
            id: Date.now().toString(),
            image: ev.target?.result as string,
            x: 50 + (signatures.length * 20),
            y: 50 + (signatures.length * 20),
            width: 200,
            height: 100
        };
        setSignatures([...signatures, newSig]);
        setSelectedSignatureId(newSig.id);
        setIsDrawingModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Interaction Logic (Drag & Resize) ---

  const handleDragStart = (e: React.MouseEvent, id: string) => {
     e.stopPropagation();
     const sig = signatures.find(s => s.id === id);
     if (!sig) return;

     setSelectedSignatureId(id);
     setIsDragging(true);
     setDragOffset({
        x: e.clientX - sig.x,
        y: e.clientY - sig.y
     });
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string, id: string) => {
    e.stopPropagation();
    const sig = signatures.find(s => s.id === id);
    if (!sig) return;
    
    setSelectedSignatureId(id);
    setResizeState({
        active: true,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: sig.width,
        startHeight: sig.height,
        startLeft: sig.x,
        startTop: sig.y
    });
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
      const activeSig = signatures.find(s => s.id === selectedSignatureId);
      if (!activeSig) return;

      // Handle Dragging
      if (isDragging) {
          e.preventDefault();
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
          
          setSignatures(prev => prev.map(s => 
            s.id === selectedSignatureId ? { ...s, x: newX, y: newY } : s
          ));
          return;
      }

      // Handle Resizing
      if (resizeState?.active) {
        e.preventDefault();
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;

        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newX = resizeState.startLeft;
        let newY = resizeState.startTop;

        if (resizeState.direction.includes('e')) {
            newWidth = Math.max(30, resizeState.startWidth + deltaX);
        }
        if (resizeState.direction.includes('w')) {
            const proposedWidth = resizeState.startWidth - deltaX;
            if (proposedWidth >= 30) {
                newWidth = proposedWidth;
                newX = resizeState.startLeft + deltaX;
            }
        }
        if (resizeState.direction.includes('s')) {
            newHeight = Math.max(30, resizeState.startHeight + deltaY);
        }
        if (resizeState.direction.includes('n')) {
             const proposedHeight = resizeState.startHeight - deltaY;
             if (proposedHeight >= 30) {
                 newHeight = proposedHeight;
                 newY = resizeState.startTop + deltaY;
             }
        }

        setSignatures(prev => prev.map(s => 
            s.id === selectedSignatureId ? { ...s, x: newX, y: newY, width: newWidth, height: newHeight } : s
        ));
      }
  };

  const handleContainerMouseUp = () => {
      setIsDragging(false);
      setResizeState(null);
  };

  const handleBackgroundClick = () => {
      setSelectedSignatureId(null);
  };

  const handleDeleteSignature = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSignatures(prev => prev.filter(s => s.id !== id));
      if (selectedSignatureId === id) setSelectedSignatureId(null);
  };

  // --- Save / Embed Logic ---
  const handleDownload = async () => {
    if (!fileBytes || signatures.length === 0 || !pdfDoc) return;
    setIsSaving(true);
    
    try {
      const pdfDocLib = await PDFDocument.load(fileBytes);
      const pages = pdfDocLib.getPages();
      const page = pages[currentPage - 1]; // pdf-lib is 0-indexed

      for (const sig of signatures) {
          const signatureImage = await pdfDocLib.embedPng(sig.image);
          
          // Calculate scaled dimensions
          const pdfWidth = sig.width / scale;
          const pdfHeight = sig.height / scale;
          const pdfPageHeight = page.getHeight();
          const pdfX = sig.x / scale;
          const pdfY = pdfPageHeight - (sig.y / scale) - pdfHeight;

          page.drawImage(signatureImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
          });
      }

      const pdfBytes = await pdfDocLib.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed-${fileName || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
        console.error("Error saving PDF", error);
        alert("Failed to save signed PDF.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden" 
      onMouseMove={handleContainerMouseMove} 
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={handleContainerMouseUp}
    >
       {/* Header */}
       <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-2 md:px-4 shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/" className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="Back to Dashboard">
                <Home size={20} />
            </Link>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-lg md:text-xl">
              <img 
                src="https://www.famral.com/favicon.png" 
                alt="Logo" 
                className="w-6 h-6 md:w-8 md:h-8 object-contain"
              />
              <span className="hidden md:inline">Sign PDF</span>
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-1 md:mx-2"></div>

             <label className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-md cursor-pointer hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium">
                <Upload size={16} />
                <span className="hidden sm:inline">{fileName ? 'Replace' : 'Upload PDF'}</span>
                <span className="sm:hidden">Upload</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} onClick={(e) => (e.currentTarget.value = '')} />
             </label>
          </div>

          <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1 mr-2 hidden sm:flex">
                 <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={16}/></button>
                 <span className="text-xs font-mono w-10 text-center select-none">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={16}/></button>
              </div>

              {pdfDoc && (
                 <div className="flex items-center gap-1 mr-4">
                     <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
                     <span className="text-sm font-medium select-none">{currentPage} / {pdfDoc.numPages}</span>
                     <button onClick={() => setCurrentPage(prev => Math.min(pdfDoc.numPages, prev + 1))} disabled={currentPage >= pdfDoc.numPages} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronRight size={18}/></button>
                 </div>
              )}
          </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 relative flex overflow-hidden">
          <div className="flex-1 overflow-auto bg-slate-200/50 flex justify-center p-4 md:p-8 relative" onClick={handleBackgroundClick}>
             
             {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-brand-600" size={32} />
                        <span className="text-sm font-medium text-slate-600">Loading Document...</span>
                    </div>
                </div>
             )}

             {!pdfDoc && !isLoading && (
                <div className="flex flex-col items-center justify-center text-slate-400 mt-20">
                     <div className="w-24 h-32 border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center bg-slate-50">
                        <PenTool size={32} className="opacity-20" />
                     </div>
                     <p className="text-lg font-medium text-slate-600">No PDF Loaded</p>
                     <p className="text-sm">Upload a document to start signing</p>
                </div>
             )}

             {pdfDoc && (
                 <div 
                    ref={containerRef}
                    className="relative shadow-xl border border-slate-200 bg-white"
                    style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}
                    onClick={(e) => e.stopPropagation()} // Prevent deselection when clicking within document bounds
                 >
                     <canvas ref={canvasRef} className="block" />
                     
                     {signatures.map((sig) => {
                         const isSelected = sig.id === selectedSignatureId;
                         return (
                            <div 
                                key={sig.id}
                                onMouseDown={(e) => handleDragStart(e, sig.id)}
                                className={`absolute group border-2 transition-colors 
                                    ${isSelected ? 'border-brand-500 z-20' : 'border-transparent hover:border-brand-300 z-10'}
                                    ${isDragging && isSelected ? 'cursor-grabbing' : 'cursor-grab'}
                                `}
                                style={{ 
                                    left: sig.x, 
                                    top: sig.y, 
                                    width: sig.width,
                                    height: sig.height,
                                }}
                            >
                                <img src={sig.image} alt="Signature" className="w-full h-full object-contain pointer-events-none select-none" />
                                
                                {/* Delete Button */}
                                {(isSelected || !isDragging) && (
                                    <button 
                                        onClick={(e) => handleDeleteSignature(sig.id, e)}
                                        className={`absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center shadow-sm hover:bg-red-600 z-30 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}
                                        title="Remove Signature"
                                    >
                                        <X size={14} />
                                    </button>
                                )}

                                {/* Resize Handles - Only visible when selected */}
                                {isSelected && ['nw', 'ne', 'sw', 'se'].map((dir) => (
                                    <div
                                        key={dir}
                                        onMouseDown={(e) => handleResizeStart(e, dir, sig.id)}
                                        className={`absolute w-3 h-3 bg-white border border-brand-500 rounded-full z-20 block
                                            ${dir === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                            ${dir === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                                            ${dir === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                            ${dir === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                                        `}
                                    />
                                ))}
                            </div>
                         );
                     })}
                 </div>
             )}
          </div>

          {pdfDoc && (
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 w-max max-w-full px-4">
                <button 
                    onClick={() => setIsDrawingModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-transform hover:-translate-y-1 active:translate-y-0 font-medium whitespace-nowrap"
                >
                    <PenTool size={18} />
                    Add Signature
                </button>

                {signatures.length > 0 && (
                    <button 
                        onClick={handleDownload}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-transform hover:-translate-y-1 active:translate-y-0 font-medium disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Download Signed PDF
                    </button>
                )}
             </div>
          )}
       </div>

       {/* Signature Modal */}
       {isDrawingModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                       <h3 className="font-bold text-lg text-slate-900">Create Signature</h3>
                       <button onClick={() => setIsDrawingModalOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                           <X size={20} />
                       </button>
                   </div>
                   
                   <div className="p-6">
                       <div className="border border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden touch-none h-48">
                           <canvas 
                                ref={drawingCanvasRef}
                                width={500}
                                height={200}
                                className="w-full h-full cursor-crosshair"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                           />
                           <button 
                                onClick={clearDrawingCanvas}
                                className="absolute top-2 right-2 text-xs px-2 py-1 bg-white/90 border border-slate-200 rounded hover:text-red-500 transition-colors shadow-sm"
                           >
                               Clear
                           </button>
                           <div className="absolute bottom-2 left-0 w-full text-center text-xs text-slate-400 pointer-events-none">
                                Draw your signature here
                           </div>
                       </div>
                       
                       <div className="mt-4 flex flex-col gap-3">
                           <div className="flex items-center gap-2">
                               <div className="h-px bg-slate-200 flex-1"></div>
                               <span className="text-xs text-slate-400">OR</span>
                               <div className="h-px bg-slate-200 flex-1"></div>
                           </div>
                           <label className="flex items-center justify-center gap-2 w-full py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                               <ImageIcon size={16} />
                               Upload Image
                               <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleSignatureUpload} />
                           </label>
                       </div>
                   </div>

                   <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                       <button onClick={() => setIsDrawingModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                       <button onClick={saveSignature} className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 shadow-sm">Use Signature</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};