import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ZoomLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ZoomLightbox: React.FC<ZoomLightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button
        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all focus:outline-none"
        onClick={onClose}
        title="Cerrar (Esc)"
      >
        <X size={24} />
      </button>
      <img
        src={imageUrl}
        alt="Ampliación"
        className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl rounded-xl animate-in zoom-in duration-300 select-none"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
