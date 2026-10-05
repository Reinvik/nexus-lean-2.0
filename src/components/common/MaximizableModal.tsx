import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';

export interface MaximizableModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  titleIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  defaultMaxWidth?: string;
  startMaximized?: boolean;
}

export const MaximizableModal: React.FC<MaximizableModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  titleIcon,
  headerActions,
  footer,
  defaultMaxWidth = 'max-w-4xl',
  startMaximized = false,
}) => {
  const [isMaximized, setIsMaximized] = useState(startMaximized);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-0 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`
          bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out
          ${
            isMaximized
              ? 'w-full h-full rounded-none'
              : `w-full ${defaultMaxWidth} max-h-[95vh] rounded-2xl m-4`
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            {titleIcon && (
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                {titleIcon}
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-800 font-sans">{title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {headerActions}

            {/* Maximize/Minimize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={isMaximized ? 'Minimizar' : 'Maximizar'}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MaximizableModal;
