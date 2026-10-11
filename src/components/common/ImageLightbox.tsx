import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';

export interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  onClose,
  altText = 'Foto ampliada',
}) => {
  useEffect(() => {
    if (!imageUrl) return;

    // Prevent body scrolling while lightbox is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Intercept Escape key at capture phase so it doesn't trigger parent modal close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={altText}
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 md:p-12 cursor-zoom-out animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Controls Toolbar */}
      <div
        className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm cursor-pointer"
          title="Abrir imagen original en nueva pestaña"
        >
          <ExternalLink size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
        </a>
        <button
          type="button"
          className="p-2.5 sm:p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors backdrop-blur-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
          onClick={onClose}
          title="Cerrar imagen (Esc)"
        >
          <X size={22} className="sm:w-6 sm:h-6 w-5 h-5" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-[95vw] max-h-[85vh] md:max-h-[88vh] object-contain shadow-2xl rounded-xl animate-in zoom-in-95 duration-200"
        />
      </div>

      {/* Bottom Hint Badge */}
      <div className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5 sm:py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 pointer-events-none">
        <p className="text-white/80 text-[11px] sm:text-xs font-medium">
          Haz clic fuera o presiona Esc para cerrar
        </p>
      </div>
    </div>,
    document.body
  );
};

export default ImageLightbox;
