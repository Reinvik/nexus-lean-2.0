import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  variant?: 'dark' | 'light';
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}

const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  variant = 'dark',
  className,
  bodyClassName,
  headerClassName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl sm:rounded-2xl z-10 sm:my-6 my-0 flex flex-col max-h-[96dvh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200',
          variant === 'light'
            ? 'bg-white border-t sm:border border-slate-200 text-slate-900 shadow-2xl'
            : 'bg-[#0B1120] border-t sm:border border-slate-800 text-white shadow-2xl',
          MAX_WIDTHS[maxWidth],
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-start justify-between p-4 sm:p-5 border-b shrink-0',
            variant === 'light'
              ? 'bg-slate-50/95 border-slate-200 text-slate-900'
              : 'bg-slate-900/40 border-slate-800/80 text-white',
            headerClassName
          )}
        >
          <div>
            <h3
              className={cn(
                'text-base sm:text-lg font-bold font-sans',
                variant === 'light' ? 'text-slate-900' : 'text-white'
              )}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className={cn(
                  'text-xs mt-0.5',
                  variant === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl transition-colors',
              variant === 'light'
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            )}
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          className={cn(
            'p-4 sm:p-6 overflow-y-auto flex-1',
            variant === 'light' ? 'bg-slate-50/40' : 'bg-transparent',
            bodyClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
