import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import type { Audit5S } from '../../../types';
import { Building, User, Calendar, Award, AlertCircle, Sparkles, Check } from 'lucide-react';

interface AuditEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: Audit5S | null;
  onSave: (
    auditId: string | number,
    updates: {
      area: string;
      auditor: string;
      audit_date: string;
      total_score: number;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  suggestedAreas?: string[];
}

export const AuditEditModal: React.FC<AuditEditModalProps> = ({
  isOpen,
  onClose,
  audit,
  onSave,
  suggestedAreas = [],
}) => {
  const [area, setArea] = useState('');
  const [auditor, setAuditor] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [score, setScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && audit) {
      setArea(audit.area || '');
      setAuditor(audit.auditor || '');
      setAuditDate(audit.audit_date || new Date().toISOString().split('T')[0]);
      // Si el score original está en escala 0-5, normalizar a porcentaje 0-100 para la vista de edición
      const rawScore = Number(audit.total_score) || 0;
      const normalizedScore = rawScore > 0 && rawScore <= 5 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);
      setScore(normalizedScore);
      setErrorMsg('');
    }
  }, [isOpen, audit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audit) return;

    const trimmedArea = area.trim();
    const trimmedAuditor = auditor.trim();

    if (!trimmedArea) {
      setErrorMsg('El nombre del área es obligatorio');
      return;
    }

    if (!trimmedAuditor) {
      setErrorMsg('El nombre del auditor es obligatorio');
      return;
    }

    if (score < 0 || score > 100 || isNaN(score)) {
      setErrorMsg('La calificación debe estar entre 0 y 100%');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await onSave(audit.id, {
        area: trimmedArea,
        auditor: trimmedAuditor,
        audit_date: auditDate,
        total_score: score,
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'Error al guardar los cambios');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !audit) return null;

  // Badge dinámico para previsualizar calificación con alto contraste
  const scoreVariant =
    score >= 80
      ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/50'
      : score >= 60
      ? 'text-amber-300 bg-amber-500/20 border-amber-500/50'
      : 'text-rose-300 bg-rose-500/20 border-rose-500/50';
  const scoreLabel = score >= 80 ? 'Excelente (≥80%)' : score >= 60 ? 'Regular (60-79%)' : 'Crítico (<60%)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Auditoría 5S"
      subtitle={`Modifica los datos del registro de auditoría #${audit.id}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-200 bg-rose-500/20 border border-rose-500/40 rounded-xl">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Campo Área */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Building size={14} className="text-cyan-400" />
            <span>Área o Zona Evaluada</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ej: Canal dinamico, Bodega UULL, Picking..."
            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-inner"
            required
            autoFocus
          />

          {/* Sugerencias rápidas de áreas */}
          {suggestedAreas.length > 0 && (
            <div className="pt-1.5">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                Áreas frecuentes (clic para autocompletar):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {suggestedAreas.slice(0, 10).map((sugArea) => {
                  const isSelected = area.trim().toLowerCase() === sugArea.trim().toLowerCase();
                  return (
                    <button
                      key={sugArea}
                      type="button"
                      onClick={() => setArea(sugArea)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-400 hover:text-white hover:bg-slate-700/80'
                      }`}
                    >
                      {sugArea}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Campo Auditor */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <User size={14} className="text-cyan-400" />
            <span>Auditor Responsable</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={auditor}
            onChange={(e) => setAuditor(e.target.value)}
            placeholder="Nombre del auditor o consultor"
            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-inner"
            required
          />
        </div>

        {/* Fila Fecha y Calificación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar size={14} className="text-cyan-400" />
              <span>Fecha de Auditoría</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors shadow-inner [color-scheme:dark]"
              required
            />
          </div>

          {/* Calificación */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award size={14} className="text-cyan-400" />
                <span>Calificación Total</span>
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${scoreVariant}`}>
                {scoreLabel}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-black text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors pr-8 font-mono shadow-inner"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción con Alto Contraste */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-all shadow-md shadow-cyan-900/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check size={14} />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AuditEditModal;
