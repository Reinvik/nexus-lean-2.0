import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Layers,
  ArrowRight,
  FolderPlus,
  Loader2,
  Calendar,
  User,
  HelpCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { A3ActionPlanItem, A3PlanGroup } from '../../../types';
import { extractActionPlanFromText } from '../../../services/geminiService';

export interface ParsedActionRow {
  id: string;
  selected: boolean;
  what: string;
  who: string;
  when: string;
  why?: string;
  notes?: string;
}

interface A3BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: A3ActionPlanItem[], targetPlanId: string) => void;
  planGroups: A3PlanGroup[];
  activePlanId: string;
  projectTitle?: string;
  onUpdatePlansMeta?: (groups: A3PlanGroup[]) => void;
}

const MONTH_MAP: Record<string, string> = {
  ene: '01', enero: '01',
  feb: '02', febrero: '02',
  mar: '03', marzo: '03',
  abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06',
  jul: '07', julio: '07',
  ago: '08', agosto: '08',
  sep: '09', sept: '09', septiembre: '09',
  oct: '10', octubre: '10',
  nov: '11', noviembre: '11',
  dic: '12', diciembre: '12',
};

/**
 * Normaliza fechas comunes en actas (ej: "29-oct", "22/10", "Dos semanas", "Permanente")
 */
function normalizeDateString(raw: string): { formatted: string; note?: string } {
  if (!raw) return { formatted: '' };
  const cleaned = raw.trim();
  const lower = cleaned.toLowerCase();

  if (lower.includes('permanente') || lower.includes('continuo') || lower.includes('recurrente')) {
    return { formatted: 'Permanente', note: 'Plazo: Permanente' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  if (lower.includes('dos semana') || lower.includes('2 semana')) {
    const target = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const iso = target.toISOString().split('T')[0];
    return { formatted: iso, note: `Plazo acordado: Dos semanas (${iso})` };
  }
  if (lower.includes('una semana') || lower.includes('1 semana')) {
    const target = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const iso = target.toISOString().split('T')[0];
    return { formatted: iso, note: `Plazo acordado: Una semana (${iso})` };
  }

  // Patrón "29-oct", "22-octubre", "22 oct", "29/oct"
  const dayMonthMatch = lower.match(/^(\d{1,2})[\s\-\/\.de\s]+([a-záéíóú]{3,10})(?:[\s\-\/\.de\s]+(\d{2,4}))?$/);
  if (dayMonthMatch) {
    const day = dayMonthMatch[1].padStart(2, '0');
    const monStr = dayMonthMatch[2].substring(0, 3);
    const month = MONTH_MAP[monStr] || '10';
    const year = dayMonthMatch[3]
      ? dayMonthMatch[3].length === 2
        ? `20${dayMonthMatch[3]}`
        : dayMonthMatch[3]
      : `${currentYear}`;
    return { formatted: `${year}-${month}-${day}` };
  }

  // Patrón estándar DD/MM/YYYY o DD-MM-YYYY
  const numericDate = lower.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (numericDate) {
    const day = numericDate[1].padStart(2, '0');
    const month = numericDate[2].padStart(2, '0');
    const year = numericDate[3]
      ? numericDate[3].length === 2
        ? `20${numericDate[3]}`
        : numericDate[3]
      : `${currentYear}`;
    return { formatted: `${year}-${month}-${day}` };
  }

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return { formatted: cleaned };
  }

  return { formatted: cleaned };
}

/**
 * Parser inteligente de tablas y texto copiado (TSV, CSV, Markdown, viñetas)
 */
export function parsePastedActionPlan(text: string): ParsedActionRow[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedActionRow[] = [];

  let isFirstLineHeader = false;
  if (rawLines.length > 0) {
    const firstLower = rawLines[0].toLowerCase();
    if (
      (firstLower.includes('tarea') || firstLower.includes('actividad') || firstLower.includes('accion')) &&
      (firstLower.includes('responsable') || firstLower.includes('plazo') || firstLower.includes('fecha'))
    ) {
      isFirstLineHeader = true;
    }
  }

  const lines = isFirstLineHeader ? rawLines.slice(1) : rawLines;

  lines.forEach((line, idx) => {
    let what = '';
    let who = '';
    let when = '';

    // 1. Separado por tabuladores (copiado directo de Excel o Google Sheets)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        what = parts[0];
        who = parts[1];
        when = parts[2] || '';
      }
    }
    // 2. Separado por tubería (| Markdown table)
    else if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        what = parts[0];
        who = parts[1];
        when = parts[2] || '';
      }
    }
    // 3. Separado por punto y coma (CSV)
    else if (line.includes(';')) {
      const parts = line.split(';').map((p) => p.trim());
      if (parts.length >= 2) {
        what = parts[0];
        who = parts[1];
        when = parts[2] || '';
      }
    }
    // 4. Formato lista con guión o viñetas: "Tarea - Responsable - Plazo"
    else if (line.includes(' - ')) {
      const parts = line.split(' - ').map((p) => p.trim());
      if (parts.length >= 2) {
        what = parts[0].replace(/^[\d\.\-\*\•\s]+/, '').trim();
        who = parts[1];
        when = parts[2] || '';
      }
    }
    // 5. Formato genérico de una sola línea
    else {
      what = line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
      who = 'Por asignar';
      when = 'Por definir';
    }

    if (what) {
      const { formatted: normDate, note } = normalizeDateString(when);
      rows.push({
        id: `row-${Date.now()}-${idx}`,
        selected: true,
        what,
        who: who || 'Por asignar',
        when: normDate || when || 'Por definir',
        why: 'Acuerdo de reunión A3',
        notes: note,
      });
    }
  });

  return rows;
}

