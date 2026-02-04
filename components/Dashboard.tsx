import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Zap, 
  Shield, 
  ArrowRight, 
  Merge, 
  PenTool, 
  Edit, 
  Minimize2,
  CheckCircle2,
  Layers,
  Lock
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="h-screen w-full bg-white overflow-y-auto custom-scrollbar font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
                F
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Famral <span className="text-brand-600">PDF Editor</span></span>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
                <a href="#tools" className="hover:text-brand-600 transition-colors">Tools</a>
              </div>
              <Link 
                to="/edit" 
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-full text-white bg-slate-900 hover:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Launch Editor
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            v2.0: Now with Page Organization & Security
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            The Ultimate <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">SaaS PDF Editor</span>
          </h1>
          
          <p className="mt-4 text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Edit text, organize pages, sign documents, and secure your files. The complete PDF toolkit for professionals, directly in your browser.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              to="/edit" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full text-white bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              Start Editing Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="#tools"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-full text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all transform hover:-translate-y-1"
            >
              Explore All Tools
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>No installation required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>100% Client-Side Secure</span>
            </div>
          </div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none -z-10">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>
      </div>

      {/* Tools Section */}
      <div id="tools" className="py-24 bg-slate-50/50 border-y border-slate-200 relative">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Powerful PDF Tools</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Everything you need to manage your documents efficiently. Simple, fast, and professional.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Tool Cards */}
                {[
                  { 
                    to: "/edit", 
                    icon: Edit, 
                    color: "blue", 
                    title: "Advanced Editor", 
                    desc: "Edit text, draw, add shapes, images, and reorder pages." 
                  },
                  { 
                    to: "/chat", 
                    icon: MessageSquare, 
                    color: "brand", 
                    title: "AI Assistant", 
                    desc: "Chat with your PDF. Summarize content and ask questions instantly." 
                  },
                  { 
                    to: "/sign", 
                    icon: PenTool, 
                    color: "green", 
                    title: "Sign PDF", 
                    desc: "Create and apply legally binding electronic signatures." 
                  },
                  { 
                    to: "/merge", 
                    icon: Merge, 
                    color: "purple", 
                    title: "Merge PDFs", 
                    desc: "Combine multiple files into a single document." 
                  },
                  { 
                    to: "/compress", 
                    icon: Minimize2, 
                    color: "orange", 
                    title: "Compress PDF", 
                    desc: "Reduce file size while maintaining visual quality." 
                  },
                  { 
                    to: "/edit", 
                    icon: Layers, 
                    color: "rose", 
                    title: "Organize Pages", 
                    desc: "Rearrange, rotate, and delete pages within the editor." 
                  },
                ].map((tool, index) => (
                  <Link 
                    key={index} 
                    to={tool.to} 
                    className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-brand-100 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                  >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300
                        ${tool.color === 'brand' ? 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white' : ''}
                        ${tool.color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : ''}
                        ${tool.color === 'green' ? 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white' : ''}
                        ${tool.color === 'purple' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : ''}
                        ${tool.color === 'orange' ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white' : ''}
                        ${tool.color === 'rose' ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' : ''}
                      `}>
                          <tool.icon size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-600 transition-colors">{tool.title}</h3>
                      <p className="text-slate-500 leading-relaxed">{tool.desc}</p>
                      
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 text-brand-600">
                        <ArrowRight size={24} />
                      </div>
                  </Link>
                ))}
            </div>
         </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-slate-900">Famral Advantage</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-blue-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Fast & Responsive</h3>
              <p className="text-slate-600 leading-relaxed">
                Engineered for speed. Open, edit, and save large PDF files instantly without lag.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Shield size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Secure & Private</h3>
              <p className="text-slate-600 leading-relaxed">
                All processing happens locally in your browser. Add passwords to secure sensitive data.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Layers size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Organize & Edit</h3>
              <p className="text-slate-600 leading-relaxed">
                Reorder pages, rotate, delete, and annotate in one unified, powerful interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};