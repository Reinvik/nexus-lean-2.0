import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import type { Audit5S } from '../../../types';
import { Building, User, Calendar, Award, AlertCircle, Sparkles } from 'lucide-react';

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

  // Badge dinámico para previsualizar calificación
  const scoreVariant = score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-rose-700 bg-rose-50 border-rose-300';
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
          <div className="flex items-center gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Campo Área */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Building size={14} className="text-cyan-600" />
            <span>Área o Zona Evaluada</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ej: Canal dinamico, Bodega UULL, Picking..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors"
            required
            autoFocus
          />

          {/* Sugerencias rápidas de áreas */}
          {suggestedAreas.length > 0 && (
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Sparkles size={11} className="text-cyan-600" />
                Áreas frecuentes (clic para autocompletar):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {suggestedAreas.slice(0, 8).map((sugArea) => (
                  <button
                    key={sugArea}
                    type="button"
                    onClick={() => setArea(sugArea)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors ${
                      area === sugArea
                        ? 'bg-cyan-700 text-white border-cyan-800'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50'
                    }`}
                  >
                    {sugArea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campo Auditor */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User size={14} className="text-cyan-600" />
            <span>Auditor Responsable</span>
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={auditor}
            onChange={(e) => setAuditor(e.target.value)}
            placeholder="Nombre del auditor o consultor"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors"
            required
          />
        </div>

        {/* Fila Fecha y Calificación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar size={14} className="text-cyan-600" />
              <span>Fecha de Auditoría</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Calificación */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award size={14} className="text-cyan-600" />
                <span>Calificación Total</span>
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${scoreVariant}`}>
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
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors pr-8 font-mono"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="shadow-sm"
          >
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AuditEditModal;
