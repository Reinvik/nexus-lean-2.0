import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { AUDIT_CRITERIA } from '../services/auditService';
import type { Audit5SEntry } from '../../../types';
import {
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Building,
  User,
  Calendar,
  Award,
} from 'lucide-react';
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

const STEP_LABELS: Record<SectionKey, { short: string; title: string }> = {
  S1: { short: '1S • Clasificar', title: '1S Clasificar (Seiri)' },
  S2: { short: '2S • Ordenar', title: '2S Ordenar (Seiton)' },
  S3: { short: '3S • Limpiar', title: '3S Limpiar (Seiso)' },
  S4: { short: '4S • Estandarizar', title: '4S Estandarizar (Seiketsu)' },
  S5: { short: '5S • Disciplina', title: '5S Disciplina (Shitsuke)' },
};

const RATING_FEEDBACK: Record<number, { label: string; desc: string; badgeClass: string }> = {
  5: {
    label: '5 - Excelente',
    desc: 'Cumple estándar totalmente y sin desvíos',
    badgeClass: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  },
  4: {
    label: '4 - Bueno',
    desc: 'Cumple con observaciones menores subsanables',
    badgeClass: 'bg-blue-50 border-blue-300 text-blue-900',
  },
  3: {
    label: '3 - Regular',
    desc: 'En proceso de implementación o cumplimiento parcial',
    badgeClass: 'bg-sky-50 border-sky-300 text-sky-900',
  },
  2: {
    label: '2 - Deficiente',
    desc: 'Oportunidad de mejora clara requerida',
    badgeClass: 'bg-amber-50 border-amber-300 text-amber-900',
  },
  1: {
    label: '1 - Muy Deficiente',
    desc: 'No implementado o condición de riesgo',
    badgeClass: 'bg-rose-50 border-rose-300 text-rose-900',
  },
};

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

  // Scores state: Map question key -> score (1 to 5)
  const [answers, setAnswers] = useState<Record<string, { score: number; comment: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  // Calculate scores
  const totalQuestions = SECTIONS.reduce((acc, s) => acc + AUDIT_CRITERIA[s].questions.length, 0);
  const maxPoints = totalQuestions * 5; // 75 puntos máximos
  const currentPoints = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
  const totalScorePercent = maxPoints > 0 ? Math.round((currentPoints / maxPoints) * 100) : 0;
  const answeredCount = Object.values(answers).filter((a) => (a.score || 0) >= 1).length;
  const averageRating = answeredCount > 0 ? (currentPoints / answeredCount).toFixed(1) : '0.0';
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

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
      variant="light"
      title="Tomar Auditoría 5S en Terreno"
      subtitle="Evaluación operacional de 5S con alto contraste para tablets y celulares"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-3 shadow-xs">
            <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Global Progress Bar */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5 font-sans">
              <Award size={16} className="text-blue-600" />
              <span>Avance Global de la Auditoría</span>
            </span>
            <span className="font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 font-bold">
              {answeredCount} de {totalQuestions} criterios ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Audit Meta: Area, Auditor, Date */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Building size={14} className="text-blue-600" />
                <span>Área o Estación *</span>
              </label>
              <input
                type="text"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej: Picking, Taller, Envasado"
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:bg-white rounded-xl text-slate-900 text-base sm:text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <User size={14} className="text-blue-600" />
                <span>Auditor Responsable</span>
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="Nombre del auditor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:bg-white rounded-xl text-slate-900 text-base sm:text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                <span>Fecha de Ejecución</span>
              </label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:bg-white rounded-xl text-slate-900 text-base sm:text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 [color-scheme:light] transition-all"
              />
            </div>
          </div>
        </div>

        {/* 5S Step Navigation Bar (Touch-friendly & Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none -mx-1 px-1 touch-pan-x">
          {SECTIONS.map((sec, idx) => {
            const secQuestions = AUDIT_CRITERIA[sec].questions;
            const answeredInSec = secQuestions.filter(
              (_, qIdx) => (answers[`${sec}_${qIdx}`]?.score || 0) >= 1
            ).length;
            const isCompleted = answeredInSec === secQuestions.length;
            const isActive = activeStep === sec;

            return (
              <button
                type="button"
                key={sec}
                onClick={() => setActiveStep(sec)}
                className={`flex-1 min-w-[130px] sm:min-w-[145px] flex items-center justify-between p-3 rounded-2xl border-2 text-xs font-bold transition-all select-none cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-[1.02]'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100/80'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="text-left">
                  <span className="block text-xs font-extrabold">{STEP_LABELS[sec].short}</span>
                  <span
                    className={`text-[10px] ${
                      isActive
                        ? 'text-blue-100 font-semibold'
                        : isCompleted
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    {answeredInSec}/{secQuestions.length} respondidas
                  </span>
                </div>
                {isCompleted ? (
                  <CheckCircle2 size={18} className={isActive ? 'text-white' : 'text-emerald-600'} />
                ) : (
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Section Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-slate-50 to-white border-2 border-blue-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider mb-1">
              Paso {currentIndex + 1} de 5 • {activeStep}
            </div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 font-sans">
              {currentSection.title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              {currentSection.subtitle}
            </p>
          </div>
          <div className="self-start sm:self-center bg-white px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold text-blue-900 shadow-2xs">
            {AUDIT_CRITERIA[activeStep].questions.filter((_, qIdx) => (answers[`${activeStep}_${qIdx}`]?.score || 0) >= 1).length} de {AUDIT_CRITERIA[activeStep].questions.length} completadas
          </div>
        </div>

        {/* Questions in Current Section */}
        <div className="space-y-4">
          {currentSection.questions.map((question, qIdx) => {
            const key = `${activeStep}_${qIdx}`;
            const currentAnswer = answers[key] || { score: 0, comment: '' };
            const selectedScore = currentAnswer.score;
            const feedback = selectedScore >= 1 && selectedScore <= 5 ? RATING_FEEDBACK[selectedScore] : null;

            return (
              <div
                key={qIdx}
                className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3.5"
              >
                {/* Question Text */}
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-100 text-blue-900 text-xs font-black shrink-0 mt-0.5">
                    P{qIdx + 1}
                  </span>
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {question}
                  </p>
                </div>

                {/* Rating 1 to 5 Buttons */}
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Calificación (1 al 5):
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 max-w-lg w-full">
                    {[1, 2, 3, 4, 5].map((pts) => {
                      const isSelected = selectedScore === pts;
                      const microLabels = ['', 'Muy Mal', 'Bajo', 'Regular', 'Bueno', 'Excelente'];
                      return (
                        <button
                          type="button"
                          key={pts}
                          onClick={() => handleScoreChange(qIdx, pts)}
                          className={`h-14 rounded-xl text-base sm:text-lg font-black transition-all flex flex-col items-center justify-center border-2 active:scale-95 cursor-pointer ${
                            isSelected
                              ? pts === 5
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-200 ring-2 ring-emerald-300'
                                : pts === 4
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-200 ring-2 ring-blue-300'
                                : pts === 3
                                ? 'bg-sky-500 text-white border-sky-600 shadow-md shadow-sky-200 ring-2 ring-sky-300'
                                : pts === 2
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200 ring-2 ring-amber-300'
                                : 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-200 ring-2 ring-rose-300'
                              : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                          }`}
                        >
                          <span>{pts}</span>
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold -mt-1 ${
                              isSelected ? 'text-white/90 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {microLabels[pts]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating Description Pill */}
                  <div className="pt-1">
                    {feedback ? (
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold shadow-2xs ${feedback.badgeClass}`}
                      >
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>
                          <strong>{feedback.label}:</strong> {feedback.desc}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-slate-600 text-xs font-medium">
                        <span>👉 Toca una nota del 1 al 5 para evaluar este criterio</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specific Observation or Finding */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    Observaciones o hallazgos específicos (opcional)
                  </label>
                  <input
                    type="text"
                    value={currentAnswer.comment}
                    onChange={(e) => handleCommentChange(qIdx, e.target.value)}
                    placeholder="Detalla hallazgo, tarjeta 5S levantada o comentario..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-xl text-slate-900 text-base sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Action & Navigation Bar */}
        <div className="sticky -bottom-4 sm:-bottom-6 bg-white/95 backdrop-blur-md pt-3.5 pb-2 px-4 sm:px-6 border-t-2 border-slate-200 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg -mx-4 sm:-mx-6 rounded-b-2xl">
          {/* Score Summary Badge */}
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-slate-100/90 border-2 border-slate-200 px-3.5 py-2 rounded-2xl">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">
                Puntaje 5S
              </span>
              <span className="text-xl font-black text-blue-700 font-sans leading-none">
                {totalScorePercent}%
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-300" />
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-black block">
                Promedio
              </span>
              <span className="text-sm font-extrabold text-slate-800 font-mono leading-none">
                {averageRating} <span className="text-slate-400 font-normal">/ 5.0</span>
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-300 hidden sm:block" />
            <div className="hidden sm:block text-[11px] font-bold text-slate-600">
              {answeredCount} de {totalQuestions} evaluadas
            </div>
          </div>

          {/* Nav / Submit Actions */}
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => setActiveStep(SECTIONS[currentIndex - 1])}
                className="h-12 px-4 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
            )}

            {currentIndex < SECTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(SECTIONS[currentIndex + 1])}
                className="flex-1 sm:flex-initial h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Siguiente ({SECTIONS[currentIndex + 1]})</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>Finalizar y Guardar Auditoría</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AuditEvaluationModal;
