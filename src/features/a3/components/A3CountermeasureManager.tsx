import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Edit2, Check, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { improveA3FieldText } from '../../../services/geminiService';

interface CountermeasureItem {
  id: number | string;
  title: string;
}

interface A3CountermeasureManagerProps {
  items?: CountermeasureItem[];
  onChange: (items: CountermeasureItem[]) => void;
  onSendTo5W2H?: (title: string) => void;
  rootCause?: string;
}

export const A3CountermeasureManager: React.FC<A3CountermeasureManagerProps> = ({
  items = [],
  onChange,
  onSendTo5W2H,
  rootCause,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);

  const handleAIPolish = async () => {
    if (!newTitle.trim()) {
      toast.error('Escribe primero una idea o borrador de la contramedida para pulirla.');
      return;
    }
    setIsPolishing(true);
    try {
      const polished = await improveA3FieldText('countermeasure', newTitle, {
        rootCause: rootCause,
      });
      if (polished && polished.trim()) {
        setNewTitle(polished);
        toast.success('✨ Contramedida optimizada con estándar Lean');
      }
    } catch (err: any) {
      toast.error('No se pudo pulir la contramedida con IA.');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: CountermeasureItem = {
      id: Date.now(),
      title: newTitle.trim(),
    };
    onChange([...items, newItem]);
    setNewTitle('');
  };

  const handleDelete = (id: number | string) => {
    if (!window.confirm('¿Eliminar esta contramedida?')) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const handleStartEdit = (item: CountermeasureItem) => {
    setEditingId(item.id);
    setEditingText(item.title);
  };

  const handleSaveEdit = (id: number | string) => {
    if (!editingText.trim()) return;
    onChange(
      items.map((item) => (item.id === id ? { ...item, title: editingText.trim() } : item))
    );
    setEditingId(null);
    setEditingText('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Contramedidas Propuestas
            </h3>
            <p className="text-xs text-slate-500">
              Soluciones estructuradas para erradicar las causas raíz identificadas.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-xl">
          {items.length} Contramedidas activas
        </span>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Escribe una nueva contramedida (ej: Instalar poka-yoke en sensor de llenado)..."
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-800 placeholder-slate-400"
        />
        <button
          type="button"
          disabled={!newTitle.trim() || isPolishing}
          onClick={handleAIPolish}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          title="Optimiza la redacción con verbo en infinitivo según estándar Lean"
        >
          <Sparkles size={13} className={isPolishing ? 'animate-spin' : ''} />
          <span>{isPolishing ? 'Corrigiendo...' : '✨ IA Corregir'}</span>
        </button>
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <Plus size={15} />
          <span>Agregar</span>
        </button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShieldCheck className="mx-auto text-slate-300 mb-1" size={28} />
            <p className="text-xs text-slate-500 font-medium">
              No hay contramedidas registradas. Agrega las soluciones que atacarán la causa raíz.
            </p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-brand-500 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-700 leading-snug">
                    {item.title}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onSendTo5W2H && (
                  <button
                    type="button"
                    onClick={() => onSendTo5W2H(item.title)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold border border-brand-200 transition-colors"
                    title="Crear una acción 5W2H a partir de esta contramedida"
                  >
                    <Sparkles size={12} />
                    <span className="hidden sm:inline">Llevar a 5W2H</span>
                    <ArrowRight size={12} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
                  title="Editar contramedida"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                  title="Eliminar contramedida"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default A3CountermeasureManager;
