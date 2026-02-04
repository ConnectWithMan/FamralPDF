import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  Download, 
  FileText, 
  Settings, 
  CheckCircle, 
  Loader2,
  Minimize2,
  ArrowRight
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type CompressionLevel = 'extreme' | 'recommended' | 'less';

export const PDFCompressTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [compressedPdfBytes, setCompressedPdfBytes] = useState<Uint8Array | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileSize(selectedFile.size);
      setCompressedPdfBytes(null);
      setCompressedSize(0);
      setProgress(0);
    }
    e.target.value = '';
  };

  const getCompressionSettings = (level: CompressionLevel) => {
    switch (level) {
      case 'extreme': return { scale: 1.0, quality: 0.3 };
      case 'recommended': return { scale: 1.5, quality: 0.6 };
      case 'less': return { scale: 2.0, quality: 0.8 };
      default: return { scale: 1.5, quality: 0.6 };
    }
  };

  const compressPDF = async () => {
    if (!file) return;
    setIsCompressing(true);
    setProgress(0);

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(new Uint8Array(fileBuffer)).promise;
      const totalPages = pdf.numPages;
      
      const newPdf = await PDFDocument.create();
      const { scale, quality } = getCompressionSettings(compressionLevel);

      for (let i = 1; i <= totalPages; i++) {
        // Update progress
        setProgress(Math.round(((i - 1) / totalPages) * 100));

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        // Render to canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) throw new Error('Could not create canvas context');

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convert to JPEG with quality setting
        const imgDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Embed in new PDF
        const img = await newPdf.embedJpg(imgDataUrl);
        const newPage = newPdf.addPage([img.width / scale, img.height / scale]); // Restore original size logic relative to scale
        
        // Draw image effectively filling the page (since we scaled up for quality, we scale down for placement if needed, but here we matched dimensions)
        // Actually, if we scale the viewport, the image dimensions are scaled. 
        // We want the PDF page to be the original size (ish) or the scaled size? 
        // Usually keeping visual size is good.
        // Let's make the PDF page the size of the image to ensure high fidelity rendering.
        
        newPage.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width / scale,
          height: img.height / scale,
        });
      }

      const pdfBytes = await newPdf.save();
      setCompressedPdfBytes(pdfBytes);
      setCompressedSize(pdfBytes.byteLength);
      setProgress(100);
    } catch (error) {
      console.error("Compression error:", error);
      alert("An error occurred while compressing the PDF.");
    } finally {
      setIsCompressing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = () => {
    if (!compressedPdfBytes) return;
    const blob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compressed-${file?.name || 'document.pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 shadow-sm z-20 shrink-0">
         <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="Back to Dashboard">
                <Home size={20} />
            </Link>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
              <img 
                src="https://www.famral.com/favicon.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
              />
              <span>Compress PDF</span>
            </div>
         </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col items-center">
        
        {/* Main Card */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Upload Section */}
            {!file ? (
                <div className="p-12 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-6">
                        <Minimize2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Reduce File Size</h2>
                    <p className="text-slate-600 mb-8 max-w-md">Optimize your PDF documents while maintaining quality. Perfect for uploading to portals with size limits.</p>
                    
                    <label className="flex items-center gap-3 px-8 py-4 bg-brand-600 text-white rounded-full font-semibold text-lg cursor-pointer hover:bg-brand-700 transition-transform hover:-translate-y-1 shadow-lg">
                        <Upload size={24} />
                        Select PDF File
                        <input 
                            type="file" 
                            accept=".pdf" 
                            className="hidden" 
                            onChange={handleFileUpload} 
                        />
                    </label>
                </div>
            ) : (
                <div className="p-8">
                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{file.name}</h3>
                                <p className="text-sm text-slate-500">{formatSize(fileSize)}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setFile(null)} 
                            className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Change File
                        </button>
                    </div>

                    {!compressedPdfBytes && !isCompressing && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <button 
                                onClick={() => setCompressionLevel('extreme')}
                                className={`p-6 rounded-xl border-2 text-left transition-all ${
                                    compressionLevel === 'extreme' 
                                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' 
                                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                }`}
                            >
                                <h4 className="font-bold text-slate-900 mb-2">Extreme</h4>
                                <p className="text-sm text-slate-500 mb-4">Low quality, high compression. Good for text documents.</p>
                                <div className="text-xs font-medium text-brand-600 bg-white inline-block px-2 py-1 rounded border border-brand-200">
                                    ~72 DPI
                                </div>
                            </button>

                            <button 
                                onClick={() => setCompressionLevel('recommended')}
                                className={`p-6 rounded-xl border-2 text-left transition-all ${
                                    compressionLevel === 'recommended' 
                                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' 
                                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                }`}
                            >
                                <h4 className="font-bold text-slate-900 mb-2">Recommended</h4>
                                <p className="text-sm text-slate-500 mb-4">Good quality, good compression. Best for most files.</p>
                                <div className="text-xs font-medium text-brand-600 bg-white inline-block px-2 py-1 rounded border border-brand-200">
                                    ~108 DPI
                                </div>
                            </button>

                            <button 
                                onClick={() => setCompressionLevel('less')}
                                className={`p-6 rounded-xl border-2 text-left transition-all ${
                                    compressionLevel === 'less' 
                                    ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' 
                                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                }`}
                            >
                                <h4 className="font-bold text-slate-900 mb-2">Less Compression</h4>
                                <p className="text-sm text-slate-500 mb-4">High quality, less compression. Good for images.</p>
                                <div className="text-xs font-medium text-brand-600 bg-white inline-block px-2 py-1 rounded border border-brand-200">
                                    ~144 DPI
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Action Area */}
                    <div className="flex flex-col items-center justify-center">
                        {isCompressing ? (
                            <div className="w-full max-w-md text-center">
                                <div className="mb-4 flex justify-between text-sm font-medium text-slate-600">
                                    <span>Compressing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-brand-600 transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="mt-4 text-xs text-slate-400">Processing pages, please wait...</p>
                            </div>
                        ) : compressedPdfBytes ? (
                            <div className="text-center w-full bg-green-50 border border-green-200 rounded-xl p-8">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Compression Complete!</h3>
                                <div className="flex items-center justify-center gap-4 text-sm mb-8">
                                    <span className="text-slate-500 line-through">{formatSize(fileSize)}</span>
                                    <ArrowRight size={16} className="text-slate-400" />
                                    <span className="font-bold text-green-600">{formatSize(compressedSize)}</span>
                                    <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                        -{Math.round(((fileSize - compressedSize) / fileSize) * 100)}%
                                    </span>
                                </div>
                                
                                <button 
                                    onClick={downloadFile}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all mx-auto"
                                >
                                    <Download size={20} />
                                    Download Compressed PDF
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={compressPDF}
                                className="flex items-center gap-2 px-8 py-4 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                            >
                                <Settings size={20} />
                                Compress PDF
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center px-4">
            <div>
                <h4 className="font-semibold text-slate-900 mb-2">Browser-Based</h4>
                <p className="text-sm text-slate-500">All compression happens securely in your browser. No files are uploaded to any server.</p>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 mb-2">Adjustable Quality</h4>
                <p className="text-sm text-slate-500">Choose between extreme compression for small files or high quality for better readability.</p>
            </div>
            <div>
                <h4 className="font-semibold text-slate-900 mb-2">Fast & Free</h4>
                <p className="text-sm text-slate-500">Optimize your documents in seconds without any limits or watermarks.</p>
            </div>
        </div>

      </div>
    </div>
  );
};