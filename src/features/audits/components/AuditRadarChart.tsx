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
    { subject: '1S - Clasificar', score: scores.s1, target: targetScore, fullMark: 100 },
    { subject: '2S - Ordenar', score: scores.s2, target: targetScore, fullMark: 100 },
    { subject: '3S - Limpiar', score: scores.s3, target: targetScore, fullMark: 100 },
    { subject: '4S - Estandarizar', score: scores.s4, target: targetScore, fullMark: 100 },
    { subject: '5S - Disciplina', score: scores.s5, target: targetScore, fullMark: 100 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke="#cbd5e1"
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <Radar
            name="Puntaje Actual (%)"
            dataKey="score"
            stroke="#0891b2"
            fill="#06b6d4"
            fillOpacity={0.35}
          />
          <Radar
            name="Meta (100%)"
            dataKey="target"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.06}
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
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AuditRadarChart;
