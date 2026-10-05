import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const formatValueToHtml = (val: string): string => {
  if (!val) return '';
  if (/<[a-z][\s\S]*>/i.test(val)) {
    return val;
  }
  return val.replace(/\r\n|\r|\n/g, '<br>');
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Escribe aquí tu análisis o descripción...',
  minHeight = '140px',
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });

  const updateActiveStates = useCallback(() => {
    if (!editorRef.current || !document.queryCommandState) return;
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const formatted = formatValueToHtml(value);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [value, isFocused]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isFocused) {
        updateActiveStates();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isFocused, updateActiveStates]);

  const execCommand = (command: string, val: string | null = null) => {
    document.execCommand(command, false, val || undefined);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  };

  return (
    <div
      className={`border rounded-xl bg-white transition-all overflow-hidden flex flex-col ${
        isFocused
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 text-slate-600 select-none">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('bold');
          }}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeStates.bold
              ? 'bg-brand-500 text-white shadow-sm'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('italic');
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            activeStates.italic
              ? 'bg-brand-500 text-white shadow-sm'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('underline');
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            activeStates.underline
              ? 'bg-brand-500 text-white shadow-sm'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Subrayado (Ctrl+U)"
        >
          <Underline size={15} />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertUnorderedList');
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            activeStates.unorderedList
              ? 'bg-brand-500 text-white shadow-sm'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Lista con viñetas"
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertOrderedList');
          }}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            activeStates.orderedList
              ? 'bg-brand-500 text-white shadow-sm'
              : 'hover:bg-slate-200 text-slate-700'
          }`}
          title="Lista numerada"
        >
          <ListOrdered size={15} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="p-3.5 outline-none text-slate-800 text-sm leading-relaxed overflow-y-auto max-h-[450px] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none prose prose-sm max-w-none"
      />
    </div>
  );
};

export default RichTextEditor;
