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
} from 'lucide-react';
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

  // Aggregate Radar Scores across audits
  const radarScores = useMemo(() => {
    if (audits.length === 0) {
      return { s1: 75, s2: 60, s3: 80, s4: 65, s5: 70 }; // Baseline visual placeholder
    }

    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;
    let counts = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

    audits.forEach((a) => {
      if (a.entries && a.entries.length > 0) {
        a.entries.forEach((e) => {
          const sec = e.section?.toLowerCase() as 's1' | 's2' | 's3' | 's4' | 's5';
          if (counts[sec] !== undefined) {
            const maxPts = e.score > 4 ? 5 : 4;
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

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de auditoría?')) {
      const res = await auditService.deleteAudit(id);
      if (res.success) {
        toast.success('Auditoría eliminada');
        setAudits((prev) => prev.filter((a) => a.id !== id));
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
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={16} />}
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
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Radar de Madurez 5S</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Comparativa de desempeño en cada una de las 5 dimensiones
            </p>
          </div>

          <AuditRadarChart scores={radarScores} />

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-center">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
              <span className="text-[11px] text-slate-500 block font-semibold">1S Seiri</span>
              <span className="text-xs font-extrabold text-cyan-600">{radarScores.s1}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
              <span className="text-[11px] text-slate-500 block font-semibold">2S Seiton</span>
              <span className="text-xs font-extrabold text-indigo-600">{radarScores.s2}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
              <span className="text-[11px] text-slate-500 block font-semibold">3S Seiso</span>
              <span className="text-xs font-extrabold text-emerald-600">{radarScores.s3}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
              <span className="text-[11px] text-slate-500 block font-semibold">4S Seiketsu</span>
              <span className="text-xs font-extrabold text-amber-600">{radarScores.s4}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
              <span className="text-[11px] text-slate-500 block font-semibold">5S Shitsuke</span>
              <span className="text-xs font-extrabold text-rose-600">{radarScores.s5}%</span>
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
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Últimas revisiones ejecutadas en planta
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200/60 font-mono w-fit">
              {filteredAudits.length} de {audits.length} {audits.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por área o auditor..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setScoreFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  scoreFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('high')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  scoreFilter === 'high'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                ≥ 80%
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('mid')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  scoreFilter === 'mid'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                60-79%
              </button>
              <button
                type="button"
                onClick={() => setScoreFilter('low')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  scoreFilter === 'low'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
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
                const normScore = getNormalizedScore(audit.total_score);
                const isOriginal5Scale =
                  (audit.total_score || 0) <= 5 && (audit.total_score || 0) > 0;
                const scoreVariant =
                  normScore >= 80 ? 'emerald' : normScore >= 60 ? 'amber' : 'rose';

                return (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-cyan-400 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 border ${
                          normScore >= 80
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : normScore >= 60
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span className="text-xs font-black">{normScore}%</span>
                        {isOriginal5Scale && (
                          <span className="text-[9px] opacity-75 font-mono">
                            {Number(audit.total_score).toFixed(1)}/5
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {audit.area || audit.title || 'Área General'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 truncate font-medium">
                            <User size={12} className="text-slate-400" />
                            <span>{audit.auditor || 'Sin auditor'}</span>
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar size={12} className="text-slate-400" />
                            <span>{formatDate(audit.audit_date)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={scoreVariant}>
                        {normScore >= 80 ? 'Excelente' : normScore >= 60 ? 'Regular' : 'Crítico'}
                      </Badge>
                      <button
                        onClick={() => handleDelete(audit.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
