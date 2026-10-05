import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Plus, Trash2, BarChart2, TrendingUp, Sparkles } from 'lucide-react';
import type { A3ParetoItem } from '../../../types';

interface A3ParetoProps {
  data?: A3ParetoItem[];
  onChange: (data: A3ParetoItem[]) => void;
  onPromoteTo5W2H?: (factorName: string) => void;
}

export const A3Pareto: React.FC<A3ParetoProps> = ({
  data = [],
  onChange,
  onPromoteTo5W2H,
}) => {
  const [items, setItems] = useState<A3ParetoItem[]>(data);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    setItems(data);
  }, [data]);

  const calculatePareto = (raw: A3ParetoItem[]) => {
    if (!raw || raw.length === 0) return [];
    const sorted = [...raw].sort((a, b) => Number(b.value) - Number(a.value));
    const total = sorted.reduce((sum, item) => sum + Number(item.value || 0), 0);
    if (total === 0) return sorted.map((s) => ({ ...s, cumulativePercentage: 0 }));

    let runningTotal = 0;
    return sorted.map((item) => {
      runningTotal += Number(item.value || 0);
      const cumulativePercentage = Math.round((runningTotal / total) * 100);
      return {
        ...item,
        percentage: Math.round((Number(item.value || 0) / total) * 100),
        cumulativePercentage,
      };
    });
  };

  const chartData = calculatePareto(items);
  const totalValue = items.reduce((sum, i) => sum + Number(i.value || 0), 0);

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim() || !newValue) return;

    const newItems = [...items, { name: newName.trim(), value: Math.abs(Number(newValue)) }];
    setItems(newItems);
    onChange(newItems);
    setNewName('');
    setNewValue('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Diagrama de Pareto (80/20)</h3>
            <p className="text-xs text-slate-500">
              Identifica los pocos factores vitales (80% del impacto) frente a los muchos triviales.
            </p>
          </div>
        </div>

        {totalValue > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <span>Total Acumulado:</span>
            <span className="text-brand-600 font-bold">{totalValue.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & Data Table (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Quick Input Form */}
          <form onSubmit={handleAddItem} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Agregar Factor / Defecto
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Nombre del factor..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Frecuencia / Costo"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || !newValue}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Añadir al Pareto</span>
            </button>
          </form>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Factor</th>
                  <th className="p-2.5 text-right">Cant.</th>
                  <th className="p-2.5 text-right">% Acum.</th>
                  <th className="p-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {chartData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                      Agrega factores para generar el gráfico
                    </td>
                  </tr>
                ) : (
                  chartData.map((item, idx) => {
                    const isVital = (item.cumulativePercentage || 0) <= 80;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isVital ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <td className="p-2.5 flex items-center gap-1.5">
                          {isVital && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" title="Factor vital (80/20)" />
                          )}
                          <span className="font-semibold truncate max-w-[140px]">{item.name}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold">{item.value}</td>
                        <td className="p-2.5 text-right font-semibold text-slate-500">
                          {item.cumulativePercentage}%
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {onPromoteTo5W2H && (
                              <button
                                type="button"
                                onClick={() => onPromoteTo5W2H(item.name)}
                                className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                                title="Llevar a Plan 5W2H"
                              >
                                <Sparkles size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recharts Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Curva de Frecuencia y Porcentaje Acumulado</span>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm bg-cyan-500" /> Frecuencia
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-rose-500" /> % Acumulado (80%)
              </span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[260px]">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart2 size={36} className="text-slate-300 mb-2" />
                <p className="text-xs">No hay datos suficientes para graficar</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <ReferenceLine
                    yAxisId="right"
                    y={80}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{ value: 'Corte 80%', fill: '#f43f5e', fontSize: 10, position: 'right' }}
                  />
                  <Bar yAxisId="left" dataKey="value" radius={[4, 4, 0, 0]} name="Valor">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={(entry.cumulativePercentage || 0) <= 80 ? '#06b6d4' : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePercentage"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f43f5e' }}
                    name="% Acumulado"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default A3Pareto;
