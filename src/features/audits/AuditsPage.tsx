import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auditService } from './services/auditService';
import { auditPlanService } from './services/auditPlanService';
import type { Audit5S, Audit5SEntry, AuditPlanItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AuditRadarChart from './components/AuditRadarChart';
import AuditEvaluationModal from './components/AuditEvaluationModal';
import AuditPlanManager from './components/AuditPlanManager';
import AuditEditModal from './components/AuditEditModal';
import { formatDate } from '../../lib/utils';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Award,
  Calendar,
  CalendarCheck,
  CalendarDays,
  User,
  Trash2,
  Edit2,
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
  Filter,
  SlidersHorizontal,
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

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'plan' ? 'plan' : 'metrics';

  // Sub-tab Navigation: 'metrics' (Resultados & Gráficos) vs 'plan' (Plan de Auditoría)
  const [activeTab, setActiveTab] = useState<'metrics' | 'plan'>(initialTab);
  const [planToExecute, setPlanToExecute] = useState<AuditPlanItem | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'plan') {
      setActiveTab('plan');
    } else if (tabParam === 'metrics') {
      setActiveTab('metrics');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'metrics' | 'plan') => {
    setActiveTab(tab);
    setSearchParams(tab === 'plan' ? { tab: 'plan' } : {});
  };

  const [audits, setAudits] = useState<Audit5S[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit5S | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  // Filtros Temporales para Gráficos y Métricas: Fecha, Año, Mes
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [timePreset, setTimePreset] = useState<'all' | 'this_year' | 'this_month' | 'last_month' | 'last_90' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

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

  // Años únicos presentes en el histórico de auditorías
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    audits.forEach((a) => {
      const d = a.audit_date || a.created_at;
      if (d) {
        const y = d.substring(0, 4);
        if (y && !isNaN(Number(y))) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [audits]);

  // Manejo de cambios rápidos de período
  const handleApplyTimePreset = (preset: 'all' | 'this_year' | 'this_month' | 'last_month' | 'last_90' | 'custom') => {
    setTimePreset(preset);
    const now = new Date();
    const currYear = now.getFullYear().toString();
    const currMonth = now.getMonth().toString();

    if (preset === 'all') {
      setFilterYear('all');
      setFilterMonth('all');
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'this_year') {
      setFilterYear(currYear);
      setFilterMonth('all');
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'this_month') {
      setFilterYear(currYear);
      setFilterMonth(currMonth);
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'last_month') {
      const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevY = now.getMonth() === 0 ? (now.getFullYear() - 1).toString() : currYear;
      setFilterYear(prevY);
      setFilterMonth(prevM.toString());
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'last_90') {
      setFilterYear('all');
      setFilterMonth('all');
      const start90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const endToday = now.toISOString().split('T')[0];
      setFilterStartDate(start90);
      setFilterEndDate(endToday);
    }
  };

  // Reiniciar filtros temporales
  const handleResetTimeFilter = () => {
    setTimePreset('all');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const isTimeFilterActive = filterYear !== 'all' || filterMonth !== 'all' || Boolean(filterStartDate) || Boolean(filterEndDate) || timePreset !== 'all';

  // Auditorías filtradas por Año, Mes y Rango de Fecha
  const temporalFilteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      const rawDate = audit.audit_date || audit.created_at;
      if (!rawDate) return true;

      // Filtro de rango de fechas explícito
      if (filterStartDate && rawDate < filterStartDate) return false;
      if (filterEndDate && rawDate > filterEndDate) return false;

      // Filtro de año
      if (filterYear !== 'all') {
        const itemYear = rawDate.substring(0, 4);
        if (itemYear !== filterYear) return false;
      }

      // Filtro de mes
      if (filterMonth !== 'all') {
        try {
          const itemDate = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T00:00:00`);
          if (!isNaN(itemDate.getTime()) && String(itemDate.getMonth()) !== filterMonth) {
            return false;
          }
        } catch {
          // ignore parsing error
        }
      }

      return true;
    });
  }, [audits, filterYear, filterMonth, filterStartDate, filterEndDate]);

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

  // Aggregate Radar Scores across temporalFilteredAudits
  const averageRadarScores = useMemo(() => {
    const dataset = temporalFilteredAudits.length > 0 ? temporalFilteredAudits : audits;
    if (dataset.length === 0) {
      return { s1: 75, s2: 60, s3: 80, s4: 65, s5: 70 }; // Baseline visual placeholder
    }

    const hasAnyOver4 = dataset.some((a) =>
      a.entries?.some((e) => (e.score || 0) > 4)
    );
    const maxPerQuestion = hasAnyOver4 ? 5 : 4;

    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;
    let counts = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

    dataset.forEach((a) => {
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
  }, [temporalFilteredAudits, audits]);

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

  // General KPIs with normalized scores (derived from temporalFilteredAudits)
  const stats = useMemo(() => {
    const total = temporalFilteredAudits.length;
    const avgScore =
      total > 0
        ? Math.round(
            temporalFilteredAudits.reduce((acc, a) => acc + getNormalizedScore(a.total_score), 0) / total
          )
        : 0;
    const compliant = temporalFilteredAudits.filter((a) => getNormalizedScore(a.total_score) >= 80).length;

    return {
      total,
      avgScore,
      compliant,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
    };
  }, [temporalFilteredAudits]);

  // Filtered audits by search term and score range from temporalFilteredAudits
  const filteredAudits = useMemo(() => {
    return temporalFilteredAudits.filter((audit) => {
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
  }, [temporalFilteredAudits, searchQuery, scoreFilter]);

  // 1. Top Auditores por cantidad de auditorías realizadas en el período
  const auditorStats = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number }> = {};
    temporalFilteredAudits.forEach((a) => {
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
  }, [temporalFilteredAudits]);

  // 2. Top Áreas por nota promedio obtenida en el período
  const areaScoreStats = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number }> = {};
    temporalFilteredAudits.forEach((a) => {
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
  }, [temporalFilteredAudits]);

  // 3. Evolución Temporal de Calificaciones en el período
  const trendStats = useMemo(() => {
    if (temporalFilteredAudits.length === 0) return [];
    return [...temporalFilteredAudits]
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
  }, [temporalFilteredAudits]);

  // 4. Distribución por Nivel de Cumplimiento en el período
  const complianceDistribution = useMemo(() => {
    let high = 0;
    let mid = 0;
    let low = 0;

    temporalFilteredAudits.forEach((a) => {
      const score = getNormalizedScore(a.total_score);
      if (score >= 80) high++;
      else if (score >= 60) mid++;
      else low++;
    });

    const total = temporalFilteredAudits.length;

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
  }, [temporalFilteredAudits]);

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

  const handleDelete = async (id: string | number) => {
    if (window.confirm('¿Seguro que deseas eliminar este registro de auditoría?')) {
      const res = await auditService.deleteAudit(id);
      if (res.success) {
        toast.success('Auditoría eliminada');
        setAudits((prev) => prev.filter((a) => String(a.id) !== String(id)));
        if (selectedAuditId && String(selectedAuditId) === String(id)) {
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

  const handleOpenEdit = (audit: Audit5S) => {
    setEditingAudit(audit);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (
    auditId: string | number,
    updates: {
      area: string;
      auditor: string;
      audit_date: string;
      total_score: number;
    }
  ) => {
    const res = await auditService.updateAudit(auditId, updates);
    if (res.success && res.data) {
      toast.success(`Auditoría en "${updates.area}" actualizada con éxito`, { icon: '✨' });
      setAudits((prev) =>
        prev.map((a) => (String(a.id) === String(auditId) ? { ...a, ...res.data! } : a))
      );
      setIsEditModalOpen(false);
      setEditingAudit(null);
      loadAudits();
      return { success: true };
    } else {
      toast.error(res.error || 'Error al actualizar auditoría');
      return { success: false, error: res.error };
    }
  };

  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    audits.forEach((a) => {
      const trimmed = (a.area || a.title || '').trim();
      if (trimmed) set.add(trimmed);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [audits]);

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

      {/* Mini-Tabs de Navegación: Resultados & Gráficos vs Plan de Auditoría 5S */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('metrics')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BarChart2 size={15} className={activeTab === 'metrics' ? 'text-cyan-400' : 'text-slate-500'} />
            <span>Resultados & Gráficos 5S</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'metrics' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {temporalFilteredAudits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('plan')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <CalendarCheck size={15} className={activeTab === 'plan' ? 'text-cyan-400' : 'text-slate-500'} />
            <span>Plan de Auditoría 5S</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'plan' ? 'bg-cyan-600 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              Guía & Checklist
            </span>
          </button>
        </div>

        {activeTab === 'metrics' && (
          <div className="hidden sm:flex items-center gap-2 px-2 text-xs font-medium text-slate-500">
            <SlidersHorizontal size={13} className="text-cyan-600" />
            <span>Filtro temporal activo sobre gráficos</span>
          </div>
        )}
      </div>

      {/* Contenido Condicional según Pestaña Activa */}
      {activeTab === 'plan' ? (
        <AuditPlanManager
          companyId={effectiveCompanyId}
          onExecuteAudit={(planItem) => {
            setPlanToExecute(planItem);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Barra de Filtro Temporal: Fecha, Año y Mes */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center shrink-0">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>Filtrar Gráficos por Período Temporal</span>
                    {isTimeFilterActive && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                        Activo
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Segmenta notas promedio, polígono radar, top auditores y áreas por fecha, año y mes.
                  </p>
                </div>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyTimePreset('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timePreset === 'all' && filterYear === 'all' && filterMonth === 'all' && !filterStartDate && !filterEndDate
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todo el Histórico
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTimePreset('this_year')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timePreset === 'this_year'
                      ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                      : 'bg-cyan-50 text-cyan-900 border-cyan-200 hover:bg-cyan-100'
                  }`}
                >
                  Este Año ({new Date().getFullYear()})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTimePreset('this_month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timePreset === 'this_month'
                      ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                      : 'bg-cyan-50 text-cyan-900 border-cyan-200 hover:bg-cyan-100'
                  }`}
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTimePreset('last_month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timePreset === 'last_month'
                      ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Mes Anterior
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTimePreset('last_90')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timePreset === 'last_90'
                      ? 'bg-cyan-700 text-white border-cyan-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Últimos 90 días
                </button>
              </div>
            </div>

            {/* Selectores específicos de Año, Mes y Rango de Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2.5 border-t border-slate-100">
              {/* Selector de Año */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Año de Auditoría
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white cursor-pointer"
                >
                  <option value="all">Año: Todos los Años</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Año {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Mes */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mes de Auditoría
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white cursor-pointer"
                >
                  <option value="all">Mes: Todos los Meses</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={String(idx)}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de Fecha Personalizado: Desde / Hasta */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Hasta
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setTimePreset('custom');
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                  />
                  {isTimeFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetTimeFilter}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 transition-colors shrink-0 cursor-pointer"
                      title="Restablecer filtros de fecha"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen del período seleccionado */}
            {isTimeFilterActive && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span>
                    Filtrando gráficos por:{' '}
                    <strong className="text-slate-900">
                      {filterYear !== 'all' ? `Año ${filterYear}` : ''}
                      {filterMonth !== 'all' ? ` • ${MONTH_NAMES[Number(filterMonth)]}` : ''}
                      {filterStartDate ? ` • Desde ${formatDate(filterStartDate)}` : ''}
                      {filterEndDate ? ` • Hasta ${formatDate(filterEndDate)}` : ''}
                    </strong>{' '}
                    ({temporalFilteredAudits.length} {temporalFilteredAudits.length === 1 ? 'evaluación encontrada' : 'evaluaciones encontradas'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetTimeFilter}
                  className="text-[11px] font-bold text-cyan-700 hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <RotateCcw size={11} />
                  <span>Ver Todo el Histórico</span>
                </button>
              </div>
            )}
          </div>

          {/* KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Evaluaciones"
              value={stats.total}
              subtitle={isTimeFilterActive ? "En período seleccionado" : "Auditorías registradas"}
              icon={ShieldCheck}
              accentColor="cyan"
            />
            <StatCard
              title="Puntaje Promedio"
              value={`${stats.avgScore}%`}
              subtitle="Calificación del período"
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
                    ? `Radar 5S (SOLES): ${selectedAudit.area || selectedAudit.title}`
                    : 'Radar de Madurez 5S (SOLES)'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {selectedAudit ? (
                  <span>
                    Auditado el {formatDate(selectedAudit.audit_date)} por{' '}
                    <strong className="text-slate-700">{selectedAudit.auditor}</strong> ({getNormalizedScore(selectedAudit.total_score)}%)
                  </span>
                ) : (
                  'Madurez en las 5 dimensiones: Seleccionar, Ordenar, Limpiar, Estandarizar y Sostener'
                )}
              </p>
            </div>

            {selectedAudit && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedAudit)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all shadow-2xs"
                  title="Editar datos de esta auditoría"
                >
                  <Edit2 size={12} className="text-slate-600" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAuditId(null)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-all shadow-2xs"
                  title="Volver a ver el promedio general de todas las auditorías"
                >
                  <RotateCcw size={12} />
                  <span>Ver Promedio</span>
                </button>
              </div>
            )}
          </div>

          <AuditRadarChart scores={activeRadarScores} />

          <div className="grid grid-cols-5 gap-2 pt-4 border-t border-slate-100 text-center">
            <div className="bg-cyan-50/80 border border-cyan-200 rounded-xl p-2">
              <span className="text-[10px] font-black text-cyan-800 uppercase tracking-wider block">S</span>
              <span className="text-[11px] text-slate-800 block font-bold leading-tight">Seleccionar</span>
              <span className="text-[9px] text-slate-500 block">1S Seiri</span>
              <span className="text-sm font-black text-cyan-900 mt-1 block">{activeRadarScores.s1}%</span>
            </div>
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2">
              <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">O</span>
              <span className="text-[11px] text-slate-800 block font-bold leading-tight">Ordenar</span>
              <span className="text-[9px] text-slate-500 block">2S Seiton</span>
              <span className="text-sm font-black text-indigo-900 mt-1 block">{activeRadarScores.s2}%</span>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">L</span>
              <span className="text-[11px] text-slate-800 block font-bold leading-tight">Limpiar</span>
              <span className="text-[9px] text-slate-500 block">3S Seiso</span>
              <span className="text-sm font-black text-emerald-900 mt-1 block">{activeRadarScores.s3}%</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">E</span>
              <span className="text-[11px] text-slate-800 block font-bold leading-tight">Estandarizar</span>
              <span className="text-[9px] text-slate-500 block">4S Seiketsu</span>
              <span className="text-sm font-black text-amber-900 mt-1 block">{activeRadarScores.s4}%</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">S</span>
              <span className="text-[11px] text-slate-800 block font-bold leading-tight">Sostener</span>
              <span className="text-[9px] text-slate-500 block">5S Shitsuke</span>
              <span className="text-sm font-black text-rose-900 mt-1 block">{activeRadarScores.s5}%</span>
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={scoreVariant} size="md">
                        {normScore >= 80 ? 'Excelente' : normScore >= 60 ? 'Regular' : 'Crítico'}
                      </Badge>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(audit);
                        }}
                        className="p-1.5 text-slate-500 hover:text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors"
                        title="Editar auditoría"
                      >
                        <Edit2 size={15} />
                      </button>
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
      </>
      )}

      {/* Execution Modal */}
      <AuditEvaluationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPlanToExecute(null);
        }}
        onSave={handleSaveAudit}
        initialArea={planToExecute?.area}
        initialAuditor={planToExecute?.auditor}
        initialAuditPlanId={planToExecute?.id}
        onSuccessAudit={async (result) => {
          if (result.planId) {
            await auditPlanService.togglePlanItemStatus(
              result.planId,
              'completed',
              result.score,
              result.auditId
            );
            toast.success(`Auditoría del plan en "${result.area}" marcada como realizada (${result.score}%)`, {
              icon: '🎉',
            });
          } else {
            await auditPlanService.linkAuditToPlan({
              id: result.auditId || '',
              companyId: effectiveCompanyId,
              area: result.area,
              auditor: result.auditor,
              totalScore: result.score,
            });
            toast.success(`Auditoría en "${result.area}" registrada (${result.score}%)`, {
              icon: '🎉',
            });
          }
          loadAudits();
        }}
      />

      {/* Edit Audit Modal */}
      <AuditEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAudit(null);
        }}
        audit={editingAudit}
        onSave={handleSaveEdit}
        suggestedAreas={availableAreas}
      />
    </div>
  );
};

export default AuditsPage;
