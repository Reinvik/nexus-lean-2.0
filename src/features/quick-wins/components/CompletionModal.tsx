import React, { useState, useRef } from 'react';
import { CheckCircle, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface CompletionModalProps {
  isOpen: boolean;
  winId: string | null;
  onClose: () => void;
  onConfirm: (winId: string, comment: string, images: string[]) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  winId,
  onClose,
  onConfirm,
  onUploadImage,
}) => {
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !winId) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 5) {
      toast.error('Máximo 5 imágenes de evidencia');
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        setImages((prev) => [...prev, url]);
        toast.success('Foto de evidencia subida');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!comment.trim()) {
      toast.error('Debes agregar un comentario de cierre para documentar la mejora.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(winId, comment.trim(), images);
      // Lean celebration confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Non-critical if canvas-confetti fails
      }
      onClose();
      setComment('');
      setImages([]);
    } catch (error) {
      console.error('Error completing quick win:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-emerald-50/50">
          <h3 className="font-black text-xl text-emerald-900 flex items-center gap-2">
            <CheckCircle className="text-emerald-600" size={22} />
            Completar Quick Win
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed font-medium">
            ¡Excelente logro Kaizen! Describe las acciones realizadas y adjunta las fotos del resultado final (estado <b>DESPUÉS</b>).
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Comentario de Cierre <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explica qué solución se implementó y qué beneficio inmediato se obtuvo..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none resize-none text-slate-900 text-sm transition-all placeholder:text-slate-400 font-medium"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Fotos Después */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-slate-700 uppercase">
                Fotos DESPUÉS <span className="text-slate-400 font-normal lowercase">(opcional, máx. 5)</span>
              </label>
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all"
                >
                  <Upload size={12} />
                  <span>{isUploading ? 'Subiendo...' : 'Agregar foto'}</span>
                </button>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-emerald-200 aspect-square">
                    <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X size={10} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                        PRINCIPAL
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-200 rounded-xl p-5 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-500"
              >
                <Upload size={24} className="mb-1 text-emerald-600 opacity-60" />
                <span className="text-xs font-medium text-emerald-800">
                  Subir foto de evidencia final
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all text-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Cierre'}
          </button>
        </div>
      </div>
    </div>
  );
};
