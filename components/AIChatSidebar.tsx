
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { chatWithContext } from '../services/geminiService';

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
  fileName: string | null;
}

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
  isOpen,
  onClose,
  documentText,
  fileName
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your AI document assistant. Upload a PDF and I can summarize it or answer any questions about its content.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear chat when new file is loaded (optional, but good practice if text changes)
  useEffect(() => {
    if (documentText) {
        setMessages([
            {
                id: 'new-doc-welcome',
                role: 'model',
                text: `I've analyzed "${fileName || 'the document'}". What would you like to know?`,
                timestamp: new Date()
            }
        ]);
    }
  }, [documentText, fileName]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await chatWithContext(messages, input, documentText);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
       setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
       }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: 'Chat cleared. How can I help you with the document?',
        timestamp: new Date()
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Sparkles size={18} className="text-purple-600" />
          <span>AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
            <button 
                onClick={clearChat} 
                className="p-1.5 hover:bg-slate-200 rounded text-slate-500" 
                title="Clear Chat"
            >
                <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded text-slate-500">
                <X size={18} />
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
        {!documentText && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-slate-400 mt-10">
            <FileText size={48} className="opacity-20" />
            <p className="text-sm font-medium">No document loaded</p>
            <p className="text-xs">Upload a PDF to start chatting with it.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={documentText ? "Ask about the document..." : "Upload a PDF first..."}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800"
            disabled={isLoading || !documentText}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !documentText}
            className="text-brand-600 disabled:text-slate-300 hover:text-brand-700 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">Powered by Gemini 3 Flash</span>
        </div>
      </div>
    </div>
  );
};
