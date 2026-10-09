import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  HelpCircle,
  DollarSign,
  ListTodo,
  Layers,
  Sparkles,
  AlertTriangle,
  Save,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { A3ActionPlanItem, A3Subtask, A3PlanGroup } from '../../../types';
import {
  improveLeanActionWording,
  generateLeanSubtasks,
} from '../../../services/geminiService';
import {
  startsWithActionVerb,
  formatWithActionVerb,
  COMMON_LEAN_VERBS,
  COMMON_SUBTASK_VERBS,
} from '../utils/leanActionVerbs';

interface A3ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: A3ActionPlanItem) => void;
  actionToEdit?: A3ActionPlanItem | null;
  users?: { name: string; email?: string }[];
  planGroups: A3PlanGroup[];
  activePlanId: string;
  countermeasures?: string[];
  projectGoal?: string;
  rootCause?: string;
}

export const A3ActionModal: React.FC<A3ActionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  actionToEdit,
  users = [],
  planGroups,
  activePlanId,
  countermeasures = [],
  projectGoal,
  rootCause,
}) => {
  const [formData, setFormData] = useState<A3ActionPlanItem>({
    id: Date.now(),
    planId: activePlanId,
    what: '',
    why: '',
    who: '',
    when: new Date().toISOString().split('T')[0],
    where: '',
    how: '',
    howMuch: '',
    status: 'pending',
    subtasks: [],
    countermeasures: [],
  });

  const [initialData, setInitialData] = useState<A3ActionPlanItem | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isPolishingWording, setIsPolishingWording] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskWho, setNewSubtaskWho] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState('');

  useEffect(() => {
    setShowConfirmClose(false);
    if (actionToEdit) {
      const init: A3ActionPlanItem = {
        ...actionToEdit,
        what: actionToEdit.what || actionToEdit.activity || '',
        who: actionToEdit.who || actionToEdit.responsible || '',
        when: actionToEdit.when || actionToEdit.date || new Date().toISOString().split('T')[0],
        planId: actionToEdit.planId || activePlanId,
        subtasks: actionToEdit.subtasks ? JSON.parse(JSON.stringify(actionToEdit.subtasks)) : [],
      };
      setFormData(init);
      setInitialData(init);
    } else {
      const init: A3ActionPlanItem = {
        id: Date.now(),
        planId: activePlanId,
        what: '',
        why: '',
        who: users[0]?.name || '',
        when: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // 1 week default
        where: '',
        how: '',
        howMuch: '',
        status: 'pending',
        subtasks: [],
        countermeasures: [],
      };
      setFormData(init);
      setInitialData(init);
    }
    setNewSubtaskTitle('');
    setNewSubtaskWho('');
    setNewSubtaskDate('');
  }, [actionToEdit, activePlanId, isOpen]);

  if (!isOpen) return null;

  // Comprueba si el usuario tiene cambios sin guardar
  const isFormDirty = (): boolean => {
    if (!initialData) return false;
    if (formData.what.trim() !== (initialData.what || '').trim()) return true;
    if ((formData.why || '').trim() !== (initialData.why || '').trim()) return true;
    if ((formData.how || '').trim() !== (initialData.how || '').trim()) return true;
    if ((formData.where || '').trim() !== (initialData.where || '').trim()) return true;
    if ((formData.howMuch || '').trim() !== (initialData.howMuch || '').trim()) return true;
    if (formData.who !== initialData.who) return true;
    if (formData.planId !== initialData.planId) return true;
    if (formData.status !== initialData.status) return true;
    if (newSubtaskTitle.trim().length > 0) return true;

    // Subtareas agregadas o removidas
    const currentSubs = formData.subtasks || [];
    const initSubs = initialData.subtasks || [];
    if (currentSubs.length !== initSubs.length) return true;
    for (let i = 0; i < currentSubs.length; i++) {
      if (currentSubs[i].title !== initSubs[i]?.title) return true;
      if (currentSubs[i].completed !== initSubs[i]?.completed) return true;
    }

    return false;
  };

  // Manejador seguro para cerrar con confirmación
  const handleRequestClose = () => {
    if (isFormDirty()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const handleAddSubtask = (e?: React.FormEvent, customTitle?: string) => {
    if (e) e.preventDefault();
    const titleToAdd = (customTitle || newSubtaskTitle).trim();
    if (!titleToAdd) return;

    const newSub: A3Subtask = {
      id: Date.now() + Math.random(),
      title: titleToAdd,
      completed: false,
      responsible: newSubtaskWho.trim() || undefined,
      dueDate: newSubtaskDate || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSub],
    }));

    setNewSubtaskTitle('');
    setNewSubtaskWho('');
    setNewSubtaskDate('');
  };

  const handleRemoveSubtask = (subId: string | number) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter((s) => s.id !== subId),
    }));
  };

  const handleSaveAndClose = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.what.trim()) {
      toast.error('El campo "¿QUÉ se va a hacer?" es obligatorio.');
      setShowConfirmClose(false);
      return;
    }
    if (!formData.who.trim()) {
      toast.error('Debes asignar un responsable a la acción.');
      setShowConfirmClose(false);
      return;
    }

    // Auto-compute progress from subtasks if available
    let progress = formData.progress || 0;
    const subtasks = formData.subtasks || [];
    if (subtasks.length > 0) {
      const completedCount = subtasks.filter((s) => s.completed).length;
      progress = Math.round((completedCount / subtasks.length) * 100);
    }

    const targetPlan = planGroups.find((p) => p.id === formData.planId);

    onSave({
      ...formData,
      planName: targetPlan?.name || formData.planName || undefined,
      activity: formData.what,
      responsible: formData.who,
      date: formData.when,
      progress,
    });
    setShowConfirmClose(false);
    onClose();
  };

  // Aplicar verbo rápido a la acción
  const handleApplyVerbToAction = (verb: string) => {
    if (!formData.what.trim()) {
      setFormData({ ...formData, what: `${verb} ` });
    } else {
      setFormData({ ...formData, what: formatWithActionVerb(formData.what, verb) });
    }
  };

  // Pulir redacción con IA
  const handleAIPolishWording = async () => {
    if (!formData.what.trim()) {
      toast.error('Escribe primero una idea o borrador de la acción para pulirla.');
      return;
    }
    setIsPolishingWording(true);
    try {
      const polished = await improveLeanActionWording(formData.what, {
        why: formData.why,
        goal: projectGoal,
      });
      if (polished && polished.trim()) {
        setFormData((prev) => ({ ...prev, what: polished }));
        toast.success('¡Redacción mejorada con verbo de acción Lean!');
      }
    } catch (err: any) {
      toast.error('No se pudo pulir la redacción con IA.');
    } finally {
      setIsPolishingWording(false);
    }
  };

  // Proponer subtareas con IA
  const handleAIGenerateSubtasks = async () => {
    if (!formData.what.trim()) {
      toast.error('Define primero el "¿QUÉ se va a hacer?" para proponer subtareas acordes.');
      return;
    }
    setIsGeneratingSubtasks(true);
    try {
      const suggested = await generateLeanSubtasks(formData.what, {
        why: formData.why,
        projectGoal,
        rootCause,
        countermeasure: formData.countermeasure,
      });

      if (suggested && suggested.length > 0) {
        const formattedSubs: A3Subtask[] = suggested.map((s) => ({
          id: Date.now() + Math.random(),
          title: s.title,
          completed: false,
          responsible: formData.who || undefined,
          dueDate: formData.when || undefined,
        }));

        setFormData((prev) => ({
          ...prev,
          subtasks: [...(prev.subtasks || []), ...formattedSubs],
        }));
        toast.success(`Se agregaron ${suggested.length} subtareas con estándar Lean.`);
      }
    } catch (err: any) {
      toast.error('No se pudieron generar subtareas automáticas.');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  // Aplicar verbo rápido a subtarea
  const handleApplyVerbToSubtask = (verb: string) => {
    if (!newSubtaskTitle.trim()) {
      setNewSubtaskTitle(`${verb} `);
    } else {
      setNewSubtaskTitle(formatWithActionVerb(newSubtaskTitle, verb));
    }
  };

  const verbAnalysis = startsWithActionVerb(formData.what);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        // Prevenir cierre accidental por click fuera
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {actionToEdit ? 'Editar Acción 5W2H' : 'Nueva Acción 5W2H'}
              </h2>
              <p className="text-xs text-slate-400">
                Estructura la ejecución con precisión: Qué, Por qué, Quién, Cuándo, Dónde, Cómo y Cuánto.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveAndClose} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Plan Selector & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Layers size={14} className="text-brand-600" />
                <span>Asignar al Plan de Acción</span>
              </label>
              <select
                value={formData.planId || activePlanId}
                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
              >
                {planGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-brand-600" />
                <span>Estado de la Acción</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
              >
                <option value="pending">⏳ Pendiente</option>
                <option value="in_progress">⚡ En Proceso</option>
                <option value="completed">✅ Completada</option>
                <option value="delayed">⚠️ Atrasada</option>
              </select>
            </div>
          </div>

          {/* Section: The 5 W's */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-700 flex items-center gap-1.5 border-b border-brand-100 pb-1.5">
              <span>Dimensión 5W (What, Why, Who, When, Where)</span>
            </h3>

            {/* 1. WHAT */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  1. ¿QUÉ se va a hacer? (What) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  disabled={!formData.what.trim() || isPolishingWording}
                  onClick={handleAIPolishWording}
                  className="text-[11px] font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Mejora la redacción asegurando que inicie con un verbo de acción"
                >
                  <Sparkles size={12} className={isPolishingWording ? 'animate-spin text-brand-600' : 'text-brand-600'} />
                  <span>{isPolishingWording ? 'Pulir redacción...' : '✨ Pulir con Consultor IA'}</span>
                </button>
              </div>

              <textarea
                rows={2}
                required
                value={formData.what}
                onChange={(e) => setFormData({ ...formData, what: e.target.value })}
                placeholder="Ej: Implementar tablero de control visual Heijunka en andenes..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
              />

              {/* Indicador de Verbo de Acción Lean & Verbos Rápidos */}
              <div className="mt-1.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {formData.what.trim() ? (
                    verbAnalysis.isValid ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Verbo de acción detectado: <strong>{verbAnalysis.firstWord}</strong></span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-amber-600 shrink-0" />
                        <span>Recomendación Lean: Los planes deben iniciar con un verbo en infinitivo (ej: Implementar, Estandarizar)</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Estándar Lean: Toda acción debe iniciar con un verbo de acción observable.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Verbos sugeridos:
                  </span>
                  {COMMON_LEAN_VERBS.slice(0, 8).map((verb) => (
                    <button
                      key={verb}
                      type="button"
                      onClick={() => handleApplyVerbToAction(verb)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 border border-slate-200 transition-colors shrink-0"
                    >
                      +{verb}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. WHY */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle size={13} className="text-slate-400" />
                  <span>2. ¿POR QUÉ se hace? (Why)</span>
                </label>
                {countermeasures.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({
                          ...formData,
                          why: `Mitigar causa: ${e.target.value}`,
                          countermeasure: e.target.value,
                        });
                      }
                    }}
                    className="text-[11px] text-brand-600 bg-brand-50/50 border border-brand-200 rounded px-2 py-0.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="">Vincular a contramedida detectada...</option>
                    {countermeasures.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                rows={2}
                value={formData.why}
                onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                placeholder="Propósito, causa raíz a neutralizar o beneficio esperado..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
              />
            </div>

            {/* 3. WHO & 4. WHEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <User size={13} className="text-slate-400" />
                  <span>3. ¿QUIÉN es el responsable? (Who) <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  list="modal-users-list"
                  value={formData.who}
                  onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                  placeholder="Nombre del líder de esta acción..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                />
                <datalist id="modal-users-list">
                  {users.map((u, i) => (
                    <option key={i} value={u.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span>4. ¿CUÁNDO se cumplirá? (When) <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.when}
                  onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                />
              </div>
            </div>

            {/* 5. WHERE */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MapPin size={13} className="text-slate-400" />
                <span>5. ¿DÓNDE se ejecutará? (Where)</span>
              </label>
              <input
                type="text"
                value={formData.where}
                onChange={(e) => setFormData({ ...formData, where: e.target.value })}
                placeholder="Línea 2, Bodega central, Andén 4, Gemba..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Section: The 2 H's */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
              <span>Dimensión 2H (How & How Much)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* HOW */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  6. ¿CÓMO se llevará a cabo? (How)
                </label>
                <textarea
                  rows={2}
                  value={formData.how}
                  onChange={(e) => setFormData({ ...formData, how: e.target.value })}
                  placeholder="Metodología, estándar o procedimiento a aplicar..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>

              {/* HOW MUCH */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <DollarSign size={13} className="text-slate-400" />
                  <span>7. ¿CUÁNTO costará o requerirá? (How Much)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.howMuch}
                  onChange={(e) => setFormData({ ...formData, howMuch: e.target.value })}
                  placeholder="Presupuesto, horas hombre o $0 (Quick Win / Sin costo)..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Subtasks Operativas (Subtareas con IA) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ListTodo size={15} className="text-brand-600" />
                  <span>Subtareas Operativas ({(formData.subtasks || []).length})</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Desglosa la acción en pasos secuenciales que inicien con verbo de acción
                </span>
              </div>

              <button
                type="button"
                disabled={!formData.what.trim() || isGeneratingSubtasks}
                onClick={handleAIGenerateSubtasks}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
                title="Genera subtareas automáticamente basadas en la acción"
              >
                <Sparkles size={13} className={isGeneratingSubtasks ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                <span>{isGeneratingSubtasks ? 'Generando...' : '✨ Proponer subtareas con IA'}</span>
              </button>
            </div>

            {/* Quick add subtask row */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="text"
                  placeholder="Escribe el nombre de la subtarea (ej: Definir estándar...)"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-sm placeholder:text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Responsable (opc)"
                  value={newSubtaskWho}
                  onChange={(e) => setNewSubtaskWho(e.target.value)}
                  className="w-32 px-2.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-sm placeholder:text-slate-400"
                />
                <input
                  type="date"
                  value={newSubtaskDate}
                  onChange={(e) => setNewSubtaskDate(e.target.value)}
                  className="w-32 px-2 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubtask()}
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  <span>Agregar</span>
                </button>
              </div>

              {/* Subtask Verbs Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Verbo subtarea:
                </span>
                {COMMON_SUBTASK_VERBS.map((verb) => (
                  <button
                    key={verb}
                    type="button"
                    onClick={() => handleApplyVerbToSubtask(verb)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 border border-slate-200 transition-colors shrink-0"
                  >
                    +{verb}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtasks items list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
              {(formData.subtasks || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">
                  No hay subtareas añadidas. Puedes añadirlas o usar "Proponer subtareas con IA".
                </p>
              ) : (
                formData.subtasks?.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={(e) => {
                          const updated = (formData.subtasks || []).map((s) =>
                            s.id === sub.id ? { ...s, completed: e.target.checked } : s
                          );
                          setFormData({ ...formData, subtasks: updated });
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer shrink-0"
                      />
                      <span
                        className={`truncate ${
                          sub.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-900 font-bold'
                        }`}
                      >
                        {idx + 1}. {sub.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600 shrink-0 font-medium">
                      {sub.responsible && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">{sub.responsible}</span>
                      )}
                      {sub.dueDate && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">{sub.dueDate}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(sub.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Se guardará automáticamente en el A3</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>{actionToEdit ? 'Guardar Cambios' : 'Crear Acción 5W2H'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal de confirmación ante cierre con cambios sin guardar */}
        {showConfirmClose && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ¿Deseas guardar los cambios antes de salir?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tienes información escrita en esta acción 5W2H que no ha sido guardada.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAndClose}
                  className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save size={15} />
                  <span>Guardar y Salir</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndClose}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={15} />
                  <span>Descartar Cambios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClose(false)}
                  className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Continuar Editando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default A3ActionModal;
