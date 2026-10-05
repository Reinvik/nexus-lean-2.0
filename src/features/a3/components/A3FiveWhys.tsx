import React from 'react';
import { Target, Trash2, Plus, ArrowRight, CheckCircle2, XCircle, HelpCircle, Sparkles } from 'lucide-react';
import type { A3FiveWhysItem } from '../../../types';

interface A3FiveWhysProps {
  items?: A3FiveWhysItem[];
  onChange: (items: A3FiveWhysItem[]) => void;
  onPromoteTo5W2H?: (rootCauseText: string) => void;
}

export const A3FiveWhys: React.FC<A3FiveWhysProps> = ({
  items = [],
  onChange,
  onPromoteTo5W2H,
}) => {
  const handleAddRow = (parentId: number | string | null = null, parentWhyIndex: number = -1) => {
    const newItem: A3FiveWhysItem = {
      id: Date.now(),
      problem: '',
      whys: ['', '', '', '', ''],
      status: 'neutral',
      parentId,
      parentWhyIndex,
    };
    onChange([...items, newItem]);
  };

  const handleDeleteRow = (index: number) => {
    if (!window.confirm('¿Eliminar esta línea de análisis de 5 Porqués?')) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof A3FiveWhysItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const updateWhy = (rowIndex: number, whyIndex: number, value: string) => {
    const newItems = [...items];
    const newWhys = [...(newItems[rowIndex].whys || ['', '', '', '', ''])];
    newWhys[whyIndex] = value;
    newItems[rowIndex].whys = newWhys;
    onChange(newItems);
  };

  const toggleStatus = (index: number) => {
    const statuses: A3FiveWhysItem['status'][] = ['neutral', 'root', 'discarded'];
    const currentStatus = items[index].status || 'neutral';
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    updateItem(index, 'status', nextStatus);
  };

  const getStatusStyles = (status: A3FiveWhysItem['status']) => {
    switch (status) {
      case 'root':
        return 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20';
      case 'discarded':
        return 'bg-slate-50 border-slate-200 opacity-60 grayscale';
      default:
        return 'bg-white border-slate-200 shadow-sm';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Método de los 5 Porqués (5 Whys)
            </h3>
            <p className="text-xs text-slate-500">
              Profundiza hasta encontrar la causa raíz subyacente. Haz clic en el indicador de estado para marcar una cadena como Causa Raíz.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleAddRow()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <Plus size={15} />
          <span>Nueva Cadena de Porqués</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          <Target className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-sm font-bold text-slate-600">No hay análisis de 5 Porqués creados</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Inicia un análisis para profundizar en las causas reales de las desviaciones.
          </p>
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            Comenzar 5 Porqués
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const lastFilledWhy = (item.whys || []).filter(Boolean).slice(-1)[0] || '';
            const isRoot = item.status === 'root';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${getStatusStyles(item.status)}`}
              >
                {/* Header row: Problem statement & status selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex-1 min-w-[260px] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={item.problem || ''}
                      onChange={(e) => updateItem(index, 'problem', e.target.value)}
                      placeholder="Problema inicial a profundizar..."
                      className="w-full px-3 py-1.5 bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 outline-none text-sm font-bold text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleStatus(index)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        item.status === 'root'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                          : item.status === 'discarded'
                          ? 'bg-slate-100 border-slate-300 text-slate-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Haz clic para alternar: Neutro -> Causa Raíz -> Descartado"
                    >
                      {item.status === 'root' && <CheckCircle2 size={14} className="text-emerald-600" />}
                      {item.status === 'discarded' && <XCircle size={14} className="text-slate-400" />}
                      {item.status === 'neutral' && <HelpCircle size={14} className="text-slate-400" />}
                      <span>
                        {item.status === 'root'
                          ? 'Causa Raíz Confirmada'
                          : item.status === 'discarded'
                          ? 'Descartada'
                          : 'En Evaluación'}
                      </span>
                    </button>

                    {/* Promote to 5W2H button */}
                    {isRoot && onPromoteTo5W2H && lastFilledWhy && (
                      <button
                        type="button"
                        onClick={() => onPromoteTo5W2H(lastFilledWhy)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold shadow-sm hover:from-emerald-700 hover:to-teal-700"
                        title="Crear una acción 5W2H para resolver esta causa raíz"
                      >
                        <Sparkles size={12} />
                        <span>Pasar a Plan 5W2H</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar cadena"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* 5 Whys Flow Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                  {[0, 1, 2, 3, 4].map((whyIdx) => {
                    const isLast = whyIdx === 4;
                    const value = item.whys?.[whyIdx] || '';

                    return (
                      <div
                        key={whyIdx}
                        className={`flex flex-col rounded-xl p-2.5 border transition-all ${
                          isLast && isRoot
                            ? 'bg-emerald-100/60 border-emerald-300'
                            : 'bg-slate-50/80 border-slate-200 focus-within:border-brand-500 focus-within:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isLast && isRoot ? 'text-emerald-800' : 'text-slate-500'
                            }`}
                          >
                            {whyIdx === 0
                              ? '1. ¿Por qué?'
                              : whyIdx === 1
                              ? '2. ¿Por qué?'
                              : whyIdx === 2
                              ? '3. ¿Por qué?'
                              : whyIdx === 3
                              ? '4. ¿Por qué?'
                              : '5. Causa Raíz'}
                          </span>
                          {whyIdx < 4 && (
                            <ArrowRight size={12} className="text-slate-300 hidden md:block" />
                          )}
                        </div>

                        <textarea
                          rows={3}
                          value={value}
                          onChange={(e) => updateWhy(index, whyIdx, e.target.value)}
                          placeholder={
                            whyIdx === 0
                              ? '¿Por qué ocurrió el problema inicial?'
                              : `¿Por qué pasó el punto ${whyIdx}?`
                          }
                          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none resize-none font-medium leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default A3FiveWhys;
