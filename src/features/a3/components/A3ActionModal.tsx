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
} from 'lucide-react';
import type { A3ActionPlanItem, A3Subtask, A3PlanGroup } from '../../../types';

interface A3ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: A3ActionPlanItem) => void;
  actionToEdit?: A3ActionPlanItem | null;
  users?: { name: string; email?: string }[];
  planGroups: A3PlanGroup[];
  activePlanId: string;
  countermeasures?: string[];
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

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskWho, setNewSubtaskWho] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState('');

  useEffect(() => {
    if (actionToEdit) {
      setFormData({
        ...actionToEdit,
        what: actionToEdit.what || actionToEdit.activity || '',
        who: actionToEdit.who || actionToEdit.responsible || '',
        when: actionToEdit.when || actionToEdit.date || new Date().toISOString().split('T')[0],
        planId: actionToEdit.planId || activePlanId,
        subtasks: actionToEdit.subtasks || [],
      });
    } else {
      setFormData({
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
      });
    }
    setNewSubtaskTitle('');
  }, [actionToEdit, activePlanId, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSub: A3Subtask = {
      id: Date.now() + Math.random(),
      title: newSubtaskTitle.trim(),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.what.trim()) {
      alert('El campo "Qué (What)" es obligatorio.');
      return;
    }
    if (!formData.who.trim()) {
      alert('Debes asignar un responsable a la acción.');
      return;
    }

    // Auto-compute progress from subtasks if available
    let progress = formData.progress || 0;
    const subtasks = formData.subtasks || [];
    if (subtasks.length > 0) {
      const completedCount = subtasks.filter((s) => s.completed).length;
      progress = Math.round((completedCount / subtasks.length) * 100);
    }

    onSave({
      ...formData,
      // Backwards compatibility aliases
      activity: formData.what,
      responsible: formData.who,
      date: formData.when,
      progress,
    });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
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
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
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
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1. ¿QUÉ se va a hacer? (What) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={formData.what}
                onChange={(e) => setFormData({ ...formData, what: e.target.value })}
                placeholder="Describe con claridad la acción concreta a ejecutar..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
              />
            </div>

            {/* 2. WHY */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle size={13} className="text-slate-400" />
                  <span>2. ¿POR QUÉ se hace? (Why)</span>
                </label>
                {countermeasures.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    O vincula a una contramedida detectada
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formData.why || ''}
                onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                placeholder="Justificación, causa raíz que neutraliza o impacto esperado..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none mb-1.5 shadow-sm"
              />
              {countermeasures.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {countermeasures.slice(0, 4).map((cm, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          why: cm,
                          countermeasures: [cm],
                        }))
                      }
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-medium border border-indigo-200 truncate max-w-xs transition-colors"
                      title={cm}
                    >
                      + Usar: {cm}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* WHO, WHEN, WHERE Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 3. WHO */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <User size={13} className="text-slate-400" />
                  <span>3. ¿QUIÉN lo hará? (Who)</span> <span className="text-rose-500">*</span>
                </label>
                {users.length > 0 ? (
                  <input
                    type="text"
                    list="users-list"
                    required
                    value={formData.who}
                    onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                    placeholder="Responsable directo..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.who}
                    onChange={(e) => setFormData({ ...formData, who: e.target.value })}
                    placeholder="Responsable directo..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                  />
                )}
                <datalist id="users-list">
                  {users.map((u, i) => (
                    <option key={i} value={u.name} />
                  ))}
                </datalist>
              </div>

              {/* 4. WHEN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span>4. ¿CUÁNDO se cumplirá? (When)</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.when}
                  onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                />
              </div>

              {/* 5. WHERE */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>5. ¿DÓNDE se aplicará? (Where)</span>
                </label>
                <input
                  type="text"
                  value={formData.where || ''}
                  onChange={(e) => setFormData({ ...formData, where: e.target.value })}
                  placeholder="Área, línea, puesto o máquina..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: The 2 H's */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
              <span>Dimensión 2H (How, How Much)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HOW */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  6. ¿CÓMO se ejecutará? (How - Método / Estándar)
                </label>
                <textarea
                  rows={2}
                  value={formData.how || ''}
                  onChange={(e) => setFormData({ ...formData, how: e.target.value })}
                  placeholder="Procedimiento, estándar POE, herramientas o especificaciones técnicas..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                />
              </div>

              {/* HOW MUCH */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <DollarSign size={13} className="text-slate-400" />
                  <span>7. ¿CUÁNTO costará? (How Much - Presupuesto / Recursos)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.howMuch || ''}
                  onChange={(e) => setFormData({ ...formData, howMuch: e.target.value })}
                  placeholder="Ej: $150.000 CLP, 4 horas de mantenimiento o materiales..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Subtasks (Subtareas para lograr la acción) */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ListTodo size={15} className="text-brand-600" />
                <span>Subtareas Operativas ({(formData.subtasks || []).length})</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Divide esta acción en pasos concretos para medir el avance
              </span>
            </div>

            {/* Quick add subtask row */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="text"
                placeholder="Escribe el nombre de la subtarea..."
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

            {/* Subtasks items list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
              {(formData.subtasks || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-2">
                  No hay subtareas añadidas. Puedes crearlas ahora o en el panel interactivo del plan.
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
                onClick={onClose}
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
      </div>
    </div>,
    document.body
  );
};

export default A3ActionModal;
