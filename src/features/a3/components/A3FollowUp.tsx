import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  TrendingUp,
  Settings,
  Calendar,
  Target,
  Gauge,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { A3FollowUpConfig, A3FollowUpDataPoint } from '../../../types';

interface A3FollowUpProps {
  data?: A3FollowUpConfig;
  onChange: (data: A3FollowUpConfig) => void;
  onDelete?: () => void;
  chartIndex?: number;
  totalCharts?: number;
}

export const A3FollowUp: React.FC<A3FollowUpProps> = ({
  data = {},
  onChange,
  onDelete,
  chartIndex = 0,
  totalCharts = 1,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newValue, setNewValue] = useState('');

  const {
    id: chartId,
    kpiName = `Indicador #${chartIndex + 1}`,
    kpiGoal = '',
    goalType = 'maximize',
    interventionDate = '',
    dataPoints = [],
  } = data;

  const isPercentage = data.isPercentage ?? (data.dataType === 'percentage' ? true : false);

  const gradientId = useMemo(
    () => `kpiGrad-${chartId || chartIndex || 'default'}`,
    [chartId, chartIndex]
  );

  const sortedPoints = useMemo(() => {
    return [...dataPoints]
      .map((p) => ({
        ...p,
        value: typeof p.value === 'string' ? parseFloat(p.value) : p.value,
      }))
      .filter((p) => p.value !== null && p.value !== undefined && !isNaN(p.value))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dataPoints]);

  const handleAddDataPoint = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDate || !newValue) return;

    const newPoint: A3FollowUpDataPoint = {
      id: Date.now(),
      date: newDate,
      value: Number(newValue),
    };

    const nextPoints = [...dataPoints, newPoint];
    onChange({
      ...data,
      dataPoints: nextPoints,
    });
    setNewValue('');
  };

  const handleRemovePoint = (id: number) => {
    const nextPoints = dataPoints.filter((p) => p.id !== id);
    onChange({
      ...data,
      dataPoints: nextPoints,
    });
  };

  // Calculate improvement delta
  const stats = useMemo(() => {
    if (sortedPoints.length < 2) return null;
    const initial = sortedPoints[0].value;
    const latest = sortedPoints[sortedPoints.length - 1].value;
    const delta = latest - initial;
    const isImproved = goalType === 'maximize' ? delta > 0 : delta < 0;
    return { initial, latest, delta, isImproved };
  }, [sortedPoints, goalType]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {kpiName || `Gráfico #${chartIndex + 1}`}
              </h3>
              {totalCharts > 1 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  #{chartIndex + 1} de {totalCharts}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {kpiGoal ? `Meta: ${kpiGoal}${isPercentage ? '%' : ''} • ` : ''}
              {goalType === 'maximize' ? 'Mayor es mejor (Maximizar)' : 'Menor es mejor (Minimizar)'}
              {interventionDate ? ` • Kaizen: ${interventionDate}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stats && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                stats.isImproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {stats.isImproved ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>
                Evolución: {stats.delta > 0 ? `+${stats.delta.toFixed(1)}` : stats.delta.toFixed(1)}
                {isPercentage ? '%' : ''}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Settings size={14} />
            <span>Configurar KPI</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Eliminar este gráfico"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Configuration Panel */}
      {showConfig && (
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del KPI</label>
            <input
              type="text"
              value={kpiName}
              onChange={(e) => onChange({ ...data, kpiName: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ej: OEE, OTIF, SOB/FALT..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Meta del Indicador</label>
            <input
              type="number"
              step="any"
              value={kpiGoal}
              onChange={(e) => onChange({ ...data, kpiGoal: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Ej: 93 o 0.02"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección de Mejora</label>
            <select
              value={goalType}
              onChange={(e) => onChange({ ...data, goalType: e.target.value as any })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="maximize">Maximizar (Mayor es mejor)</option>
              <option value="minimize">Minimizar (Menor es mejor)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Dato</label>
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => onChange({ ...data, isPercentage: false, dataType: 'numeric' })}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                  !isPercentage ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Numérico
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...data, isPercentage: true, dataType: 'percentage' })}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                  isPercentage ? 'bg-cyan-50 text-cyan-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Porcentaje (%)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha Kaizen (Intervención)</label>
            <input
              type="date"
              value={interventionDate}
              onChange={(e) => onChange({ ...data, interventionDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      )}

      {/* Main Grid: Data input + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input & History Table (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <form onSubmit={handleAddDataPoint} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700">Registrar Medición</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="number"
                step="any"
                placeholder={`Valor (${isPercentage ? '%' : 'u'})`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newDate || !newValue}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Registrar Dato</span>
            </button>
          </form>

          {/* Points list */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[260px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {sortedPoints.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                      Sin datos registrados
                    </td>
                  </tr>
                ) : (
                  sortedPoints.map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2">{pt.date}</td>
                      <td className="p-2 text-right font-bold text-slate-800">
                        {pt.value}
                        {isPercentage ? '%' : ''}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePoint(pt.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-50/60 p-4 rounded-xl border border-slate-200 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">
              Evolución Temporal: {kpiName}
            </span>
            {kpiGoal && !isNaN(Number(kpiGoal)) && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Meta: {kpiGoal}
                {isPercentage ? '%' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 w-full min-h-[240px]">
            {sortedPoints.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={36} className="text-slate-300 mb-2" />
                <p className="text-xs">Registra datos para visualizar la tendencia</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedPoints} margin={{ top: 15, right: 20, left: -10, bottom: 15 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit={isPercentage ? '%' : ''} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
                    }}
                    formatter={(val: any) => [`${val}${isPercentage ? '%' : ''}`, kpiName]}
                  />
                  {kpiGoal && !isNaN(Number(kpiGoal)) && (
                    <ReferenceLine
                      y={Number(kpiGoal)}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: `Meta (${kpiGoal}${isPercentage ? '%' : ''})`,
                        fill: '#10b981',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  {interventionDate && (
                    <ReferenceLine
                      x={interventionDate}
                      stroke="#6366f1"
                      strokeDasharray="3 3"
                      label={{
                        value: 'Intervención Kaizen',
                        fill: '#6366f1',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0891b2"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    name={kpiName}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default A3FollowUp;
