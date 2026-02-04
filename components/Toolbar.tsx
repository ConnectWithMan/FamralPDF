import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  FileUp,
  MessageSquare,
  Home
} from 'lucide-react';

interface ToolbarProps {
  scale: number;
  setScale: (scale: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  showChatToggle?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  scale,
  setScale,
  onUpload,
  fileName,
  currentPage,
  totalPages,
  setPage,
  toggleSidebar,
  isSidebarOpen,
  showChatToggle = true
}) => {
  return (
    <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-2 md:px-4 shadow-sm z-20 shrink-0 relative">
      
      {/* Left: Branding & File */}
      <div className="flex items-center gap-2 md:gap-4 min-w-fit">
        <Link to="/" className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors" title="Back to Dashboard">
            <Home size={20} />
        </Link>
        <div className="flex items-center gap-2 text-brand-600 font-bold text-lg md:text-xl">
          <div className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">F</div>
          <span className="hidden md:inline text-slate-900">Famral <span className="text-brand-600">PDF</span></span>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1 md:mx-2"></div>

        <div className="flex items-center gap-2">
            {fileName && (
              <span className="text-sm font-medium text-slate-700 truncate max-w-[100px] md:max-w-[150px] hidden sm:inline-block" title={fileName}>
                {fileName}
              </span>
            )}
            
            <label className={`flex items-center gap-2 px-2 md:px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors shadow-sm ${
                fileName 
                ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50' 
                : 'bg-brand-600 hover:bg-brand-700 text-white'
            }`}>
              <FileUp size={16} />
              <span className="hidden sm:inline">{fileName ? 'Replace' : 'Upload PDF'}</span>
              <span className="sm:hidden">{fileName ? 'Replace' : 'Upload'}</span>
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={onUpload}
                onClick={(e) => (e.currentTarget.value = '')} 
              />
            </label>
        </div>
      </div>

      {/* Center: Zoom Controls - Hidden on mobile */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-50 rounded-md border border-slate-200 px-2 py-1 shadow-sm hidden md:flex">
          <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-1 hover:bg-slate-200 rounded text-slate-600">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono w-12 text-center select-none">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-1 hover:bg-slate-200 rounded text-slate-600">
            <ZoomIn size={16} />
          </button>
      </div>

      {/* Right: Navigation & Chat Toggle */}
      <div className="flex items-center gap-2 md:gap-3">
        {totalPages > 0 && (
           <div className="flex items-center gap-1 text-sm text-slate-600 mx-1 md:mx-2">
             <button 
               disabled={currentPage <= 1}
               onClick={() => setPage(currentPage - 1)}
               className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
             >
                <ChevronLeft size={16} />
             </button>
             <span className="select-none text-xs md:text-sm">{currentPage} / {totalPages}</span>
             <button 
               disabled={currentPage >= totalPages}
               onClick={() => setPage(currentPage + 1)}
               className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
             >
                <ChevronRight size={16} />
             </button>
           </div>
        )}

        {showChatToggle && toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors shadow-sm text-sm font-medium ${
              isSidebarOpen 
                ? 'bg-brand-600 text-white hover:bg-brand-700' 
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">{isSidebarOpen ? 'Close' : 'Chat'}</span>
          </button>
        )}
      </div>
    </div>
  );
};