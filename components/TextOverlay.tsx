import React, { useRef, useEffect } from 'react';
import { TextBlock } from '../types';

interface TextOverlayProps {
  block: TextBlock;
  isSelected: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextBlock>) => void;
  onDelete: (id: string) => void;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  block,
  isSelected,
  scale,
  onSelect,
  onUpdate,
  onDelete
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Auto-resize textarea
  useEffect(() => {
    if(inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [block.text, block.width]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: block.x * scale,
        top: block.y * scale,
        width: block.width * scale,
        transformOrigin: 'top left',
        zIndex: 10,
      }}
      className={`group ${isSelected ? 'ring-2 ring-brand-500' : 'hover:ring-1 hover:ring-brand-300'} rounded transition-shadow`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      draggable={!isSelected}
      onDragStart={handleDragStart}
    >
      {/* Drag Handle (Top Left) */}
      {isSelected && (
          <div className="absolute -top-3 -left-3 w-6 h-6 bg-white border border-brand-500 rounded-full flex items-center justify-center cursor-move shadow-sm z-20">
              <div className="w-2 h-2 bg-brand-500 rounded-full" />
          </div>
      )}

      {/* Delete Handle (Top Right) */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm z-20 hover:bg-red-600"
        >
          &times;
        </button>
      )}

      <textarea
        ref={inputRef}
        value={block.text}
        onChange={(e) => onUpdate(block.id, { text: e.target.value })}
        className="w-full h-full bg-transparent resize-none focus:outline-none overflow-hidden"
        style={{
          fontSize: `${block.fontSize * scale}px`,
          fontFamily: block.fontFamily,
          fontWeight: block.isBold ? 'bold' : 'normal',
          fontStyle: block.isItalic ? 'italic' : 'normal',
          color: block.color,
          lineHeight: 1.2,
          minHeight: `${block.fontSize * scale * 1.2}px`
        }}
        placeholder="Type here..."
      />
    </div>
  );
};
