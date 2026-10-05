import React, { useState } from 'react';
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
}

type SectionKey = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
const SECTIONS: SectionKey[] = ['S1', 'S2', 'S3', 'S4', 'S5'];

export const AuditEvaluationModal: React.FC<AuditEvaluationModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { user, activeCompanyId } = useAuth();

  const [activeStep, setActiveStep] = useState<SectionKey>('S1');
  const [area, setArea] = useState('');
  const [auditorName, setAuditorName] = useState(user?.name || '');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);

  // Scores state: Map question key -> score (0 to 4)
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

  // Calculate current score
  const totalQuestions = 15;
  const maxPoints = totalQuestions * 4; // 60 points
  const currentPoints = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
  const totalScorePercent = Math.round((currentPoints / maxPoints) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim()) {
      setErrorMsg('Por favor especifica el área a auditar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const entries: Audit5SEntry[] = [];
      SECTIONS.forEach((s) => {
        AUDIT_CRITERIA[s].questions.forEach((q, idx) => {
          const key = `${s}_${idx}`;
          const val = answers[key] || { score: 0, comment: '' };
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
      subtitle="Evalúa cada criterio de 0 a 4 puntos con evidencias y comentarios"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Audit Meta (Area, Auditor, Date) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">
              Área o Estación *
            </label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ej: Zona Embalaje, Taller"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">
              Auditor Responsable
            </label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">
              Fecha de Ejecución
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SECTIONS.map((sec, idx) => {
            const isCompleted = AUDIT_CRITERIA[sec].questions.every(
              (_, qIdx) => answers[`${sec}_${qIdx}`] !== undefined
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
                    <span className="text-cyan-400 mr-1.5">{qIdx + 1}.</span>
                    {question}
                  </p>

                  {/* Score buttons: 0, 1, 2, 3, 4 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400 mr-1">Calificación:</span>
                    {[0, 1, 2, 3, 4].map((pts) => (
                      <button
                        type="button"
                        key={pts}
                        onClick={() => handleScoreChange(qIdx, pts)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                          currentAnswer.score === pts
                            ? pts === 4
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              : pts >= 2
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                              : 'bg-rose-500 text-white border-rose-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-400 ml-2">
                      {currentAnswer.score === 4
                        ? 'Excelente / Cumple estándar'
                        : currentAnswer.score === 0
                        ? 'No implementado / Desviación grave'
                        : 'En proceso / Observaciones'}
                    </span>
                  </div>

                  {/* Observation / Comment input */}
                  <input
                    type="text"
                    value={currentAnswer.comment}
                    onChange={(e) => handleCommentChange(qIdx, e.target.value)}
                    placeholder="Observaciones o hallazgos específicos (opcional)..."
                    className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
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
            <span className="text-xs text-slate-400 hidden sm:inline">
              ({currentPoints} de {maxPoints} puntos totales)
            </span>
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
