import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface AuditRadarChartProps {
  scores: {
    s1: number;
    s2: number;
    s3: number;
    s4: number;
    s5: number;
  };
  targetScore?: number;
}

export const AuditRadarChart: React.FC<AuditRadarChartProps> = ({
  scores,
  targetScore = 100,
}) => {
  const data = [
    { subject: 'S - Seleccionar', letter: 'S', name: 'Seleccionar', score: scores.s1, target: targetScore, fullMark: 100 },
    { subject: 'O - Ordenar', letter: 'O', name: 'Ordenar', score: scores.s2, target: targetScore, fullMark: 100 },
    { subject: 'L - Limpiar', letter: 'L', name: 'Limpiar', score: scores.s3, target: targetScore, fullMark: 100 },
    { subject: 'E - Estandarizar', letter: 'E', name: 'Estandarizar', score: scores.s4, target: targetScore, fullMark: 100 },
    { subject: 'S - Sostener', letter: 'S', name: 'Sostener', score: scores.s5, target: targetScore, fullMark: 100 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke="#94a3b8"
            tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 800 }}
          />
          <Radar
            name="Puntaje Actual (%)"
            dataKey="score"
            stroke="#0284c7"
            strokeWidth={2.5}
            fill="#06b6d4"
            fillOpacity={0.3}
          />
          <Radar
            name="Meta (100%)"
            dataKey="target"
            stroke="#4f46e5"
            strokeWidth={1.5}
            fill="#6366f1"
            fillOpacity={0.05}
            strokeDasharray="4 4"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: '#0f172a',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
            }}
            formatter={(value: any, name: any) => [`${value}%`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AuditRadarChart;
