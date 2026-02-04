import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Toolbar } from './Toolbar';
import { AIChatSidebar } from './AIChatSidebar';
import { Loader2 } from 'lucide-react';

// Configure PDF.js worker
// Using unpkg as it reliably hosts the build artifacts for specific versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const PDFChatTool: React.FC = () => {
  // --- State ---
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default
  const [fullDocumentText, setFullDocumentText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset UI state for new file
    setIsLoading(true);
    setFileName(file.name);
    setFullDocumentText("");
    setPdfDoc(null); 

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      try {
        const loadedPdf = await pdfjsLib.getDocument(typedarray).promise;
        setPdfDoc(loadedPdf);
        setCurrentPage(1);
        setIsLoading(false);
        
        // Start text extraction in background
        extractAllText(loadedPdf);
        
      } catch (err) {
        console.error("Error loading PDF", err);
        alert("Failed to load PDF.");
        setIsLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
    
    // Reset input value so same file can be selected again if needed
    e.target.value = '';
  };

  const extractAllText = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    setExtractingText(true);
    try {
        let extractedText = "";
        // Limit to first 50 pages to prevent browser hanging on huge docs for this demo
        // In production, this would be done via a worker or more efficient chunks
        const maxPages = Math.min(pdf.numPages, 50);
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            extractedText += `--- Page ${i} ---\n${pageText}\n\n`;
        }
        
        setFullDocumentText(extractedText);
        // Automatically open sidebar when text is ready
        setIsSidebarOpen(true);
    } catch (error) {
        console.error("Error extracting text", error);
    } finally {
        setExtractingText(false);
    }
  };

  // Render PDF Page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any pending render task to avoid "Cannot use the same canvas..." error
    if (renderTaskRef.current) {
        try {
            renderTaskRef.current.cancel();
        } catch (error) {
            // Cancellation is expected, ignore error
        }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      // Auto-calculate scale if needed, but keeping simple for now
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
        
        // Store the render task reference
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      }
    } catch (error: any) {
      // Ignore errors caused by cancellation
      if (error.name === 'RenderingCancelledException') {
        return;
      }
      console.error("Render error", error);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
    // Cleanup on unmount
    return () => {
        if (renderTaskRef.current) {
            try {
                renderTaskRef.current.cancel();
            } catch (e) {
                // ignore
            }
        }
    };
  }, [renderPage]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden">
      <Toolbar 
        scale={scale}
        setScale={setScale}
        onUpload={handleFileUpload}
        fileName={fileName}
        currentPage={currentPage}
        totalPages={pdfDoc?.numPages || 0}
        setPage={setCurrentPage}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex-1 relative flex overflow-hidden">
        
        {/* Main Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-auto flex justify-center p-4 md:p-8 bg-slate-200/50"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
               <div className="flex flex-col items-center gap-2 text-brand-600">
                 <Loader2 className="animate-spin" size={32} />
                 <span className="text-sm font-medium">Loading PDF...</span>
               </div>
            </div>
          )}

          {!pdfDoc && !isLoading && (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-24 h-32 border-2 border-dashed border-slate-300 rounded-lg mb-4 flex items-center justify-center bg-slate-50 shadow-sm">
                   <div className="text-4xl text-slate-300">+</div>
                </div>
                <p className="text-lg font-medium text-slate-600">No PDF Loaded</p>
                <p className="text-sm">Upload a document to chat with it</p>
             </div>
          )}

          {pdfDoc && (
            <div 
              className="relative shadow-xl border border-slate-200 bg-white transition-all duration-200 ease-out"
              style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}
            >
              <canvas ref={canvasRef} className="block" />
            </div>
          )}
          
          {/* Extraction Indicator */}
          {extractingText && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1.5 px-4 rounded-full shadow-lg flex items-center gap-2 z-40 whitespace-nowrap">
                <Loader2 size={12} className="animate-spin" />
                Analyzing document text...
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        {isSidebarOpen && (
            <div className="absolute inset-0 z-30 md:static md:inset-auto md:z-auto flex">
                <AIChatSidebar 
                  isOpen={isSidebarOpen} 
                  onClose={() => setIsSidebarOpen(false)}
                  documentText={fullDocumentText}
                  fileName={fileName}
                />
            </div>
        )}
      </div>
    </div>
  );
};