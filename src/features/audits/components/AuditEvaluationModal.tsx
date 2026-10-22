import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { AUDIT_CRITERIA } from '../services/auditService';
import type { Audit5SEntry } from '../../../types';
import { ShieldCheck, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface AuditEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (auditData: any, entries: Audit5SEntry[]) => Promise<any>;
  initialArea?: string;
  initialAuditor?: string;
  initialAuditPlanId?: string;
  onSuccessAudit?: (result: { area: string; auditor: string; score: number; auditId?: string; planId?: string }) => void;
}

type SectionKey = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
const SECTIONS: SectionKey[] = ['S1', 'S2', 'S3', 'S4', 'S5'];

export const AuditEvaluationModal: React.FC<AuditEvaluationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialArea,
  initialAuditor,
  initialAuditPlanId,
  onSuccessAudit,
}) => {
  const { user, activeCompanyId } = useAuth();

  const [activeStep, setActiveStep] = useState<SectionKey>('S1');
  const [area, setArea] = useState('');
  const [auditorName, setAuditorName] = useState(user?.name || '');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      if (initialArea) setArea(initialArea);
      if (initialAuditor) setAuditorName(initialAuditor);
      else if (!auditorName && user?.name) setAuditorName(user.name);
      setAuditDate(new Date().toISOString().split('T')[0]);
      setActiveStep('S1');
      setAnswers({});
      setErrorMsg('');
    }
  }, [isOpen, initialArea, initialAuditor, user?.name]);

  // Scores state: Map question key -> score (1 to 5)
  const [answers, setAnswers] = useState<Record<string, { score: number; comment: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentSection = AUDIT_CRITERIA[activeStep];

  const handleScoreChange = (qIndex: number, score: number) => {
    const key = `${activeStep}_${qIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: { score, comment: prev[key]?.comment || '' },
    }));
  };

  const handleCommentChange = (qIndex: number, comment: string) => {
    const key = `${activeStep}_${qIndex}`;
    setAnswers((prev) => ({
      ...prev,
      [key]: { score: prev[key]?.score ?? 0, comment },
    }));
  };

  // Calculate current score (escala 1 a 5)
  const totalQuestions = SECTIONS.reduce((acc, s) => acc + AUDIT_CRITERIA[s].questions.length, 0);
  const maxPoints = totalQuestions * 5; // 75 puntos máximos en escala 1 a 5
  const currentPoints = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
  const totalScorePercent = maxPoints > 0 ? Math.round((currentPoints / maxPoints) * 100) : 0;
  const answeredCount = Object.values(answers).filter((a) => (a.score || 0) >= 1).length;
  const averageRating = answeredCount > 0 ? (currentPoints / answeredCount).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim()) {
      setErrorMsg('Por favor especifica el área a auditar.');
      return;
    }

    // Validar que todos los criterios tengan notas del 1 al 5
    const unansweredList: string[] = [];
    let firstMissingSec: SectionKey | null = null;

    SECTIONS.forEach((s) => {
      AUDIT_CRITERIA[s].questions.forEach((_, idx) => {
        const key = `${s}_${idx}`;
        const val = answers[key];
        if (!val || !val.score || val.score < 1) {
          unansweredList.push(`${s} - P${idx + 1}`);
          if (!firstMissingSec) firstMissingSec = s;
        }
      });
    });

    if (unansweredList.length > 0) {
      if (firstMissingSec) setActiveStep(firstMissingSec);
      setErrorMsg(
        `Debes calificar todos los criterios con nota del 1 al 5 antes de finalizar. Faltan ${unansweredList.length} pregunta(s) por responder (revisa la sección ${firstMissingSec}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const entries: Audit5SEntry[] = [];
      SECTIONS.forEach((s) => {
        AUDIT_CRITERIA[s].questions.forEach((q, idx) => {
          const key = `${s}_${idx}`;
          const val = answers[key] || { score: 1, comment: '' };
          entries.push({
            section: s,
            question: q,
            score: val.score,
            comment: val.comment,
          });
        });
      });

      const auditPayload = {
        company_id: activeCompanyId || user?.companyId || '',
        title: `Auditoría 5S - ${area}`,
        area,
        auditor: auditorName,
        audit_date: auditDate,
        total_score: totalScorePercent,
        status: 'Realizada' as const,
      };

      const res = await onSave(auditPayload, entries);
      if (res && res.success === false) {
        setErrorMsg(res.error || 'Error al guardar la auditoría');
      } else {
        if (onSuccessAudit) {
          onSuccessAudit({
            area,
            auditor: auditorName,
            score: totalScorePercent,
            auditId: res?.auditId,
            planId: initialAuditPlanId,
          });
        }
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentIndex = SECTIONS.indexOf(activeStep);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ejecutar Auditoría 5S en Terreno"
      subtitle="Evalúa cada criterio con notas del 1 al 5 con evidencias y comentarios"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Audit Meta (Area, Auditor, Date) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-200 uppercase">
              Área o Estación *
            </label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ej: Zona Embalaje, Taller, Picking"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-200 uppercase">
              Auditor Responsable
            </label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-200 uppercase">
              Fecha de Ejecución
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((sec, idx) => {
            const isCompleted = AUDIT_CRITERIA[sec].questions.every(
              (_, qIdx) => (answers[`${sec}_${qIdx}`]?.score || 0) >= 1
            );
            return (
              <button
                type="button"
                key={sec}
                onClick={() => setActiveStep(sec)}
                className={`flex-1 min-w-[130px] flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  activeStep === sec
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <span>{sec}</span>
                {isCompleted ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">Paso {idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Section Questions */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="border-b border-slate-800/80 pb-3">
            <h4 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>{currentSection.title}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{currentSection.subtitle}</p>
          </div>

          <div className="space-y-5">
            {currentSection.questions.map((question, qIdx) => {
              const key = `${activeStep}_${qIdx}`;
              const currentAnswer = answers[key] || { score: 0, comment: '' };

              return (
                <div
                  key={qIdx}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3"
                >
                  <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                    <span className="text-cyan-400 mr-1.5 font-bold">{qIdx + 1}.</span>
                    {question}
                  </p>

                  {/* Botones de Nota: 1, 2, 3, 4, 5 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 mr-1">Calificación:</span>
                    {[1, 2, 3, 4, 5].map((pts) => {
                      const isSelected = currentAnswer.score === pts;
                      return (
                        <button
                          type="button"
                          key={pts}
                          onClick={() => handleScoreChange(qIdx, pts)}
                          className={`w-10 h-10 rounded-xl text-sm font-black transition-all border ${
                            isSelected
                              ? pts === 5
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-105'
                                : pts === 4
                                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] scale-105'
                                : pts === 3
                                ? 'bg-sky-600 text-white border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.5)] scale-105'
                                : pts === 2
                                ? 'bg-amber-600 text-white border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
                                : 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)] scale-105'
                              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {pts}
                        </button>
                      );
                    })}
                    <span className="text-xs font-medium text-slate-300 ml-2">
                      {currentAnswer.score === 5
                        ? '5 - Excelente / Cumple estándar totalmente'
                        : currentAnswer.score === 4
                        ? '4 - Bueno / Cumple con observaciones menores'
                        : currentAnswer.score === 3
                        ? '3 - Regular / En proceso de implementación'
                        : currentAnswer.score === 2
                        ? '2 - Deficiente / Oportunidad de mejora'
                        : currentAnswer.score === 1
                        ? '1 - Muy deficiente / No implementado'
                        : 'Selecciona una nota del 1 al 5'}
                    </span>
                  </div>

                  {/* Observation / Comment input */}
                  <input
                    type="text"
                    value={currentAnswer.comment}
                    onChange={(e) => handleCommentChange(qIdx, e.target.value)}
                    placeholder="Observaciones o hallazgos específicos (opcional)..."
                    className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Toolbar: Score summary & Next / Finish */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Puntaje Global
              </span>
              <span className="text-lg font-bold text-cyan-400 font-sans">
                {totalScorePercent}%
              </span>
            </div>
            <div className="text-xs text-slate-400 hidden sm:block">
              <div className="font-bold text-slate-200">
                Nota Promedio: <span className="text-cyan-300 font-mono">{averageRating} / 5</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {answeredCount} de {totalQuestions} criterios evaluados ({currentPoints} de {maxPoints} pts)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentIndex < SECTIONS.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveStep(SECTIONS[currentIndex + 1])}
                rightIcon={<ChevronRight size={16} />}
              >
                Siguiente ({SECTIONS[currentIndex + 1]})
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<ShieldCheck size={16} />}
              >
                Finalizar y Guardar Auditoría
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AuditEvaluationModal;
