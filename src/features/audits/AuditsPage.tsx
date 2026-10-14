import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auditService } from './services/auditService';
import type { Audit5S, Audit5SEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AuditRadarChart from './components/AuditRadarChart';
import AuditEvaluationModal from './components/AuditEvaluationModal';
import { formatDate } from '../../lib/utils';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Award,
  Calendar,
  User,
  Trash2,
  TrendingUp,
  Search,
  Building,
  RotateCcw,
  Eye,
  BarChart2,
  UserCheck,
  Medal,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  AreaChart,
  Area,
  ReferenceLine,
  PieChart,
  Pie,
} from 'recharts';
import toast from 'react-hot-toast';

// Helper to normalize scores whether stored on a 0-5 scale or 0-100 percentage
export const getNormalizedScore = (score: number | null | undefined): number => {
  if (!score || score <= 0) return 0;
  if (score <= 5) {
    return Math.min(100, Math.round((score / 5) * 100));
  }
  return Math.min(100, Math.round(score));
};

export const AuditsPage: React.FC = () => {
  const { activeCompanyId, globalFilterCompanyId, setGlobalFilterCompanyId, user, companies } = useAuth();
  const effectiveCompanyId = globalFilterCompanyId || activeCompanyId;
  const canSwitchCompanies = Boolean(user?.isGlobalAdmin);

  const [audits, setAudits] = useState<Audit5S[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  const loadAudits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditService.getAudits(effectiveCompanyId);
      setAudits(data);
    } catch (err) {
      console.error('Error loading audits:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  // Helper to calculate radar scores for a single audit
  const getAuditRadarScores = useCallback((audit: Audit5S) => {
    if (audit.entries && audit.entries.length > 0) {
      const hasScoreOver4 = audit.entries.some((e) => (e.score || 0) > 4);
      const maxPerQuestion = hasScoreOver4 ? 5 : 4;

      const sections: Array<'s1' | 's2' | 's3' | 's4' | 's5'> = ['s1', 's2', 's3', 's4', 's5'];
      const res: Record<'s1' | 's2' | 's3' | 's4' | 's5', number> = {
        s1: 0,
        s2: 0,
        s3: 0,
        s4: 0,
        s5: 0,
      };
      const normTotal = getNormalizedScore(audit.total_score);

      sections.forEach((sec) => {
        const secEntries = audit.entries!.filter(
          (e) => e.section?.toLowerCase() === sec
        );
        if (secEntries.length > 0) {
          const sum = secEntries.reduce((acc, curr) => acc + (curr.score || 0), 0);
          res[sec] = Math.min(
            100,
            Math.max(0, Math.round((sum / (secEntries.length * maxPerQuestion)) * 100))
          );
        } else {
          res[sec] = normTotal;
        }
      });

      return res;
    }

    const norm = getNormalizedScore(audit.total_score);
    return { s1: norm, s2: norm, s3: norm, s4: norm, s5: norm };
  }, []);

  // Aggregate Radar Scores across audits
  const averageRadarScores = useMemo(() => {
    if (audits.length === 0) {
      return { s1: 75, s2: 60, s3: 80, s4: 65, s5: 70 }; // Baseline visual placeholder
    }

    const hasAnyOver4 = audits.some((a) =>
      a.entries?.some((e) => (e.score || 0) > 4)
    );
    const maxPerQuestion = hasAnyOver4 ? 5 : 4;

    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;
    let counts = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

    audits.forEach((a) => {
      if (a.entries && a.entries.length > 0) {
        a.entries.forEach((e) => {
          const sec = e.section?.toLowerCase() as 's1' | 's2' | 's3' | 's4' | 's5';
          if (counts[sec] !== undefined) {
            const maxPts = e.score > 4 ? 5 : maxPerQuestion;
            const pct = Math.min(100, (e.score / maxPts) * 100);
            if (sec === 's1') s1 += pct;
            if (sec === 's2') s2 += pct;
            if (sec === 's3') s3 += pct;
            if (sec === 's4') s4 += pct;
            if (sec === 's5') s5 += pct;
            counts[sec]++;
          }
        });
      }
    });

    return {
      s1: counts.s1 > 0 ? Math.round(s1 / counts.s1) : 70,
      s2: counts.s2 > 0 ? Math.round(s2 / counts.s2) : 65,
      s3: counts.s3 > 0 ? Math.round(s3 / counts.s3) : 80,
      s4: counts.s4 > 0 ? Math.round(s4 / counts.s4) : 60,
      s5: counts.s5 > 0 ? Math.round(s5 / counts.s5) : 75,
    };
  }, [audits]);

  // Selected audit (if any)
  const selectedAudit = useMemo(() => {
    if (!selectedAuditId) return null;
    return audits.find((a) => a.id === selectedAuditId) || null;
  }, [audits, selectedAuditId]);

  // Active Radar Scores: shows specific audit if one is clicked, or overall average
  const activeRadarScores = useMemo(() => {
    if (selectedAudit) {
      return getAuditRadarScores(selectedAudit);
    }
    return averageRadarScores;
  }, [selectedAudit, averageRadarScores, getAuditRadarScores]);

  // General KPIs with normalized scores
  const stats = useMemo(() => {
    const total = audits.length;
    const avgScore =
      total > 0
        ? Math.round(
            audits.reduce((acc, a) => acc + getNormalizedScore(a.total_score), 0) / total
          )
        : 0;
    const compliant = audits.filter((a) => getNormalizedScore(a.total_score) >= 80).length;

    return {
      total,
      avgScore,
      compliant,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
    };
  }, [audits]);

  // Filtered audits by search term and score range
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      const norm = getNormalizedScore(audit.total_score);
      if (scoreFilter === 'high' && norm < 80) return false;
      if (scoreFilter === 'mid' && (norm < 60 || norm >= 80)) return false;
      if (scoreFilter === 'low' && norm >= 60) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchArea = (audit.area || audit.title || '').toLowerCase().includes(q);
        const matchAuditor = (audit.auditor || '').toLowerCase().includes(q);
        return matchArea || matchAuditor;
      }
      return true;
    });
  }, [audits, searchQuery, scoreFilter]);

  // 1. Top Auditores por cantidad de auditorías realizadas
  const auditorStats = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number }> = {};
    audits.forEach((a) => {
      const name = a.auditor?.trim() || 'Sin asignar';
      const score = getNormalizedScore(a.total_score);
      if (!map[name]) {
        map[name] = { count: 0, totalScore: 0 };
      }
      map[name].count += 1;
      map[name].totalScore += score;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [audits]);

  // 2. Top Áreas por nota promedio obtenida
  const areaScoreStats = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number }> = {};
    audits.forEach((a) => {
      const name = a.area?.trim() || a.title?.trim() || 'Área General';
      const score = getNormalizedScore(a.total_score);
      if (!map[name]) {
        map[name] = { count: 0, totalScore: 0 };
      }
      map[name].count += 1;
      map[name].totalScore += score;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [audits]);

  // 3. Evolución Temporal de Calificaciones
  const trendStats = useMemo(() => {
    if (audits.length === 0) return [];
    return [...audits]
      .filter((a) => Boolean(a.audit_date))
      .sort((a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime())
      .map((a, idx) => ({
        id: a.id,
        index: idx + 1,
        date: formatDate(a.audit_date),
        rawDate: a.audit_date,
        score: getNormalizedScore(a.total_score),
        area: a.area || a.title || 'Área General',
        auditor: a.auditor || 'Sin auditor',
        target: 80,
      }));
  }, [audits]);

  // 4. Distribución por Nivel de Cumplimiento (Semáforo)
  const complianceDistribution = useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;

    audits.forEach((a) => {
      const score = getNormalizedScore(a.total_score);
      if (score >= 80) high++;
      else if (score >= 60) mid++;
      else low++;
    });

    const total = audits.length;

    return [
      {
        name: 'Excelente (≥ 80%)',
        key: 'high' as const,
        value: high,
        percentage: total > 0 ? Math.round((high / total) * 100) : 0,
        color: '#10b981',
      },
      {
        name: 'Regular (60 - 79%)',
        key: 'mid' as const,
        value: mid,
        percentage: total > 0 ? Math.round((mid / total) * 100) : 0,
        color: '#f59e0b',
      },
      {
        name: 'Crítico (< 60%)',
        key: 'low' as const,
        value: low,
        percentage: total > 0 ? Math.round((low / total) * 100) : 0,
        color: '#ef4444',
      },
    ];
  }, [audits]);

  const handleAuditorFilterToggle = (auditorName: string) => {
    if (searchQuery.toLowerCase() === auditorName.toLowerCase()) {
      setSearchQuery('');
    } else {
      setSearchQuery(auditorName);
      toast.success(`Filtrando historial por auditor: ${auditorName}`, { id: 'aud-flt', duration: 1800 });
    }
  };

  const handleAreaFilterToggle = (areaName: string) => {
    if (searchQuery.toLowerCase() === areaName.toLowerCase()) {
      setSearchQuery('');
    } else {
      setSearchQuery(areaName);
      toast.success(`Filtrando historial por área: ${areaName}`, { id: 'area-flt', duration: 1800 });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de auditoría?')) {
      const res = await auditService.deleteAudit(id);
      if (res.success) {
        toast.success('Auditoría eliminada');
        setAudits((prev) => prev.filter((a) => a.id !== id));
        if (selectedAuditId === id) {
          setSelectedAuditId(null);
        }
      } else {
        toast.error(res.error || 'Error al eliminar');
      }
    }
  };

  const handleSaveAudit = async (data: any, entries: Audit5SEntry[]) => {
    const res = await auditService.createAudit(data, entries);
    if (res.success) {
      toast.success('Auditoría registrada exitosamente');
      loadAudits();
    }
    return res;
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* High-Contrast Light Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="text-cyan-600" size={28} />
            <span>Auditorías 5S</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Evaluación sistemática de estándares 5S, radar de madurez y trazabilidad operacional en planta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSwitchCompanies && companies.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
              <Building size={14} className="text-cyan-600" />
              <select
                value={effectiveCompanyId || 'all'}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? null : e.target.value;
                  setGlobalFilterCompanyId(val);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="all">Todas las Empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadAudits}
            isLoading={loading}
            leftIcon={<RefreshCw size={14} />}
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Ejecutar Auditoría
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Evaluaciones"
          value={stats.total}
          subtitle="Auditorías registradas"
          icon={ShieldCheck}
          accentColor="cyan"
        />
        <StatCard
          title="Puntaje Promedio"
          value={`${stats.avgScore}%`}
          subtitle="Calificación general"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <StatCard
          title="Áreas Destacadas"
          value={stats.compliant}
          subtitle="Puntaje ≥ 80%"
          icon={Award}
          accentColor="indigo"
        />
        <StatCard
          title="Tasa Cumplimiento"
          value={`${stats.complianceRate}%`}
          subtitle="Estándar alcanzado"
          icon={ShieldCheck}
          accentColor="amber"
        />
      </div>

      {/* Main Grid: Radar chart on left, Recent Audits list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    selectedAudit ? 'bg-emerald-500 ring-2 ring-emerald-200 animate-pulse' : 'bg-cyan-500'
                  }`}
                />
                <span>
                  {selectedAudit
                    ? `Radar 5S: ${selectedAudit.area || selectedAudit.title}`
                    : 'Radar de Madurez 5S'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {selectedAudit ? (
                  <span>
                    Auditado el {formatDate(selectedAudit.audit_date)} por{' '}
                    <strong className="text-slate-700">{selectedAudit.auditor}</strong> ({getNormalizedScore(selectedAudit.total_score)}%)
                  </span>
                ) : (
                  'Promedio general de desempeño en las 5 dimensiones'
                )}
              </p>
            </div>

            {selectedAudit && (
              <button
                type="button"
                onClick={() => setSelectedAuditId(null)}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-all shadow-2xs"
                title="Volver a ver el promedio general de todas las auditorías"
              >
                <RotateCcw size={12} />
                <span>Ver Promedio</span>
              </button>
            )}
          </div>

          <AuditRadarChart scores={activeRadarScores} />

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-center">
            <div className="bg-cyan-50/80 border border-cyan-200 rounded-xl p-2">
              <span className="text-[11px] text-slate-700 block font-bold">1S Seiri</span>
              <span className="text-sm font-black text-cyan-900">{activeRadarScores.s1}%</span>
            </div>
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2">
              <span className="text-[11px] text-slate-700 block font-bold">2S Seiton</span>
              <span className="text-sm font-black text-indigo-900">{activeRadarScores.s2}%</span>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2">
              <span className="text-[11px] text-slate-700 block font-bold">3S Seiso</span>
              <span className="text-sm font-black text-emerald-900">{activeRadarScores.s3}%</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2">
              <span className="text-[11px] text-slate-700 block font-bold">4S Seiketsu</span>
              <span className="text-sm font-black text-amber-900">{activeRadarScores.s4}%</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2">
              <span className="text-[11px] text-slate-700 block font-bold">5S Shitsuke</span>
              <span className="text-sm font-black text-rose-900">{activeRadarScores.s5}%</span>
            </div>
          </div>
        </div>

        {/* Recent Audits List */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Historial de Auditorías
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                {selectedAudit
                  ? `Mostrando en radar: "${selectedAudit.area || selectedAudit.title}". Haz clic para desmarcar.`
                  : 'Últimas revisiones ejecutadas en planta • Haz clic en una auditoría para ver su radar'}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 font-mono w-fit">
              {filteredAudits.length} de {audits.length} {audits.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por área o auditor..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-cyan-600 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setScoreFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  scoreFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('high')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  scoreFilter === 'high'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                }`}
              >
                ≥ 80%
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('mid')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  scoreFilter === 'mid'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                }`}
              >
                60-79%
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('low')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  scoreFilter === 'low'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                }`}
              >
                &lt; 60%
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-16 rounded-xl bg-slate-100/80 border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : filteredAudits.length > 0 ? (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredAudits.map((audit) => {
                const isSelected = selectedAuditId === audit.id;
                const normScore = getNormalizedScore(audit.total_score);
                const isOriginal5Scale =
                  (audit.total_score || 0) <= 5 && (audit.total_score || 0) > 0;
                const scoreVariant =
                  normScore >= 80 ? 'emerald' : normScore >= 60 ? 'amber' : 'rose';

                return (
                  <div
                    key={audit.id}
                    onClick={() => {
                      setSelectedAuditId((prev) => (prev === audit.id ? null : audit.id));
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-cyan-50/90 border-cyan-600 ring-2 ring-cyan-500/30 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-cyan-500 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-14 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 border shadow-2xs ${
                          normScore >= 80
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                            : normScore >= 60
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-rose-100 text-rose-950 border-rose-300'
                        }`}
                      >
                        <span className="text-sm font-black leading-tight">{normScore}%</span>
                        {isOriginal5Scale && (
                          <span className="text-[10px] font-bold text-slate-800 font-mono leading-tight">
                            {Number(audit.total_score).toFixed(1)}/5
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-cyan-800 transition-colors">
                            {audit.area || audit.title || 'Área General'}
                          </p>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-700 text-white shrink-0">
                              <Eye size={10} /> En Radar
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-700 mt-0.5">
                          <span className="flex items-center gap-1 truncate font-semibold">
                            <User size={12} className="text-slate-600" />
                            <span>{audit.auditor || 'Sin auditor'}</span>
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar size={12} className="text-slate-600" />
                            <span>{formatDate(audit.audit_date)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={scoreVariant} size="md">
                        {normScore >= 80 ? 'Excelente' : normScore >= 60 ? 'Regular' : 'Crítico'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(audit.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <ShieldCheck size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-500">
                {searchQuery || scoreFilter !== 'all'
                  ? 'No se encontraron auditorías con los filtros aplicados.'
                  : 'No hay auditorías registradas todavía.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* Analytics Section: Top Auditores, Top Áreas, Tendencia & Madurez */}
      {/* ============================================================== */}
      <div className="pt-4 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="text-cyan-600" size={22} />
              <span>Análisis de Desempeño & Rankings 5S</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Top auditores en planta, notas promedio por área evaluada y evolución de madurez operativa.
            </p>
          </div>

          {(searchQuery || scoreFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setScoreFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors active:scale-95 shrink-0 self-start sm:self-auto shadow-2xs"
            >
              <X size={13} />
              <span>Restablecer Filtros de Historial</span>
            </button>
          )}
        </div>

        {/* 4 Analytical Cards in 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Top Auditores (Cantidad de Auditorías) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Top Auditores
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Líderes con mayor número de auditorías ejecutadas
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {auditorStats.length} {auditorStats.length === 1 ? 'auditor' : 'auditores'}
                </span>
              </div>

              {auditorStats.length > 0 ? (
                <>
                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={auditorStats.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            handleAuditorFilterToggle(state.activePayload[0].payload.name);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide domain={[0, 'dataMax + 1']} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={115}
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const isSelected = searchQuery.toLowerCase() === payload.value.toLowerCase();
                            return (
                              <g
                                transform={`translate(${x},${y})`}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAuditorFilterToggle(payload.value);
                                }}
                              >
                                <title>{`Filtrar por auditor ${payload.value}`}</title>
                                <text
                                  x={0}
                                  y={0}
                                  dy={4}
                                  textAnchor="end"
                                  fill={isSelected ? '#0284c7' : '#334155'}
                                  fontSize={11}
                                  fontWeight={isSelected ? 'bold' : '600'}
                                  className="hover:underline transition-colors"
                                >
                                  {payload.value.length > 15
                                    ? `${payload.value.substring(0, 13)}…`
                                    : payload.value}
                                </text>
                              </g>
                            );
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          formatter={(value: any, name: any, item: any) => [
                            `${value} auditorías (${item?.payload?.avgScore}% prom.)`,
                            `${item?.payload?.name} (clic para filtrar)`,
                          ]}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.06)',
                            fontSize: '11px',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#0284c7"
                          radius={[0, 6, 6, 0]}
                          barSize={20}
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.name) {
                              handleAuditorFilterToggle(entry.name);
                            }
                          }}
                        >
                          <LabelList
                            dataKey="count"
                            position="right"
                            fill="#0f172a"
                            fontSize={11}
                            fontWeight="bold"
                            formatter={(val: any) => `${val} aud.`}
                            offset={8}
                          />
                          {auditorStats.slice(0, 5).map((entry, index) => {
                            const isSelected = searchQuery.toLowerCase() === entry.name.toLowerCase();
                            return (
                              <Cell
                                key={`aud-${index}`}
                                fill={isSelected ? '#0369a1' : '#0ea5e9'}
                                opacity={searchQuery && !isSelected ? 0.4 : 1}
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pills List below */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100 mt-2">
                    {auditorStats.slice(0, 3).map((aud, idx) => {
                      const isSelected = searchQuery.toLowerCase() === aud.name.toLowerCase();
                      return (
                        <button
                          key={aud.name}
                          type="button"
                          onClick={() => handleAuditorFilterToggle(aud.name)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-500/20 shadow-xs'
                              : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80'
                          }`}
                          title={`Clic para filtrar por ${aud.name}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {aud.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pl-6.5">
                            <span>{aud.count} {aud.count === 1 ? 'auditoría' : 'auditorías'}</span>
                            <span className="text-cyan-700 font-bold">{aud.avgScore}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Sin registros de auditores disponibles.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Top Calificación por Área Auditada */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <Medal size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Top Desempeño por Área
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Ranking de áreas evaluadas según su nota promedio 5S
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {areaScoreStats.length} {areaScoreStats.length === 1 ? 'área' : 'áreas'}
                </span>
              </div>

              {areaScoreStats.length > 0 ? (
                <>
                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={areaScoreStats.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            handleAreaFilterToggle(state.activePayload[0].payload.name);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={125}
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const isSelected = searchQuery.toLowerCase() === payload.value.toLowerCase();
                            return (
                              <g
                                transform={`translate(${x},${y})`}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAreaFilterToggle(payload.value);
                                }}
                              >
                                <title>{`Filtrar por área ${payload.value}`}</title>
                                <text
                                  x={0}
                                  y={0}
                                  dy={4}
                                  textAnchor="end"
                                  fill={isSelected ? '#0284c7' : '#334155'}
                                  fontSize={11}
                                  fontWeight={isSelected ? 'bold' : '600'}
                                  className="hover:underline transition-colors"
                                >
                                  {payload.value.length > 16
                                    ? `${payload.value.substring(0, 14)}…`
                                    : payload.value}
                                </text>
                              </g>
                            );
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          formatter={(value: any, name: any, item: any) => [
                            `${value}% (${item?.payload?.count} ${item?.payload?.count === 1 ? 'auditoría' : 'auditorías'})`,
                            `${item?.payload?.name} (clic para filtrar)`,
                          ]}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.06)',
                            fontSize: '11px',
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          radius={[0, 6, 6, 0]}
                          barSize={20}
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.name) {
                              handleAreaFilterToggle(entry.name);
                            }
                          }}
                        >
                          <LabelList
                            dataKey="avgScore"
                            position="right"
                            fill="#0f172a"
                            fontSize={11}
                            fontWeight="bold"
                            formatter={(val: any) => `${val}%`}
                            offset={8}
                          />
                          {areaScoreStats.slice(0, 5).map((entry, index) => {
                            const isSelected = searchQuery.toLowerCase() === entry.name.toLowerCase();
                            const barColor =
                              entry.avgScore >= 80 ? '#10b981' : entry.avgScore >= 60 ? '#f59e0b' : '#ef4444';
                            return (
                              <Cell
                                key={`area-${index}`}
                                fill={barColor}
                                opacity={searchQuery && !isSelected ? 0.35 : 1}
                                stroke={isSelected ? '#0f172a' : undefined}
                                strokeWidth={isSelected ? 2 : 0}
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Highlights Summary below */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                    {areaScoreStats[0] && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                            🏆 Mejor Desempeño
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {areaScoreStats[0].name}
                          </span>
                        </div>
                        <span className="text-lg font-black text-emerald-700 shrink-0">
                          {areaScoreStats[0].avgScore}%
                        </span>
                      </div>
                    )}

                    {areaScoreStats.length > 1 && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                            ⚠️ Oportunidad de Mejora
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {areaScoreStats[areaScoreStats.length - 1].name}
                          </span>
                        </div>
                        <span className="text-lg font-black text-amber-700 shrink-0">
                          {areaScoreStats[areaScoreStats.length - 1].avgScore}%
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Sin áreas auditadas registradas.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Evolución Temporal de Calificaciones */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Tendencia Histórica de Madurez
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Evolución cronológica de notas vs estándar meta (80%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Target size={12} /> Meta 80%
                  </span>
                </div>
              </div>

              {trendStats.length > 0 ? (
                <>
                  <div className="h-56 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trendStats}
                        margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            const auditId = state.activePayload[0].payload.id;
                            setSelectedAuditId((prev) => (prev === auditId ? null : auditId));
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="auditScoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                          tickLine={false}
                          axisLine={false}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.06)',
                            fontSize: '11px',
                          }}
                          formatter={(value: any, name: any, item: any) => [
                            `${value}% (${item?.payload?.area})`,
                            `Auditor: ${item?.payload?.auditor} (clic para ver en radar)`,
                          ]}
                        />
                        <ReferenceLine
                          y={80}
                          stroke="#6366f1"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: 'Meta 80%',
                            fill: '#4f46e5',
                            fontSize: 10,
                            position: 'insideTopLeft',
                            fontWeight: 'bold',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          fill="url(#auditScoreGradient)"
                          dot={{ fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Footer */}
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 text-slate-600 font-medium">
                    <span>
                      Primera evaluación: <strong className="text-slate-900">{trendStats[0]?.score}%</strong> ({trendStats[0]?.date})
                    </span>
                    <span>
                      Última evaluación: <strong className="text-slate-900">{trendStats[trendStats.length - 1]?.score}%</strong> ({trendStats[trendStats.length - 1]?.date})
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Sin suficientes auditorías para proyectar la tendencia.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Nivel de Madurez Operacional (Donut Semafórico) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Nivel de Madurez Operacional
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Distribución semafórica de auditorías en planta
                    </p>
                  </div>
                </div>
                {scoreFilter !== 'all' ? (
                  <button
                    onClick={() => setScoreFilter('all')}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-2xs"
                    title="Quitar filtro de nivel"
                  >
                    <span>Filtro activo</span>
                    <X size={10} />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Clic para filtrar</span>
                )}
              </div>

              {audits.length > 0 ? (
                <>
                  <div className="relative h-44 flex items-center justify-center my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={complianceDistribution.filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={2}
                          cursor="pointer"
                          onClick={(entry: any) => {
                            if (entry && entry.key) {
                              setScoreFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                            }
                          }}
                        >
                          {complianceDistribution.filter((d) => d.value > 0).map((entry, index) => {
                            const isSelected = scoreFilter === entry.key;
                            return (
                              <Cell
                                key={`comp-${index}`}
                                fill={entry.color}
                                opacity={scoreFilter !== 'all' && !isSelected ? 0.35 : 1}
                                stroke={isSelected ? '#0f172a' : '#ffffff'}
                                strokeWidth={isSelected ? 3 : 2}
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                              />
                            );
                          })}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [
                            `${value} auditorías (${audits.length > 0 ? Math.round((Number(value) / audits.length) * 100) : 0}%)`,
                            `${name}`,
                          ]}
                          contentStyle={{
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.06)',
                            fontSize: '11px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Hole Central Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Promedio
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5">
                        {stats.avgScore}%
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded uppercase tracking-wider leading-none">
                        Planta
                      </span>
                    </div>
                  </div>

                  {/* 3 Interactive Buttons */}
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100">
                    {complianceDistribution.map((tier) => {
                      const isSelected = scoreFilter === tier.key;
                      return (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => setScoreFilter((prev) => (prev === tier.key ? 'all' : tier.key))}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-slate-800 shadow-sm bg-slate-900 text-white border-slate-900'
                              : `${tier.color === '#10b981' ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200/90 hover:bg-emerald-100' : tier.color === '#f59e0b' ? 'bg-amber-50/70 text-amber-950 border-amber-200/90 hover:bg-amber-100' : 'bg-rose-50/70 text-rose-950 border-rose-200/90 hover:bg-rose-100'}`
                          }`}
                          title={`Filtrar auditorías con nivel ${tier.name}`}
                        >
                          <span className={`text-[10px] font-bold uppercase block truncate ${isSelected ? 'text-slate-200' : ''}`}>
                            {tier.key === 'high' ? 'Excelente' : tier.key === 'mid' ? 'Regular' : 'Crítico'}
                          </span>
                          <span className={`text-xl font-black block mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                            {tier.value}
                          </span>
                          <span className={`text-[10px] font-semibold block ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {tier.percentage}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Sin auditorías registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Modal */}
      <AuditEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAudit}
      />
    </div>
  );
};

export default AuditsPage;
