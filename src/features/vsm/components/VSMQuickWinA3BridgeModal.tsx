import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, FileText, X, Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import type { VSMStep } from '../types';

interface VSMQuickWinA3BridgeModalProps {
  step: VSMStep | null;
  vsmName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VSMQuickWinA3BridgeModal: React.FC<VSMQuickWinA3BridgeModalProps> = ({
  step,
  vsmName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, globalFilterCompanyId, activeCompanyId } = useAuth();
  const [mode, setMode] = useState<'quick_win' | 'a3'>('quick_win');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (step) {
      setTitle(`[VSM: ${vsmName}] Reducir tiempo en ${step.name}`);
      setDescription(
        step.kaizenBurstDescription ||
          `Oportunidad Kaizen detectada en el Mapeo de Flujo de Valor.\nEtapa: ${step.name}\nTiempo de Ciclo: ${step.cycleTime}s\nInventario WIP: ${step.wipUnits || 0} unidades\nCambio Formato: ${step.changeoverTime || 0} min.`
      );
      setResponsible(user?.fullName || user?.name || user?.email || '');
    }
  }, [step, vsmName, user]);

  if (!isOpen || !step) return null;

  const targetCompanyId = user?.isGlobalAdmin
    ? globalFilterCompanyId && globalFilterCompanyId !== 'all'
      ? globalFilterCompanyId
      : activeCompanyId
    : user?.company_id || user?.companyId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Por favor completa el título y la descripción.');
      return;
    }

    if (!targetCompanyId) {
      toast.error('Selecciona una empresa válida primero.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'quick_win') {
        // Insert into quick_wins table
        const { error } = await supabase.from('quick_wins').insert({
          title: title.trim(),
          description: description.trim(),
          status: 'idea',
          impact: 'Alto',
          responsible: responsible || null,
          category: 'proceso',
          cause: 'sistemico',
          impact_score: 8,
          effort_score: 4,
          company_id: targetCompanyId,
          created_by: user?.id,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success('¡Quick Win generado directamente desde el VSM!');
      } else {
        // Insert into a3_projects table
        const { error } = await supabase.from('a3_projects').insert({
          title: title.trim(),
          background: description.trim(),
          company_id: targetCompanyId,
          status: 'draft',
          leader: responsible || null,
          created_by: user?.id,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success('¡Proyecto A3 iniciado desde el VSM!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error generating Kaizen action:', error);
      toast.error('Error al generar acción: ' + (error?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black text-sm">
              💥
            </span>
            <div>
              <h3 className="font-black text-base tracking-tight">Ráfaga Kaizen (Kaizen Burst)</h3>
              <p className="text-[11px] text-slate-400">
                Transformar cuello de botella de VSM en acción inmediata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Type Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-2">
              ¿Qué tipo de iniciativa deseas crear?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('quick_win')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  mode === 'quick_win'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-amber-500" />
                  <span className="font-bold text-xs text-slate-900">Quick Win</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Mejora rápida de bajo costo y ejecución en menos de 5 días.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('a3')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  mode === 'a3'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-purple-600" />
                  <span className="font-bold text-xs text-slate-900">Proyecto A3</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Resolución estructurada de problemas complejos (5 Porqués, Ishikawa).
                </p>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Título de la Acción
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Hallazgo y Justificación
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium"
            />
          </div>

          {/* Responsible */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Responsable Asignado
            </label>
            <input
              type="text"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center gap-1.5 ${
                mode === 'quick_win'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
              }`}
            >
              <Check size={14} />
              <span>
                {isSubmitting
                  ? 'Creando...'
                  : mode === 'quick_win'
                  ? 'Crear Quick Win'
                  : 'Crear Proyecto A3'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
