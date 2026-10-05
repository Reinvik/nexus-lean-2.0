import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, Zap, Upload, User, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Profile } from '../../../types';
import { generateQuickWinSolution } from '../../../services/geminiService';

export interface NewIdeaFormData {
  title: string;
  description: string;
  proposed_solution: string;
  impact: 'Alto' | 'Medio' | 'Bajo';
  responsible: string;
  deadline: string;
  image_urls: string[];
  category: string;
  cause: string;
  impact_score: number;
  effort_score: number;
}

interface NewIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: NewIdeaFormData) => Promise<void>;
  users: Profile[];
  onUploadImage: (file: File) => Promise<string | null>;
}

export const NewIdeaModal: React.FC<NewIdeaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  users,
  onUploadImage,
}) => {
  const [formData, setFormData] = useState<NewIdeaFormData>({
    title: '',
    description: '',
    proposed_solution: '',
    impact: 'Medio',
    responsible: '',
    deadline: '',
    image_urls: [],
    category: 'operacional',
    cause: 'infra',
    impact_score: 5,
    effort_score: 5,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGenerateSolution = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Ingresa al menos el título y la descripción para generar una solución.');
      return;
    }

    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const solution = await generateQuickWinSolution(
        formData.title,
        formData.description,
        apiKey
      );
      if (solution) {
        setFormData((prev) => ({ ...prev, proposed_solution: solution }));
        toast.success('¡Solución sugerida por IA generada!');
      }
    } catch (error: any) {
      console.error('Error generando solución:', error);
      toast.error('Error generando solución: ' + (error?.message || 'Error desconocido'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.image_urls.length >= 5) {
      toast.error('Máximo 5 imágenes de referencia');
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          image_urls: [...prev.image_urls, url],
        }));
        toast.success('Foto subida');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    if (!formData.responsible) {
      toast.error('Por favor asigna un responsable');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating idea:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <Lightbulb className="text-blue-600" size={22} />
            Nueva Idea Quick Win
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-grow">
          {/* Título */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Título <span className="text-rose-500">*</span>
            </label>
            <input
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Instalar dispensador de EPP en celda de ensamble"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Descripción del Problema <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none text-slate-900 text-sm transition-all placeholder:text-slate-400"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="¿Qué anomalía o desperdicio (muda) se identificó?"
            />
          </div>

          {/* Solución Propuesta + Gemini AI Button */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-black text-slate-700 uppercase">
                Solución Propuesta
              </label>
              <button
                type="button"
                onClick={handleGenerateSolution}
                disabled={isGenerating}
                className="text-xs flex items-center gap-1.5 text-blue-600 font-bold hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
              >
                <Zap size={13} className={isGenerating ? 'animate-bounce text-amber-500' : ''} />
                <span>{isGenerating ? 'Consultando IA...' : 'Generar con IA'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none text-slate-900 text-sm transition-all placeholder:text-slate-400"
              value={formData.proposed_solution}
              onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
              placeholder="Describe la contramedida o usa la IA para redactarla..."
            />
          </div>

          {/* Impacto & Fecha Límite */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Impacto Cualitativo
              </label>
              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                value={formData.impact}
                onChange={(e) =>
                  setFormData({ ...formData, impact: e.target.value as 'Alto' | 'Medio' | 'Bajo' })
                }
              >
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Fecha Límite
              </label>
              <input
                type="date"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium text-sm"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          {/* Categoría & Causa Raíz */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Categoría
              </label>
              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="operacional">Operacional</option>
                <option value="almacen">Almacén</option>
                <option value="proceso">Proceso</option>
                <option value="sistemico">Sistémico</option>
                <option value="fisica">Física</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                Causa Raíz
              </label>
              <select
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                value={formData.cause}
                onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
              >
                <option value="infra">Infraestructura</option>
                <option value="nodef">No Definido</option>
                <option value="maldef">Mal Definido</option>
                <option value="nocumple">Definido, no se cumple</option>
                <option value="sistemico">Sistémico</option>
              </select>
            </div>
          </div>

          {/* Matriz 1-10 Scores */}
          <div className="space-y-4 py-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Impact Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                <span>Puntaje Impacto (Eje Y)</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-xs font-black">
                  {formData.impact_score} / 10
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData({ ...formData, impact_score: n })}
                    className={`h-8 flex-grow rounded-lg transition-all font-black text-xs ${
                      formData.impact_score === n
                        ? 'bg-emerald-600 text-white shadow-md scale-105 z-10'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Effort Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                <span>Puntaje Esfuerzo (Eje X)</span>
                <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs font-black">
                  {formData.effort_score} / 10
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData({ ...formData, effort_score: n })}
                    className={`h-8 flex-grow rounded-lg transition-all font-black text-xs ${
                      formData.effort_score === n
                        ? 'bg-blue-600 text-white shadow-md scale-105 z-10'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fotos de Referencia (Antes) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-slate-700 uppercase">
                Fotos de Referencia (Antes){' '}
                <span className="text-slate-400 font-normal lowercase">(máx. 5)</span>
              </label>
              {formData.image_urls.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  <Upload size={12} /> {isUploading ? 'Subiendo...' : 'Agregar foto'}
                </button>
              )}
            </div>

            {formData.image_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {formData.image_urls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          image_urls: prev.image_urls.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.image_urls.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-500"
              >
                <Upload size={28} className="mb-1 text-slate-400" />
                <span className="text-xs font-medium">Subir foto de evidencia antes</span>
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

          {/* Responsable */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Responsable <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                required
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm appearance-none cursor-pointer"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              >
                <option value="">Seleccionar Responsable...</option>
                {users.map((u) => {
                  const name = (u as any).name || u.full_name || u.email || '';
                  return (
                    <option key={u.id} value={name}>
                      {name} {u.role === 'superadmin' ? '(Admin)' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="bg-slate-50 px-6 py-4 -mx-6 -mb-6 mt-6 flex justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creando...' : 'Crear Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
