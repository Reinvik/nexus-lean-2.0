import React from 'react';
import {
  X,
  BarChart as BarIcon,
  Activity,
  TrendingUp,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiData: {
    total: number;
    completionRate: number;
    statusData: Array<{ name: string; value: number; color: string }>;
    locationData: Array<{ name: string; count: number }>;
    weeklyTrend: Array<{
      name: string;
      dateRange: string;
      percentage: number;
      total: number;
      closed: number;
    }>;
    closureStats: {
      avg: string | number;
      min: string | number;
      max: string | number;
    };
  };
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  isOpen,
  onClose,
  kpiData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={onClose}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm transition-all"
        >
          <X size={18} />
          <span>Cerrar Vista PPT</span>
        </button>
      </div>

      {/* Contenedor exacto 16:9 */}
      <div
        id="ppt-slide-card"
        className="w-full max-w-[1120px] aspect-[16/9] bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden relative select-none"
        style={{ height: '630px', minHeight: '630px', maxHeight: '630px' }}
      >
        {/* Cabecera de la diapositiva */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3 h-[12%]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BarIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                Indicadores de Gestión
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tarjetas 5S • Análisis visual de anomalías y mejoras
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-xs font-black tracking-widest text-slate-400">
              NEXUS <span className="text-blue-600">LEAN</span>
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Módulo de Gestión Visual
            </span>
          </div>
        </div>

        {/* Contenido de la diapositiva */}
        <div className="flex-1 flex flex-col gap-4 mt-3 h-[88%] overflow-hidden">
          {/* Fila 1 (58% de alto) */}
          <div className="flex gap-4 h-[58%]">
            {/* Columna 1: Stats & Gauge */}
            <div className="w-[30%] flex flex-col justify-between h-full bg-slate-50/50 rounded-xl p-3 border border-slate-100/80">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Tarjetas
                  </span>
                  <span className="text-2xl font-black text-blue-600 mt-0.5 block">
                    {kpiData.total}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cumplimiento
                  </span>
                  <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
                    {kpiData.completionRate}%
                  </span>
                </div>
              </div>

              {/* Promedio de Cierre radial */}
              <div className="flex-1 flex flex-col justify-center items-center mt-2 relative overflow-hidden">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Promedio de Cierre
                </span>

                <div className="relative w-24 h-24 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={42}
                        startAngle={90}
                        endAngle={-270}
                        fill="#ecfdf5"
                        stroke="none"
                        dataKey="value"
                        isAnimationActive={false}
                      />
                      <Pie
                        data={[
                          { value: parseFloat(String(kpiData.closureStats?.avg || 0)) },
                          {
                            value: Math.max(
                              0,
                              parseFloat(String(kpiData.closureStats?.max || 1)) -
                                parseFloat(String(kpiData.closureStats?.avg || 0))
                            ),
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={42}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="transparent" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-700 tracking-tight leading-none">
                      {kpiData.closureStats?.avg || '0'}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Días
                    </span>
                  </div>
                </div>

                {/* Footer de tiempos */}
                <div className="w-full mt-2">
                  <div className="flex justify-between items-center bg-white border border-slate-100 rounded-md p-1 px-2 text-[9px] shadow-sm">
                    <div className="text-center">
                      <span className="text-slate-400 font-bold uppercase text-[7px] block leading-none">
                        Más Rápida
                      </span>
                      <span className="text-emerald-600 font-bold leading-none">
                        {kpiData.closureStats?.min || '0'} d
                      </span>
                    </div>
                    <div className="h-4 w-px bg-slate-100"></div>
                    <div className="text-center">
                      <span className="text-slate-400 font-bold uppercase text-[7px] block leading-none">
                        Más Lenta
                      </span>
                      <span className="text-rose-600 font-bold leading-none">
                        {kpiData.closureStats?.max || '0'} d
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Distribución por Estado */}
            <div className="w-[35%] bg-slate-50/50 rounded-xl p-3.5 border border-slate-100/80 flex flex-col justify-between h-full">
              <h4 className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <Activity size={10} className="text-blue-500" /> Distribución por Estado
              </h4>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpiData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {kpiData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '6px',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        fontSize: '10px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={20}
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Columna 3: Top Áreas con Hallazgos */}
            <div className="w-[35%] bg-slate-50/50 rounded-xl p-3.5 border border-slate-100/80 flex flex-col justify-between h-full">
              <h4 className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <BarIcon size={10} className="text-blue-500" /> Top Áreas con Hallazgos
              </h4>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiData.locationData}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={75}
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{
                        borderRadius: '6px',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        fontSize: '10px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2 (38% de alto: Evolutivo Semanal) */}
          <div className="h-[38%] bg-slate-50/50 rounded-xl p-3.5 border border-slate-100/80 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={10} className="text-blue-500" /> Evolutivo Semanal: % Cumplimiento (Cerradas / Total)
              </h4>
              <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> % CERRADAS
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpiData.weeklyTrend} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '6px',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      fontSize: '10px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                    name="% Cumplimiento"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationModal;