export const A3BatchImportModal: React.FC<A3BatchImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  planGroups,
  activePlanId,
  projectTitle = 'A3 Lean',
  onUpdatePlansMeta,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activePlanId === 'all' ? (planGroups[0]?.id || 'main') : activePlanId
  );
  const [parsedRows, setParsedRows] = useState<ParsedActionRow[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreatingNewPlan, setIsCreatingNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  // Analiza el texto localmente en tiempo real cuando el usuario escribe o pega
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPastedText(val);
    const parsed = parsePastedActionPlan(val);
    setParsedRows(parsed);
  };

  // Análisis asistido por IA (Gemini) para actas no tabuladas o transcripciones complejas
  const handleAnalyzeWithAI = async () => {
    if (!pastedText.trim()) {
      toast.error('Pega primero el texto o acta a analizar');
      return;
    }

    setIsAiLoading(true);
    const toastId = toast.loading('Analizando texto del acta con IA...');

    try {
      const aiItems = await extractActionPlanFromText(pastedText, { projectTitle });
      if (aiItems && aiItems.length > 0) {
        const rows: ParsedActionRow[] = aiItems.map((item, idx) => {
          const { formatted: normDate, note } = normalizeDateString(item.when || '');
          return {
            id: `ai-${Date.now()}-${idx}`,
            selected: true,
            what: item.what,
            who: item.who || 'Por asignar',
            when: normDate || item.when || 'Por definir',
            why: item.why || 'Acuerdo de reunión A3',
            notes: note,
          };
        });
        setParsedRows(rows);
        toast.success(`¡IA reconoció ${rows.length} planes de acción!`, { id: toastId });
      } else {
        // Fallback local si la IA no devolvió filas
        const fallback = parsePastedActionPlan(pastedText);
        setParsedRows(fallback);
        toast('Se utilizó el analizador sintáctico local', { id: toastId, icon: 'ℹ️' });
      }
    } catch {
      const fallback = parsePastedActionPlan(pastedText);
      setParsedRows(fallback);
      toast.error('Error con IA, se aplicó análisis de tabla local', { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Toggle selección de una fila
  const handleToggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  // Seleccionar / Deseleccionar todas
  const handleToggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  // Editar campo de una fila
  const handleUpdateRowField = (id: string, field: 'what' | 'who' | 'when' | 'why', value: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Eliminar una fila
  const handleDeleteRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Agregar fila manual
  const handleAddManualRow = () => {
    const newRow: ParsedActionRow = {
      id: `manual-${Date.now()}`,
      selected: true,
      what: '',
      who: 'Por asignar',
      when: new Date().toISOString().split('T')[0],
      why: 'Acuerdo de reunión A3',
    };
    setParsedRows((prev) => [...prev, newRow]);
  };

  // Crear nuevo grupo de plan al vuelo
  const handleCreateNewPlanGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    const newGroup: A3PlanGroup = {
      id: `plan-${Date.now()}`,
      name: newPlanName.trim(),
      color: 'indigo',
    };

    if (onUpdatePlansMeta) {
      onUpdatePlansMeta([...planGroups, newGroup]);
    }
    setSelectedPlanId(newGroup.id);
    setIsCreatingNewPlan(false);
    setNewPlanName('');
    toast.success(`Plan "${newGroup.name}" creado`);
  };

  const selectedCount = parsedRows.filter((r) => r.selected && r.what.trim()).length;
  const targetPlanName =
    planGroups.find((g) => g.id === selectedPlanId)?.name || 'Plan de Acción';

  // Confirmar e importar
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.selected && r.what.trim());
    if (validRows.length === 0) {
      toast.error('No hay tareas seleccionadas para importar');
      return;
    }

    const now = Date.now();
    const createdItems: A3ActionPlanItem[] = validRows.map((row, idx) => {
      const id = now + idx * 10;
      return {
        id,
        planId: selectedPlanId,
        planName: targetPlanName,
        what: row.what.trim(),
        activity: row.what.trim(),
        who: row.who.trim() || 'Por asignar',
        responsible: row.who.trim() || 'Por asignar',
        when: row.when.trim() || 'Por definir',
        date: row.when.trim() || 'Por definir',
        why: row.why?.trim() || 'Acuerdo de reunión A3',
        notes: row.notes,
        status: 'pending',
        progress: 0,
        subtasks: [],
        images: [],
        image_urls: [],
        countermeasures: [row.why?.trim() || 'Acuerdo de reunión A3'],
        countermeasure: row.why?.trim() || 'Acuerdo de reunión A3',
        createdAt: new Date().toISOString(),
      };
    });

    onImport(createdItems, selectedPlanId);
    toast.success(`Se agregaron ${createdItems.length} acciones a "${targetPlanName}"`, {
      icon: '🚀',
      duration: 3500,
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-cyan-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shadow-xs">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Pegar e Importar Plan de Acción</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                  Lector Inteligente
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pega una tabla copiada de Excel/Sheets, notas de WhatsApp o el acta transcrita de la reunión.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Target Plan Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers size={14} className="text-cyan-600" />
                <span>Plan de Destino en el Proyecto A3</span>
              </label>

              {!isCreatingNewPlan && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPlan(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FolderPlus size={13} />
                  <span>+ Crear nuevo plan</span>
                </button>
              )}
            </div>

            {isCreatingNewPlan ? (
              <form onSubmit={handleCreateNewPlanGroup} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ej: Reunión A3, Plan 5S, Plan de Contención..."
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-brand-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
                >
                  Guardar Plan
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewPlan(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {planGroups.map((group) => {
                  const isSelected = selectedPlanId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedPlanId(group.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{group.name}</span>
                      {isSelected && <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Paste Input Area */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={14} className="text-cyan-600" />
                <span>Pega aquí la tabla o acta de reunión</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnalyzeWithAI}
                  disabled={isAiLoading || !pastedText.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Utiliza Gemini AI para extraer tareas de texto libre o párrafos"
                >
                  {isAiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isAiLoading ? 'Analizando...' : '✨ Analizar con IA'}</span>
                </button>

                {pastedText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText('');
                      setParsedRows([]);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={pastedText}
              onChange={handleTextChange}
              placeholder={`Ejemplo de formato soportado:\nTarea\tResponsable\tPlazo\nSubir fotografías de auditoría\tNataly\t22-oct\nFormalizar reutilización de cajas\tFernando Ramos\t29-oct\nRebajar en sistema cantidades\tControl de Existencias\tPermanente`}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none leading-relaxed text-slate-800 resize-y"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>
                💡 Soporta copy-paste directo desde <strong>Excel</strong>, <strong>Google Sheets</strong>, <strong>Word</strong>, o notas tipo viñetas.
              </span>
              <span>
                {parsedRows.length} {parsedRows.length === 1 ? 'tarea detectada' : 'tareas detectadas'}
              </span>
            </div>
          </div>

          {/* Parsed Actions Preview Table */}
          {parsedRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-800">
                    Vista Previa de Tareas a Importar ({selectedCount} de {parsedRows.length} seleccionadas)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Deseleccionar todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Agregar fila</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      <th className="py-2.5 px-3 w-10 text-center">✓</th>
                      <th className="py-2.5 px-3 min-w-[260px]">Tarea (Qué se hará)</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Responsable (Quién)</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Plazo / Fecha (Cuándo)</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Justificación (Por qué)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          row.selected ? 'hover:bg-cyan-50/30' : 'opacity-40 bg-slate-50/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRow(row.id)}
                            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.what}
                            onChange={(e) => handleUpdateRowField(row.id, 'what', e.target.value)}
                            placeholder="Descripción de la tarea..."
                            className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-transparent rounded-lg border border-transparent hover:border-slate-300 focus:border-cyan-500 focus:bg-white outline-none transition-all"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.who}
                            onChange={(e) => handleUpdateRowField(row.id, 'who', e.target.value)}
                            placeholder="Nombre del responsable..."
                            className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-transparent rounded-lg border border-transparent hover:border-slate-300 focus:border-cyan-500 focus:bg-white outline-none transition-all"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.when}
                            onChange={(e) => handleUpdateRowField(row.id, 'when', e.target.value)}
                            placeholder="YYYY-MM-DD o Permanente..."
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-700 bg-transparent rounded-lg border border-transparent hover:border-slate-300 focus:border-cyan-500 focus:bg-white outline-none transition-all"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.why || ''}
                            onChange={(e) => handleUpdateRowField(row.id, 'why', e.target.value)}
                            placeholder="Motivo o contramedida..."
                            className="w-full px-2.5 py-1.5 text-xs text-slate-600 bg-transparent rounded-lg border border-transparent hover:border-slate-300 focus:border-cyan-500 focus:bg-white outline-none transition-all"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar de la lista"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Importar {selectedCount} Acciones a "{targetPlanName}"</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default A3BatchImportModal;
