import React, { useState } from 'react';
import {
  Maximize2,
  X,
  FileText,
  Target,
  Search,
  Zap,
  CheckSquare,
  TrendingUp,
  Layout,
  GitBranch,
  BarChart2,
  Info,
  ChevronRight,
  ShieldCheck,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import type { A3Project, A3ActionPlanItem, A3FollowUpConfig } from '../../../types';
import A3Ishikawa from './A3Ishikawa';
import A3FiveWhys from './A3FiveWhys';
import A3Pareto from './A3Pareto';
import A3FollowUp from './A3FollowUp';
import A3ActionPlan5W2H from './A3ActionPlan5W2H';

interface A3BoardViewProps {
  a3: A3Project;
  onUpdate: (field: string, value: any) => void;
  users?: { name: string; email?: string }[];
}

export const A3BoardView: React.FC<A3BoardViewProps> = ({ a3, onUpdate, users = [] }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!a3) return null;

  // Calculate Action Plan Metrics
  const actions = (a3.action_plan || a3.actionPlan || []) as A3ActionPlanItem[];
  const completedActions = actions.filter((a) => a.status === 'completed').length;
  const planProgress =
    actions.length > 0
      ? Math.round(
          actions.reduce((acc, a) => acc + (a.progress || (a.status === 'completed' ? 100 : 0)), 0) /
            actions.length
        )
      : 0;

  const followUpCharts: A3FollowUpConfig[] = React.useMemo(() => {
    const raw = a3.follow_up_data || a3.followUpData;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) return [raw as A3FollowUpConfig];
    return [];
  }, [a3.follow_up_data, a3.followUpData]);

  return (
    <div className="bg-slate-100/70 p-4 md:p-6 rounded-3xl border border-slate-200 shadow-inner">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-md mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider">
              A3 Toyota Report
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                a3.status === 'Completado'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {a3.status || 'En Proceso'}
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">{a3.title || 'Proyecto A3'}</h1>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Líder / Responsable</span>
            <span className="font-bold text-white">{a3.responsible || 'Sin asignar'}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">Fecha de Inicio</span>
            <span className="font-bold text-white">{a3.date || 'Sin fecha'}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xs">
              {planProgress}%
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Avance 5W2H</span>
              <span className="font-bold text-white">{completedActions}/{actions.length} acciones</span>
            </div>
          </div>
        </div>
      </div>

      {/* A3 Standard 2-Column Grid (Left: Problem Definition & Analysis / Right: Countermeasures, 5W2H & Follow-Up) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COLUMN: 1. Contexto, 2. Situación Actual, 3. Meta, 4. Causa Raíz */}
        <div className="space-y-4">
          {/* Section 1: Contexto */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center">1</span>
                <span>Contexto y Antecedentes</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('context')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
                title="Ampliar sección"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {a3.background || 'Sin antecedentes definidos.'}
            </p>
          </div>

          {/* Section 2: Situación Actual */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 font-black text-[11px] flex items-center justify-center">2</span>
                <span>Situación Actual (Condición de Partida)</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('current')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
                title="Ampliar sección"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {a3.currentCondition || a3.current_condition || 'Sin descripción de la condición actual.'}
            </p>
            {(a3.currentConditionImageUrl || a3.current_condition_image_url) && (
              <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={a3.currentConditionImageUrl || a3.current_condition_image_url || ''}
                  alt="Situación Actual"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Section 3: Meta SMART */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-4 border border-emerald-200 shadow-sm relative group">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-emerald-200 text-emerald-800 font-black text-[11px] flex items-center justify-center">3</span>
                <span>Objetivo / Meta SMART</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('goal')}
                className="p-1 text-emerald-600 hover:text-emerald-800 rounded-lg"
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <p className="text-xs font-semibold text-emerald-900 leading-relaxed whitespace-pre-wrap">
              {a3.goal || 'Sin meta especificada.'}
            </p>
          </div>

          {/* Section 4: Análisis de Causa Raíz */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 font-black text-[11px] flex items-center justify-center">4</span>
                <span>Análisis de Causa Raíz (Ishikawa / 5 Whys)</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('analysis')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Causa Raíz Validada</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {a3.rootCause || a3.root_cause || 'En proceso de investigación'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ishikawa 6M:</span>
                  <span className="font-bold text-slate-700">{(a3.ishikawas || []).length} diag.</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">5 Porqués:</span>
                  <span className="font-bold text-slate-700">
                    {(a3.five_whys || a3.multipleFiveWhys || []).length} cadenas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 5. Contramedidas, 6. Plan 5W2H, 7. Seguimiento & Estandarización */}
        <div className="space-y-4">
          {/* Section 5: Contramedidas */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-700 font-black text-[11px] flex items-center justify-center">5</span>
                <span>Contramedidas Propuestas</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('countermeasures')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            {/* List preview */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {(a3.countermeasureList || a3.countermeasure_list || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay contramedidas listadas</p>
              ) : (
                (a3.countermeasureList || a3.countermeasure_list || []).slice(0, 4).map((cm, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <ShieldCheck size={13} className="text-cyan-600 shrink-0" />
                    <span className="font-medium text-slate-700 truncate">{cm.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6: Plan de Acción 5W2H Resumido */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[11px] flex items-center justify-center">6</span>
                <span>Plan de Acción 5W2H con Subtareas</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('plan')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            <div className="space-y-2">
              {actions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin acciones registradas</p>
              ) : (
                actions.slice(0, 4).map((act, i) => (
                  <div
                    key={act.id || i}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="truncate flex-1">
                      <span className="font-bold text-slate-800 truncate block">
                        {act.what || act.activity}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        👤 {act.who || act.responsible} • 📅 {act.when || act.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          act.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : act.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {act.progress || (act.status === 'completed' ? 100 : 0)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 7 & 8: Seguimiento y Estandarización */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative group hover:border-brand-400 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 font-black text-[11px] flex items-center justify-center">7</span>
                <span>Seguimiento y Estandarización</span>
              </span>
              <button
                type="button"
                onClick={() => setExpandedSection('followup')}
                className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            {/* List of KPIs in Board View */}
            {followUpCharts.length > 0 && (
              <div className="space-y-1.5 mb-2.5">
                {followUpCharts.map((ch, idx) => (
                  <div
                    key={ch.id || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp size={13} className="text-cyan-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">
                        {ch.kpiName || `Indicador #${idx + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ch.kpiGoal && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          Meta: {ch.kpiGoal}{ch.isPercentage ? '%' : ''}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {ch.dataPoints?.length || 0} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {a3.followUp || a3.follow_up_notes || 'Sin notas de estandarización o lecciones aprendidas.'}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Section Drill-Down Modal */}
      {expandedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Detalle de Sección: {expandedSection.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setExpandedSection(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {expandedSection === 'plan' && (
                <A3ActionPlan5W2H
                  actions={a3.action_plan || a3.actionPlan || []}
                  onChange={(acts) => onUpdate('action_plan', acts)}
                  users={users}
                />
              )}
              {expandedSection === 'analysis' && (
                <div className="space-y-6">
                  {(a3.ishikawas || []).map((ish, idx) => (
                    <A3Ishikawa
                      key={idx}
                      data={ish}
                      index={idx}
                      onChange={(f, val) => {
                        const next = [...(a3.ishikawas || [])];
                        next[idx] = { ...next[idx], [f]: val };
                        onUpdate('ishikawas', next);
                      }}
                    />
                  ))}
                  <A3FiveWhys
                    items={a3.five_whys || a3.multipleFiveWhys || []}
                    onChange={(items) => onUpdate('five_whys', items)}
                  />
                  <A3Pareto
                    data={a3.pareto_data || a3.paretoData || []}
                    onChange={(data) => onUpdate('pareto_data', data)}
                  />
                </div>
              )}
              {expandedSection === 'followup' && (
                <div className="space-y-6">
                  {followUpCharts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <TrendingUp size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">No hay gráficos de seguimiento registrados en este proyecto.</p>
                    </div>
                  ) : (
                    followUpCharts.map((fData, idx) => (
                      <A3FollowUp
                        key={fData.id || idx}
                        data={fData}
                        chartIndex={idx}
                        totalCharts={followUpCharts.length}
                        onChange={(fDataUpd) => {
                          const all = [...followUpCharts];
                          all[idx] = fDataUpd;
                          onUpdate('follow_up_data', all);
                        }}
                      />
                    ))
                  )}
                </div>
              )}
              {expandedSection === 'context' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Antecedentes del Proyecto</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {a3.background || 'Sin antecedentes'}
                  </p>
                </div>
              )}
              {expandedSection === 'current' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Condición Actual</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {a3.currentCondition || a3.current_condition || 'Sin condición actual'}
                  </p>
                </div>
              )}
              {expandedSection === 'goal' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Objetivo SMART</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    {a3.goal || 'Sin meta'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default A3BoardView;
