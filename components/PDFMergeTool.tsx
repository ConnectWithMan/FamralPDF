import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Link } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Merge, 
  Download,
  Home,
  Loader2,
  Files
} from 'lucide-react';

interface PdfFile {
  id: string;
  file: File;
}

export const PDFMergeTool: React.FC = () => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === files.length - 1)
    ) return;

    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
  };

  const mergePdfs = async () => {
    if (files.length === 0) return;
    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-document-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please ensure all files are valid PDFs.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 shadow-sm z-20 shrink-0">
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
              <span>Merge PDFs</span>
            </div>
         </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Upload Area */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-brand-400 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-12 h-12 mb-4 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Upload size={24} />
                        </div>
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-brand-600">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-slate-400">PDF files only</p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept=".pdf" 
                        onChange={handleFileUpload}
                    />
                </label>
            </div>

            {/* File List */}
            <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Files size={16} className="text-slate-400" />
                    Selected Files ({files.length})
                </h3>
                
                {files.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        No files selected. Upload PDFs to start merging.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {files.map((file, index) => (
                            <li key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                        <FileText size={16} />
                                    </div>
                                    <span className="text-sm text-slate-700 truncate font-medium">{file.file.name}</span>
                                    <span className="text-xs text-slate-400 shrink-0">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => moveFile(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Move Up"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button 
                                        onClick={() => moveFile(index, 'down')}
                                        disabled={index === files.length - 1}
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Move Down"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button 
                                        onClick={() => removeFile(file.id)}
                                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                        title="Remove"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                    onClick={() => setFiles([])}
                    disabled={files.length === 0}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors"
                >
                    Clear All
                </button>
                <button 
                    onClick={mergePdfs}
                    disabled={files.length < 2 || isMerging}
                    className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                >
                    {isMerging ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Merging...
                        </>
                    ) : (
                        <>
                            <Merge size={16} />
                            Merge {files.length} PDF{files.length !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </div>
        </div>

        <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
                Secure Client-Side Processing. Your files never leave your device.
            </p>
        </div>
      </div>
    </div>
  );
};