import React from 'react';
import { Plus, Trash2, Zap, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { VSMStep, VSMMetrics } from '../types';

interface VSMSawtoothTimelineProps {
  steps: VSMStep[];
  metrics: VSMMetrics;
  isEditing: boolean;
  onUpdateStep: (index: number, updated: VSMStep) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onTriggerKaizenBurst: (step: VSMStep) => void;
}

export const VSMSawtoothTimeline: React.FC<VSMSawtoothTimelineProps> = ({
  steps,
  metrics,
  isEditing,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onTriggerKaizenBurst,
}) => {
  return (
    <div className="space-y-6">
      {/* Process Flow Cards (Horizontal scroll) */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>Flujo de Procesos y Cajas de Datos Lean (Data Boxes)</span>
          </h4>
          {isEditing && (
            <button
              type="button"
              onClick={onAddStep}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Agregar Etapa</span>
            </button>
          )}
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300">
          {steps.map((step, idx) => {
            const isBottleneck = metrics.bottleneckStep?.id === step.id;
            const isOverTakt = step.cycleTime > metrics.taktTimeSeconds;

            return (
              <React.Fragment key={step.id || idx}>
                {/* Process Step Box */}
                <div
                  className={`min-w-[240px] max-w-[270px] flex-shrink-0 bg-white rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    isBottleneck
                      ? 'border-rose-400 ring-2 ring-rose-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Step Header */}
                  <div
                    className={`p-3 border-b flex items-center justify-between rounded-t-xl ${
                      isBottleneck ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => onUpdateStep(idx, { ...step, name: e.target.value })}
                          className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 w-full outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-bold text-xs text-slate-800 truncate" title={step.name}>
                          {step.name}
                        </span>
                      )}
                    </div>

                    {isEditing && steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveStep(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                        title="Eliminar etapa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Data Box Metrics Table */}
                  <div className="p-3 text-xs space-y-2">
                    {/* C/T (Cycle Time) */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        C/T (Tiempo Ciclo):
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={step.cycleTime}
                            onChange={(e) =>
                              onUpdateStep(idx, { ...step, cycleTime: Number(e.target.value) || 0 })
                            }
                            className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-black text-slate-800 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">s</span>
                        </div>
                      ) : (
                        <span
                          className={`font-black font-mono text-xs ${
                            isOverTakt ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {step.cycleTime}s
                        </span>
                      )}
                    </div>

                    {/* C/O (Changeover Time) */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        C/O (Setup/Cambio):
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={step.changeoverTime ?? 0}
                            onChange={(e) =>
                              onUpdateStep(idx, {
                                ...step,
                                changeoverTime: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-medium text-slate-800 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">min</span>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-700">
                          {step.changeoverTime ?? 0} min
                        </span>
                      )}
                    </div>

                    {/* Operarios */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Operarios (Op):
                      </span>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={step.operators ?? 1}
                          onChange={(e) =>
                            onUpdateStep(idx, {
                              ...step,
                              operators: Number(e.target.value) || 1,
                            })
                          }
                          className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-medium text-slate-800 text-xs"
                        />
                      ) : (
                        <span className="font-medium text-slate-700">
                          {step.operators ?? 1} op
                        </span>
                      )}
                    </div>

                    {/* Uptime / OEE */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Disponibilidad (Uptime):
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={step.uptime ?? 95}
                            onChange={(e) =>
                              onUpdateStep(idx, {
                                ...step,
                                uptime: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-medium text-slate-800 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">%</span>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-700">{step.uptime ?? 95}%</span>
                      )}
                    </div>

                    {/* WIP Buffer */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        Espera / WIP:
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={step.wipUnits ?? 0}
                            onChange={(e) =>
                              onUpdateStep(idx, {
                                ...step,
                                wipUnits: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-medium text-slate-800 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">u</span>
                        </div>
                      ) : (
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          {step.wipUnits ?? 0} unidades
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kaizen Burst Button / Trigger 💥 */}
                  <div className="p-2 bg-slate-50 border-t border-slate-200 rounded-b-xl flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onTriggerKaizenBurst(step)}
                      className={`w-full py-1.5 px-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        step.hasKaizenBurst || isBottleneck
                          ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 animate-pulse'
                          : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                      }`}
                      title="Generar Quick Win o Proyecto A3 a partir de esta etapa"
                    >
                      <Zap size={12} className="text-amber-700" />
                      <span>{step.hasKaizenBurst ? 'Ráfaga Kaizen 💥' : 'Crear Kaizen'}</span>
                    </button>
                  </div>
                </div>

                {/* Arrow between steps */}
                {idx < steps.length - 1 && (
                  <div className="flex flex-col items-center justify-center text-slate-300 shrink-0">
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Sawtooth (Dientes de Sierra) Timeline */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-black text-sm text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} />
              <span>Escalera de Tiempos en Diente de Sierra (Sawtooth Timeline)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Nivel superior: Tiempos de espera por inventario (No Valor Agregado) | Nivel inferior: Tiempo de procesamiento activo (Valor Agregado).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm inline-block"></span>
              <span>Espera / WIP (NVA)</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm inline-block"></span>
              <span>Proceso (VA)</span>
            </span>
          </div>
        </div>

        {/* Visual Sawtooth Graph */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="min-w-[650px] flex items-end">
            {steps.map((step, idx) => {
              const waitHours = Number(
                (step.waitTimeHours || (step.wipUnits ? (step.wipUnits * metrics.taktTimeSeconds) / 3600 : 1)).toFixed(1)
              );

              return (
                <div key={idx} className="flex-1 flex flex-col justify-end text-center">
                  {/* Upper Notch: Wait / WIP (NVA) */}
                  <div className="border-t-2 border-r-2 border-l-2 border-amber-400/80 bg-amber-400/10 py-1.5 px-1 rounded-t-md">
                    <span className="font-mono font-bold text-amber-300 text-xs block">
                      {waitHours}h
                    </span>
                    <span className="text-[9px] text-amber-200/60 uppercase">Espera</span>
                  </div>

                  {/* Lower Notch: Processing Cycle (VA) */}
                  <div className="border-b-2 border-r-2 border-l-2 border-cyan-400/80 bg-cyan-400/10 py-1.5 px-1 rounded-b-md">
                    <span className="font-mono font-black text-cyan-300 text-xs block">
                      {step.cycleTime}s
                    </span>
                    <span className="text-[9px] text-cyan-200/60 uppercase">VA</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Calculations Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Lead Time Total (Producción)
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-xl font-black font-mono text-white">
                {metrics.totalLeadTimeDays}
              </span>
              <span className="text-xs text-slate-400 font-bold">días ({metrics.totalLeadTimeHours}h)</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tiempo Total Valor Agregado (VA)
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-xl font-black font-mono text-cyan-400">
                {metrics.totalCycleTimeSeconds}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                segundos (~{(metrics.totalCycleTimeSeconds / 60).toFixed(1)} min)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Eficiencia del Ciclo (PCE %)
            </span>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-xl font-black font-mono text-emerald-400">
                {metrics.pcePercentage}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                (VA / Lead Time)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
