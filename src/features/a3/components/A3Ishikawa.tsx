import React, { useState } from 'react';
import { Plus, X, Fish, Maximize2, Minimize2, Check, ArrowRight, Sparkles } from 'lucide-react';
import type { A3IshikawaData, A3IshikawaCause } from '../../../types';

export const CATEGORIES = [
  { id: 'man', label: 'Mano de Obra', color: 'border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70', dot: 'bg-blue-500' },
  { id: 'machine', label: 'Máquina', color: 'border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100/70', dot: 'bg-red-500' },
  { id: 'material', label: 'Material', color: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70', dot: 'bg-emerald-500' },
  { id: 'method', label: 'Método', color: 'border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100/70', dot: 'bg-purple-500' },
  { id: 'measurement', label: 'Medición', color: 'border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100/70', dot: 'bg-amber-500' },
  { id: 'environment', label: 'Medio Ambiente', color: 'border-cyan-200 bg-cyan-50/70 text-cyan-700 hover:bg-cyan-100/70', dot: 'bg-cyan-500' },
];

type PriorityColor = 'neutral' | 'green' | 'yellow' | 'red';

export const PRIORITIES: Record<PriorityColor, { color: string; ring: string; label: string; next: PriorityColor; bg: string }> = {
  neutral: { color: 'bg-slate-300', ring: 'ring-slate-300', label: 'Sin priorizar (clic para priorizar)', next: 'green', bg: 'bg-slate-50' },
  green: { color: 'bg-emerald-500', ring: 'ring-emerald-400', label: 'Ocurre y es abordable', next: 'yellow', bg: 'bg-emerald-50 text-emerald-900 border-emerald-300' },
  yellow: { color: 'bg-amber-400', ring: 'ring-amber-300', label: 'Ocurre ocasionalmente', next: 'red', bg: 'bg-amber-50 text-amber-900 border-amber-300' },
  red: { color: 'bg-rose-500', ring: 'ring-rose-400', label: 'No ocurre / No abordable', next: 'neutral', bg: 'bg-rose-50 text-rose-900 border-rose-300 opacity-60' },
};

interface A3IshikawaProps {
  data: A3IshikawaData;
  onChange: (field: string, value: any) => void;
  onDelete?: () => void;
  index?: number;
  onPromoteTo5W2H?: (causeText: string, categoryLabel: string) => void;
}

export const A3Ishikawa: React.FC<A3IshikawaProps> = ({
  data,
  onChange,
  onDelete,
  index = 0,
  onPromoteTo5W2H,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [newCauseInputs, setNewCauseInputs] = useState<Record<string, string>>({});
  const [activeInputCat, setActiveInputCat] = useState<string | null>(null);

  const getCauseData = (cause: string | A3IshikawaCause): A3IshikawaCause => {
    if (typeof cause === 'string') {
      return { text: cause, color: 'neutral' };
    }
    return {
      text: cause.text,
      color: cause.color || 'neutral',
    };
  };

  const handleAddCause = (catId: string) => {
    const text = (newCauseInputs[catId] || '').trim();
    if (!text) return;

    const currentCauses = data.categories?.[catId] || [];
    const newCategories = {
      ...(data.categories || {}),
      [catId]: [...currentCauses, { text, color: 'neutral' as PriorityColor }],
    };
    onChange('categories', newCategories);
    setNewCauseInputs((prev) => ({ ...prev, [catId]: '' }));
    setActiveInputCat(null);
  };

  const handleRemoveCause = (catId: string, causeIdx: number) => {
    const currentCauses = data.categories?.[catId] || [];
    const newCauses = currentCauses.filter((_, i) => i !== causeIdx);
    const newCategories = {
      ...(data.categories || {}),
      [catId]: newCauses,
    };
    onChange('categories', newCategories);
  };

  const handleToggleColor = (catId: string, causeIdx: number) => {
    const currentCauses = data.categories?.[catId] || [];
    const cause = currentCauses[causeIdx];
    const causeData = getCauseData(cause);
    const nextColor = PRIORITIES[causeData.color || 'neutral'].next;

    const newCauses = [...currentCauses];
    newCauses[causeIdx] = {
      ...causeData,
      color: nextColor,
    };

    const newCategories = {
      ...(data.categories || {}),
      [catId]: newCauses,
    };
    onChange('categories', newCategories);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'fixed inset-4 z-50 flex flex-col shadow-2xl bg-white' : 'mb-6'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Fish size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Diagrama de Ishikawa (6M) {index > 0 ? `#${index + 1}` : ''}
            </h3>
            <p className="text-xs text-slate-500">
              Analiza causas potenciales categorizadas por Método, Mano de Obra, Máquina, Material, Medición y Entorno.
            </p>
          </div>
        </div>

        {/* Legend & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Priority legend */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Abordable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Ocasional
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> No Aplica
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Eliminar este Ishikawa"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Problem Statement Head */}
      <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-slate-100">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Efecto o Problema Principal (Cabeza de Pescado)
        </label>
        <input
          type="text"
          value={data.problem || ''}
          onChange={(e) => onChange('problem', e.target.value)}
          placeholder="Ej: Aumento del 15% en merma en la línea de envasado durante el turno 2"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
        />
      </div>

      {/* Fishbone Categories Grid */}
      <div className="p-5 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const causes = data.categories?.[cat.id] || [];
            const isInputActive = activeInputCat === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                        {causes.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveInputCat(isInputActive ? null : cat.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Añadir causa"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Causes List */}
                  <div className="space-y-2 mb-3">
                    {causes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-2 text-center">
                        Sin causas registradas
                      </p>
                    ) : (
                      causes.map((cause, causeIdx) => {
                        const causeData = getCauseData(cause);
                        const priorityInfo = PRIORITIES[causeData.color || 'neutral'];

                        return (
                          <div
                            key={causeIdx}
                            className={`group relative flex items-start gap-2 p-2 rounded-lg border text-xs transition-all ${
                              causeData.color !== 'neutral' ? priorityInfo.bg : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            {/* Color toggle button */}
                            <button
                              type="button"
                              onClick={() => handleToggleColor(cat.id, causeIdx)}
                              className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${priorityInfo.color} ring-2 ${priorityInfo.ring} transition-transform hover:scale-125`}
                              title={`Prioridad: ${priorityInfo.label} (clic para cambiar)`}
                            />

                            <span className="flex-1 break-words font-medium leading-snug">
                              {causeData.text}
                            </span>

                            {/* Actions on hover */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              {onPromoteTo5W2H && (
                                <button
                                  type="button"
                                  onClick={() => onPromoteTo5W2H(causeData.text, cat.label)}
                                  className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"
                                  title="Crear Acción 5W2H desde esta causa"
                                >
                                  <ArrowRight size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveCause(cat.id, causeIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors"
                                title="Eliminar causa"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Inline Quick Add Input */}
                {isInputActive && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 animate-fadeIn">
                    <input
                      type="text"
                      autoFocus
                      placeholder={`Causa en ${cat.label.toLowerCase()}...`}
                      value={newCauseInputs[cat.id] || ''}
                      onChange={(e) =>
                        setNewCauseInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCause(cat.id);
                        } else if (e.key === 'Escape') {
                          setActiveInputCat(null);
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-brand-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCause(cat.id)}
                      className="px-2 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-xs font-bold"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Root Cause Identification Summary Box */}
        <div className="mt-5 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
              <Sparkles size={16} />
            </span>
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Causa Raíz Identificada (Conclusión del Ishikawa)
            </label>
          </div>
          <input
            type="text"
            value={data.rootCause || ''}
            onChange={(e) => onChange('rootCause', e.target.value)}
            placeholder="Especifica la causa raíz principal validada que será tratada en el Plan de Acción 5W2H..."
            className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};

export default A3Ishikawa;
