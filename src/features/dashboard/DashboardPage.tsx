import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import HeaderWithFilter from '../../components/common/HeaderWithFilter';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  ClipboardList,
  Target,
  Tag,
  MapPin,
  User,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import DrillDownModal, { DrillDownItem } from '../../components/common/DrillDownModal';

interface DashboardCardItem {
  id: string | number;
  status: string;
  companyId?: string | null;
  date?: string;
  solutionDate?: string;
  updatedAt?: string;
  area?: string;
  description?: string;
  cardNumber?: string;
  [key: string]: any;
}

interface DashboardQuickWinItem {
  id: string | number;
  status: string;
  companyId?: string | null;
  impact?: string;
  title: string;
  responsible?: string | null;
  [key: string]: any;
}

interface DashboardVsmItem {
  id: string | number;
  name: string;
  status: string;
  responsible?: string | null;
  companyId?: string | null;
  [key: string]: any;
}

interface DashboardA3Item {
  id: string | number;
  companyId?: string | null;
  title: string;
  status: string;
  responsible?: string | null;
  created_at: string;
  actionPlan: any[];
  followUpData: any[];
  [key: string]: any;
}

interface ActivityItem {
  id: string | number;
  type: '5S' | 'QW' | 'A3' | 'AUDIT';
  rawDate: string;
  title: string;
  statusLabel?: string;
  action?: string;
  location?: string;
  area?: string;
  reason?: string;
  responsible?: string | null;
  description?: string;
  status?: string;
  article?: string;
  cardNumber?: string | null;
  score?: number;
  impact?: string | null;
  [key: string]: any;
}

const getNormalizedScore = (score: number | null | undefined): number => {
  if (!score || score <= 0) return 0;
  if (score <= 5) {
    return Math.min(100, Math.round((score / 5) * 100));
  }
  return Math.min(100, Math.round(score));
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, globalFilterCompanyId, activeSchema, refreshData } = useAuth();
  const [data, setData] = useState<{
    fiveS: DashboardCardItem[];
    quickWins: DashboardQuickWinItem[];
    vsms: DashboardVsmItem[];
    a3: DashboardA3Item[];
    audits: any[];
    recentActivity: ActivityItem[];
  }>({
    fiveS: [],
    quickWins: [],
    vsms: [],
    a3: [],
    audits: [],
    recentActivity: [],
  });

  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    type: string | null;
    title: string;
    data: DrillDownItem[];
  }>({
    isOpen: false,
    type: null,
    title: '',
    data: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    function onFullscreenChange() {
      const doc = document as any;
      const isFull = Boolean(
        doc.fullscreenElement ||
          doc.mozFullScreenElement ||
          doc.webkitFullscreenElement ||
          doc.msFullscreenElement
      );
      setIsFullScreen(isFull);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  // 1. Fetch Data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const isAdmin = user.isGlobalAdmin;

        const applyFilter = (query: any) => {
          if (
            isAdmin &&
            globalFilterCompanyId &&
            globalFilterCompanyId !== 'all' &&
            globalFilterCompanyId !== 'null'
          ) {
            return query.eq('company_id', globalFilterCompanyId);
          }
          return query;
        };

        const fiveSPromise = applyFilter(
          supabase
            .from('five_s_cards')
            .select(
              'id, status, company_id, created_at, close_date, updated_at, area, description'
            )
        );

        const qwPromise = applyFilter(
          supabase
            .from('quick_wins')
            .select('id, status, impact, company_id, title, responsible')
        );

        const vsmPromise = applyFilter(
          supabase
            .from('vsm_projects')
            .select('id, name, status, responsible, company_id, created_at')
        );

        const a3Promise = applyFilter(
          supabase
            .from('a3_projects')
            .select(
              'id, title, status, responsible, created_at, action_plan, follow_up_data, company_id'
            )
        );

        const recentFiveSPromise = applyFilter(
          supabase
            .from('five_s_cards')
            .select(
              'id, created_at, findings, area, description, assigned_to, responsible, status, company_id, card_number'
            )
            .order('created_at', { ascending: false })
            .limit(10)
        );

        const recentQwPromise = applyFilter(
          supabase
            .from('quick_wins')
            .select(
              'id, created_at, title, description, responsible, status, impact, company_id'
            )
            .order('created_at', { ascending: false })
            .limit(8)
        );

        const auditsPromise = applyFilter(
          supabase
            .from('audit_5s')
            .select('id, total_score, audit_date, area, auditor, company_id, title, status, created_at')
            .neq('status', 'programada')
            .neq('status', 'scheduled')
            .order('audit_date', { ascending: false })
        );

        const profilesPromise = supabase
          .from('profiles')
          .select('id, full_name, email');

        const [fiveSRes, qwRes, vsmRes, a3Res, recFiveS, recQw, profilesRes, auditsRes] =
          await Promise.all([
            fiveSPromise,
            qwPromise,
            vsmPromise,
            a3Promise,
            recentFiveSPromise,
            recentQwPromise,
            profilesPromise,
            auditsPromise,
          ]);

        // Process 5S Cards
        const fiveS: DashboardCardItem[] = (fiveSRes.data || []).map((c: any) => ({
          id: c.id,
          status: c.status,
          companyId: c.company_id,
          date: c.created_at,
          solutionDate: c.close_date,
          updatedAt: c.updated_at,
          area: c.area,
          description: c.description,
          cardNumber: c.id ? String(c.id).slice(-4) : '?',
        }));

        // Process Quick Wins
        const quickWins: DashboardQuickWinItem[] = (qwRes.data || []).map(
          (w: any) => ({
            id: w.id,
            status: w.status,
            companyId: w.company_id,
            impact: w.impact,
            title: w.title,
            responsible: w.responsible,
          })
        );

        // Process VSMs
        const vsms: DashboardVsmItem[] = (vsmRes.data || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          status: v.status,
          responsible: v.responsible,
          companyId: v.company_id,
        }));

        // Process A3 Projects
        const a3List: DashboardA3Item[] = (a3Res.data || []).map((p: any) => {
          let parsedPlan: any[] = [];
          if (Array.isArray(p.action_plan)) {
            parsedPlan = p.action_plan;
          } else if (typeof p.action_plan === 'string') {
            try {
              const res = JSON.parse(p.action_plan);
              if (Array.isArray(res)) parsedPlan = res;
            } catch {
              parsedPlan = [];
            }
          }

          return {
            id: p.id,
            companyId: p.company_id,
            title: p.title,
            status: p.status,
            responsible: p.responsible,
            created_at: p.created_at,
            actionPlan: parsedPlan,
            followUpData: Array.isArray(p.follow_up_data)
              ? p.follow_up_data
              : p.follow_up_data && Object.keys(p.follow_up_data).length > 0
              ? [p.follow_up_data]
              : [],
          };
        });

        // Build profiles map for human-readable names (never display raw UUIDs)
        const profileMap = new Map<string, string>();
        (profilesRes.data || []).forEach((p: any) => {
          if (p.id) {
            const name = p.full_name?.trim() || p.email?.trim() || '';
            if (name) profileMap.set(p.id, name);
          }
        });

        const resolvePerson = (val: any): string => {
          if (!val) return 'Sin asignar';
          if (typeof val !== 'string') return String(val);
          const clean = val.trim();
          if (profileMap.has(clean)) {
            return profileMap.get(clean)!;
          }
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
          if (isUuid) {
            return 'Responsable asignado';
          }
          return clean;
        };

        // Process Recent Activity Feed
        const allowedModules = user.allowedModules || [
          '5s',
          'a3',
          'vsm',
          'quick_wins',
          'auditoria_5s',
          'consultor_ia',
        ];

        const recentActivity: ActivityItem[] = [];

        if (allowedModules.includes('5s')) {
          recentActivity.push(
            ...(recFiveS.data || []).map((i: any) => {
              const isClosed = ['cerrado', 'cerrada', 'resuelto', 'resuelta'].includes(
                (i.status || '').toLowerCase()
              );
              const inProgress = ['en proceso', 'en progreso', 'atendiendo'].includes(
                (i.status || '').toLowerCase()
              );

              const statusLabel = isClosed
                ? 'Cerrada'
                : inProgress
                ? 'En Proceso'
                : 'Levantada';

              const title =
                i.findings?.trim() ||
                i.description?.trim() ||
                `Tarjeta 5S en ${i.area || 'Planta'}`;

              return {
                id: i.id,
                type: '5S' as const,
                rawDate: i.created_at,
                title,
                statusLabel,
                area: i.area?.trim() || 'General',
                cardNumber: i.card_number || null,
                findings: i.findings?.trim() || '',
                description: i.description?.trim() || '',
                status: i.status || 'Abierto',
                responsible: resolvePerson(i.responsible || i.assigned_to),
              };
            })
          );
        }

        if (allowedModules.includes('quick_wins')) {
          recentActivity.push(
            ...(recQw.data || []).map((i: any) => {
              const isDone = ['done', 'completada', 'cerrada', 'implementada'].includes(
                (i.status || '').toLowerCase()
              );
              const inProgress = ['in_progress', 'en proceso', 'ejecucion'].includes(
                (i.status || '').toLowerCase()
              );
              const statusLabel = isDone
                ? 'Implementada'
                : inProgress
                ? 'En Ejecución'
                : 'Propuesta';

              return {
                id: i.id,
                type: 'QW' as const,
                rawDate: i.created_at,
                title: i.title || 'Mejora rápida',
                statusLabel,
                description: i.description || '',
                impact: i.impact || null,
                status: i.status || 'pending',
                responsible: resolvePerson(i.responsible),
              };
            })
          );
        }

        if (allowedModules.includes('a3')) {
          recentActivity.push(
            ...a3List.slice(0, 6).map((i: any) => {
              const isDone = ['done', 'cerrado', 'completado'].includes(
                (i.status || '').toLowerCase()
              );
              const statusLabel = isDone ? 'Finalizado' : 'En Curso';

              return {
                id: i.id,
                type: 'A3' as const,
                rawDate: i.created_at,
                title: i.title || 'Proyecto A3',
                statusLabel,
                status: i.status || 'in_progress',
                responsible: resolvePerson(i.responsible),
              };
            })
          );
        }

        if (allowedModules.includes('auditoria_5s')) {
          recentActivity.push(
            ...(auditsRes.data || []).slice(0, 6).map((i: any) => {
              const scoreNum = Number(i.total_score) || 0;
              const normalizedPct =
                scoreNum <= 5 && scoreNum > 0
                  ? Math.min(100, Math.round((scoreNum / 5) * 100))
                  : Math.min(100, Math.round(scoreNum));

              return {
                id: i.id,
                type: 'AUDIT' as const,
                rawDate: i.audit_date || i.created_at,
                title: i.title || `Auditoría 5S en ${i.area || 'Planta'}`,
                statusLabel: `Completada (${normalizedPct}%)`,
                area: i.area || 'Planta',
                score: normalizedPct,
                status: 'Realizada',
                responsible: resolvePerson(i.auditor),
              };
            })
          );
        }

        const sortedActivity = recentActivity
          .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
          .slice(0, 15);

        const rawAudits = (auditsRes.data || []).map((a: any) => ({
          id: a.id,
          total_score: a.total_score,
          audit_date: a.audit_date,
          area: a.area,
          auditor: a.auditor,
          companyId: a.company_id,
          title: a.title,
          status: a.status,
          created_at: a.created_at,
        }));

        setData({
          fiveS,
          quickWins,
          vsms,
          a3: a3List,
          audits: rawAudits,
          recentActivity: sortedActivity,
        });
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err?.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Safety timeout: 8s max
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(safetyTimer);
  }, [user, globalFilterCompanyId, activeSchema]);

  // 2. Filter Data
  const filteredData = useMemo(() => {
    if (!user) return { fiveS: [], quickWins: [], vsms: [], a3: [], audits: [] };

    const isAdmin = user.isGlobalAdmin;
    const targetCompanyId = isAdmin ? globalFilterCompanyId : user.companyId;

    const filterByCompany = <T extends { companyId?: string | null }>(items: T[]): T[] => {
      if (!Array.isArray(items)) return [];
      if (!targetCompanyId || targetCompanyId === 'all') return items;
      return items.filter((item) => item.companyId && item.companyId == targetCompanyId);
    };

    return {
      fiveS: filterByCompany(data.fiveS),
      quickWins: filterByCompany(data.quickWins),
      vsms: filterByCompany(data.vsms),
      a3: filterByCompany(data.a3),
      audits: filterByCompany(data.audits),
    };
  }, [user, globalFilterCompanyId, data]);

  // 3. Compute Metrics
  const metrics = useMemo(() => {
    const { fiveS, quickWins, vsms, a3 } = filteredData;
    const fiveSClosed = fiveS.filter((i) => i.status === 'Cerrado').length;
    const fiveSTotal = fiveS.length;
    const fiveSPending = fiveS.filter((i) => i.status === 'Pendiente').length;
    const fiveSInProcess = fiveS.filter((i) => i.status === 'En Proceso').length;
    const fiveSCompletion =
      fiveSTotal > 0 ? Math.round((fiveSClosed / fiveSTotal) * 100) : 0;

    // Calculate Average, Min, Max Closure Time
    const closedCards = fiveS.filter((c) => c.status === 'Cerrado');

    let totalDaysClosed = 0;
    let validClosedCount = 0;
    let minDays: number | null = null;
    let maxDays = 0;

    for (const c of closedCards) {
      const endDateString = c.solutionDate || c.updatedAt;
      if (!c.date || !endDateString) continue;
      const start = new Date(c.date);
      const end = new Date(endDateString);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      let days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 0) days = 0;

      totalDaysClosed += days;
      validClosedCount++;

      if (minDays === null || days < minDays) minDays = days;
      if (days > maxDays) maxDays = days;
    }

    const avgClosureDays =
      validClosedCount > 0 ? (totalDaysClosed / validClosedCount).toFixed(1) : '0.0';
    const fastestClosure = minDays !== null ? Number(minDays).toFixed(1) : '0.0';
    const slowestClosure = maxDays.toFixed(1);

    const winsDone = quickWins.filter((i) => i.status === 'done').length;
    const winsTotal = quickWins.length;
    const winsImpact = quickWins.filter((i) => i.impact === 'Alto').length;

    const vsmCount = vsms.length;

    // A3 Metrics based on Action Plan Tasks
    let totalA3Tasks = 0;
    let totalProgressSum = 0;
    let completedA3Tasks = 0;

    a3.forEach((project) => {
      let actions = (project.actionPlan || project.action_plan || []) as any[];
      if (typeof actions === 'string') {
        try {
          actions = JSON.parse(actions);
        } catch {
          actions = [];
        }
      }

      if (Array.isArray(actions)) {
        actions.forEach((task: any) => {
          totalA3Tasks += 1;

          let taskProgress = 0;
          const isDone =
            task.status === 'completed' ||
            task.status === 'done' ||
            task.status === 'Completada' ||
            task.status === 'completado';

          if (isDone) {
            taskProgress = 100;
            completedA3Tasks += 1;
          } else if (typeof task.progress === 'number' && !isNaN(task.progress)) {
            taskProgress = Math.max(0, Math.min(100, task.progress));
            if (taskProgress === 100) completedA3Tasks += 1;
          } else if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
            const completedSubs = task.subtasks.filter((s: any) => s.completed).length;
            taskProgress = Math.round((completedSubs / task.subtasks.length) * 100);
            if (taskProgress === 100) completedA3Tasks += 1;
          } else {
            taskProgress = 0;
          }

          totalProgressSum += taskProgress;
        });
      }
    });

    const a3AvgProgress =
      totalA3Tasks > 0
        ? Math.round(totalProgressSum / totalA3Tasks)
        : a3.length > 0
        ? Math.round(
            (a3.filter((p) => p.status === 'Completado' || p.status === 'Cerrado')
              .length /
              a3.length) *
              100
          )
        : 0;

    return {
      fiveS: {
        total: fiveSTotal,
        closed: fiveSClosed,
        pending: fiveSPending,
        inProcess: fiveSInProcess,
        rate: fiveSCompletion,
        avgClosure: avgClosureDays,
        minClosure: fastestClosure,
        maxClosure: slowestClosure,
      },
      quickWins: { total: winsTotal, done: winsDone, impact: winsImpact },
      vsm: { count: vsmCount },
      a3: {
        total: a3.length,
        closed: a3.filter((p) => p.status === 'Cerrado' || p.status === 'Completado').length,
        rate: a3AvgProgress,
        totalTasks: totalA3Tasks,
        completedTasks: completedA3Tasks,
      },
    };
  }, [filteredData]);

  // 3b. Nivel de Madurez Operacional (Auditorías 5S)
  const auditMaturity = useMemo(() => {
    const auditsList = filteredData.audits || [];
    let high = 0;
    let mid = 0;
    let low = 0;
    let totalScoreSum = 0;

    const validAudits = auditsList.filter((a: any) => {
      const score = Number(a.total_score) || 0;
      return score > 0 || (a.area && a.area.trim() !== '');
    });

    validAudits.forEach((a: any) => {
      const score = getNormalizedScore(a.total_score);
      totalScoreSum += score;
      if (score >= 80) high++;
      else if (score >= 60) mid++;
      else low++;
    });

    const total = validAudits.length;
    const avgScore = total > 0 ? Math.round(totalScoreSum / total) : 0;

    return {
      total,
      avgScore,
      high,
      mid,
      low,
      distribution: [
        {
          name: 'Excelente (≥ 80%)',
          key: 'high',
          value: high,
          percentage: total > 0 ? Math.round((high / total) * 100) : 0,
          color: '#10b981',
        },
        {
          name: 'Regular (60 - 79%)',
          key: 'mid',
          value: mid,
          percentage: total > 0 ? Math.round((mid / total) * 100) : 0,
          color: '#f59e0b',
        },
        {
          name: 'Crítico (< 60%)',
          key: 'low',
          value: low,
          percentage: total > 0 ? Math.round((low / total) * 100) : 0,
          color: '#ef4444',
        },
      ],
    };
  }, [filteredData.audits]);

  // 4. Drill Down Handler
  const handleDrillDown = (type: string, title: string) => {
    let modalData: DrillDownItem[] = [];

    if (type === '5s') {
      modalData = filteredData.fiveS;
    } else if (type === 'quick_wins') {
      modalData = filteredData.quickWins;
    } else if (type === '5s_closed') {
      modalData = filteredData.fiveS
        .filter((c) => c.status === 'Cerrado')
        .map((c) => {
          let days = 0;
          if (c.date && (c.solutionDate || c.updatedAt)) {
            const start = new Date(c.date);
            const end = new Date(c.solutionDate || c.updatedAt || '');
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              days = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            }
          }
          return { ...c, daysToClose: days };
        });
    } else if (type === 'vsm') {
      modalData = filteredData.vsms;
    } else if (type === 'high_impact') {
      modalData = filteredData.quickWins.filter((w) => w.impact === 'Alto');
    } else if (type === 'a3') {
      modalData = filteredData.a3.map((p) => {
        let actions = (p.actionPlan || p.action_plan || []) as any[];
        if (typeof actions === 'string') {
          try {
            actions = JSON.parse(actions);
          } catch {
            actions = [];
          }
        }
        const total = Array.isArray(actions) ? actions.length : 0;
        let sum = 0;
        let done = 0;
        if (Array.isArray(actions)) {
          actions.forEach((a) => {
            let pr = 0;
            const isDone =
              a.status === 'completed' ||
              a.status === 'done' ||
              a.status === 'Completada' ||
              a.status === 'completado';
            if (isDone) {
              pr = 100;
              done++;
            } else if (typeof a.progress === 'number' && !isNaN(a.progress)) {
              pr = Math.max(0, Math.min(100, a.progress));
              if (pr === 100) done++;
            } else if (Array.isArray(a.subtasks) && a.subtasks.length > 0) {
              const sc = a.subtasks.filter((s: any) => s.completed).length;
              pr = Math.round((sc / a.subtasks.length) * 100);
              if (pr === 100) done++;
            }
            sum += pr;
          });
        }
        const avg = total > 0 ? Math.round(sum / total) : 0;
        return {
          ...p,
          progressStr: total > 0 ? `${avg}% (${done}/${total} tareas)` : 'Sin tareas',
        };
      });
    }

    setDrillDown({
      isOpen: true,
      type,
      title,
      data: modalData,
    });
  };

  // 5. Extract all Charts from Active A3 Projects for Monitoring
  const activeCharts = useMemo(() => {
    const charts: any[] = [];
    filteredData.a3.forEach((project) => {
      if (project.followUpData && Array.isArray(project.followUpData)) {
        project.followUpData.forEach((chart: any) => {
          const isVisible = chart.showInDashboard !== false;

          if (isVisible && chart.dataPoints && chart.dataPoints.length > 0) {
            let processedData: any[] = [];

            // Logic for OEE charts
            if (chart.kpiType === 'oee') {
              const oeeConfig = chart.oeeConfig || { standardSpeed: 100 };

              processedData = chart.dataPoints.map((point: any) => {
                const availableTime = parseFloat(point.availableTime) || 0;
                const productiveTime = parseFloat(point.productiveTime) || 0;
                const producedPieces = parseFloat(point.producedPieces) || 0;
                const defectPieces = parseFloat(point.defectPieces) || 0;
                const standardSpeed = parseFloat(oeeConfig.standardSpeed) || 100;

                const availability =
                  availableTime > 0 ? (productiveTime / availableTime) * 100 : 0;
                const theoreticalOutput = productiveTime * standardSpeed;
                const performance =
                  theoreticalOutput > 0
                    ? (producedPieces / theoreticalOutput) * 100
                    : 0;
                const quality =
                  producedPieces > 0
                    ? ((producedPieces - defectPieces) / producedPieces) * 100
                    : 0;
                const oee = (availability * performance * quality) / 10000;

                return {
                  date: point.date,
                  value: Math.round(oee * 10) / 10,
                };
              });
            } else {
              processedData = chart.dataPoints.map((p: any) => ({
                date: p.date,
                value:
                  p.value !== null && p.value !== undefined ? parseFloat(p.value) : 0,
              }));
            }

            const sortedData = processedData.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            charts.push({
              uniqueId: `${project.id}-${chart.id || Math.random()}`,
              projectId: project.id,
              projectTitle: project.title,
              responsible: project.responsible,
              kpiName: chart.kpiName || 'KPI Sin Nombre',
              goal: chart.kpiGoal,
              isPercentage: chart.kpiType === 'oee' ? true : chart.isPercentage,
              data: sortedData,
              lastValue: sortedData[sortedData.length - 1]?.value ?? 0,
            });
          }
        });
      }
    });
    return charts;
  }, [filteredData]);

  if (!user) return <LoadingScreen fullScreen={false} />;

  const isInitialLoading =
    loading &&
    data.fiveS.length === 0 &&
    data.quickWins.length === 0 &&
    data.vsms.length === 0 &&
    data.a3.length === 0;

  if (isInitialLoading) {
    return <LoadingScreen fullScreen={false} />;
  }

  if (error) {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-slate-500 space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Zap size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-700 font-sans">
          No pudimos cargar los datos
        </h3>
        <p className="max-w-md text-center text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full mx-auto space-y-8 animate-in fade-in duration-500 pb-12 ${
        loading ? 'opacity-70 pointer-events-none' : ''
      }`}
    >
      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ ...drillDown, isOpen: false })}
        title={drillDown.title}
        type={drillDown.type}
        data={drillDown.data}
      />

      <HeaderWithFilter
        title="Dashboard General"
        subtitle="Visión global del desempeño operativo (KPIs)"
      >
        <button
          onClick={refreshData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all font-semibold text-xs whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm active:scale-[0.98] mr-2 font-sans"
          title="Recargar Empresas y Datos"
        >
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
        <button
          onClick={toggleFullScreen}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all font-semibold text-xs whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm active:scale-[0.98] font-sans"
          title={isFullScreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
        >
          {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span className="hidden sm:inline">
            {isFullScreen ? 'Salir' : 'Pantalla Completa'}
          </span>
        </button>
      </HeaderWithFilter>

      {/* Top Stats Row: 3 Columnas perfectamente alineadas con los gráficos inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(user?.allowedModules || ['5s']).includes('5s') && (
          <div
            onClick={() => handleDrillDown('5s', 'Listado de Tarjetas 5S')}
            className="cursor-pointer block transform transition-transform hover:scale-105 active:scale-95"
          >
            <StatCard
              title="Tarjetas 5S"
              value={metrics.fiveS.total}
              subtitle={`${metrics.fiveS.rate}% Cumplimiento`}
              icon={<ClipboardList />}
              variant="green"
              type="solid"
            />
          </div>
        )}

        {(user?.allowedModules || ['quick_wins']).includes('quick_wins') && (
          <div
            onClick={() => handleDrillDown('quick_wins', 'Listado de Quick Wins')}
            className="cursor-pointer block transform transition-transform hover:scale-105 active:scale-95"
          >
            <StatCard
              title="Quick Wins"
              value={metrics.quickWins.done}
              subtitle={`de ${metrics.quickWins.total} Ideas Registradas`}
              icon={<Zap size={28} />}
              variant="yellow"
              type="solid"
            />
          </div>
        )}

        {(user?.allowedModules || ['a3']).includes('a3') && (
          <div
            onClick={() => handleDrillDown('a3', 'Listado de Planes A3')}
            className="cursor-pointer block transform transition-transform hover:scale-105 active:scale-95"
          >
            <StatCard
              title="Planes A3"
              value={metrics.a3.total}
              subtitle={`${metrics.a3.rate}% de Avance`}
              icon={<FileText size={28} />}
              variant="indigo"
              type="solid"
            />
          </div>
        )}
      </div>

      {/* Dashboard Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PROGRESS RINGS ROW */}
        <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: 5S */}
          {(user?.allowedModules || ['5s']).includes('5s') && (
            <div
              onClick={() => handleDrillDown('5s', 'Detalle de Tarjetas 5S')}
              className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px] cursor-pointer hover:shadow-lg transition-shadow"
            >
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2 font-sans">
                <ClipboardList size={16} /> Completado 5S
              </h4>
              <div
                className="w-full h-56 relative z-10"
                style={{ minWidth: '200px', minHeight: '200px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="gradient-5s" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        { value: metrics.fiveS.rate },
                        { value: 100 - metrics.fiveS.rate },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={12}
                    >
                      <Cell fill="url(#gradient-5s)" strokeWidth={0} />
                      <Cell fill="#f1f5f9" strokeWidth={0} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-emerald-500 font-sans">
                    {metrics.fiveS.rate}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-sans">
                    Avance
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12 pointer-events-none">
                <ClipboardList size={120} className="text-emerald-500" />
              </div>
            </div>
          )}

          {/* CARD 2: QUICK WINS */}
          {(user?.allowedModules || ['quick_wins']).includes('quick_wins') && (
            <div
              onClick={() => handleDrillDown('quick_wins', 'Detalle de Quick Wins')}
              className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px] cursor-pointer hover:shadow-lg transition-shadow"
            >
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2 font-sans">
                <Zap size={16} /> Quick Wins
              </h4>
              <div
                className="w-full h-56 relative z-10"
                style={{ minWidth: '200px', minHeight: '200px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="gradient-qw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        {
                          value:
                            metrics.quickWins.total > 0
                              ? Math.round(
                                  (metrics.quickWins.done / metrics.quickWins.total) *
                                    100
                                )
                              : 0,
                        },
                        {
                          value:
                            100 -
                            (metrics.quickWins.total > 0
                              ? Math.round(
                                  (metrics.quickWins.done / metrics.quickWins.total) *
                                    100
                                )
                              : 0),
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={12}
                    >
                      <Cell fill="url(#gradient-qw)" />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-amber-500 font-sans">
                    {metrics.quickWins.total > 0
                      ? Math.round(
                          (metrics.quickWins.done / metrics.quickWins.total) * 100
                        )
                      : 0}
                    %
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-sans">
                    Avance
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12 pointer-events-none">
                <Zap size={120} className="text-amber-500" />
              </div>
            </div>
          )}

          {/* CARD 3: A3 PROJECTS */}
          {(user?.allowedModules || ['a3']).includes('a3') && (
            <div
              onClick={() => handleDrillDown('a3', 'Detalle de Proyectos A3')}
              className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px] cursor-pointer hover:shadow-lg transition-shadow"
            >
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2 font-sans">
                <Activity size={16} /> Proyectos A3
              </h4>
              <div
                className="w-full h-56 relative z-10"
                style={{ minWidth: '200px', minHeight: '200px' }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="gradient-a3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        { value: metrics.a3.rate },
                        { value: Math.max(0, 100 - metrics.a3.rate) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={12}
                    >
                      <Cell fill="url(#gradient-a3)" strokeWidth={0} />
                      <Cell fill="#f1f5f9" strokeWidth={0} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-indigo-500 font-sans">
                    {metrics.a3.rate}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-sans">
                    Avance
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12 pointer-events-none">
                <Activity size={120} className="text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* A3 KPI MONITORING */}
        {(user?.allowedModules || ['a3']).includes('a3') && (
          <div className="col-span-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 font-sans">
              <Activity size={20} className="text-indigo-600" /> Monitoreo de KPIs
            </h3>

            {activeCharts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeCharts.map((chart, idx) => {
                  const firstValue = chart.data[0]?.value || 0;
                  const lastValue = parseFloat(chart.lastValue) || 0;
                  const deltaPercent =
                    firstValue !== 0
                      ? ((lastValue - firstValue) / firstValue) * 100
                      : 0;
                  const isPositive = deltaPercent >= 0;
                  const deltaString = `${isPositive ? '+' : ''}${Math.round(
                    deltaPercent
                  )}% vs. inicio`;

                  const colors = [
                    {
                      stop1: '#8b5cf6',
                      stop2: '#c4b5fd',
                      stroke: '#7c3aed',
                      bg: 'bg-purple-50',
                      text: 'text-purple-600',
                    },
                    {
                      stop1: '#10b981',
                      stop2: '#6ee7b7',
                      stroke: '#059669',
                      bg: 'bg-emerald-50',
                      text: 'text-emerald-600',
                    },
                    {
                      stop1: '#f59e0b',
                      stop2: '#fcd34d',
                      stroke: '#d97706',
                      bg: 'bg-amber-50',
                      text: 'text-amber-600',
                    },
                  ];
                  const theme = colors[idx % colors.length];

                  return (
                    <div
                      key={chart.uniqueId}
                      className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 flex flex-col justify-between h-[300px]"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-extrabold text-slate-900 text-sm font-sans tracking-wide">
                            {chart.kpiName}
                          </h5>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span
                              className={`text-4xl font-black ${theme.text} font-sans`}
                            >
                              {chart.lastValue}
                              {chart.isPercentage ? '%' : ''}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <span
                              className={
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }
                            >
                              {deltaString}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full ${theme.bg} flex items-center justify-center ${theme.text}`}
                        >
                          <Activity size={20} />
                        </div>
                      </div>

                      {/* Chart Area */}
                      <div
                        className="h-[140px] w-full -mx-2 overflow-hidden"
                        style={{ minWidth: '200px', minHeight: '120px' }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chart.data}>
                            <defs>
                              <linearGradient
                                id={`gradient-${chart.uniqueId}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor={theme.stop1}
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={theme.stop1}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <YAxis hide domain={['dataMin', 'auto']} />
                            <XAxis dataKey="date" hide />
                            <Tooltip
                              contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                fontSize: '12px',
                              }}
                              formatter={(value: any) => [
                                chart.isPercentage ? `${value}%` : value,
                                'Valor',
                              ]}
                              labelFormatter={(label) =>
                                new Date(label).toLocaleDateString('es-ES')
                              }
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={theme.stroke}
                              strokeWidth={3}
                              fill={`url(#gradient-${chart.uniqueId})`}
                              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Footer X-Axis Labels */}
                      <div className="flex justify-between text-[11px] text-slate-900 font-extrabold uppercase tracking-wider mt-2 border-t border-slate-200 pt-2 font-sans">
                        <span className="text-slate-900 font-bold">
                          {chart.data[0]
                            ? new Date(chart.data[0].date).toLocaleDateString('es-ES', {
                                month: 'short',
                              })
                            : ''}
                        </span>
                        <span className="truncate max-w-[150px] text-slate-900 font-bold" title={chart.projectTitle}>
                          {chart.projectTitle}
                        </span>
                        <span className="text-slate-900 font-bold">
                          {chart.data[chart.data.length - 1]
                            ? new Date(
                                chart.data[chart.data.length - 1].date
                              ).toLocaleDateString('es-ES', { month: 'short' })
                            : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <Activity size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium font-sans">
                  No hay gráficos de seguimiento activos
                </p>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Crea un A3 y añade gráficos con "Mostrar en Dashboard" activo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NIVEL DE MADUREZ OPERACIONAL (AUDITORÍAS 5S) */}
        {(user?.allowedModules || ['5s', 'auditoria_5s']).some((m) =>
          ['5s', 'audits', 'auditoria_5s'].includes(m)
        ) && (
          <div
            onClick={() => navigate('/auditorias-5s')}
            className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-1 flex flex-col justify-between h-[340px] cursor-pointer group"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 font-sans leading-tight truncate">
                      Nivel de Madurez Operacional
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium font-sans truncate">
                      Distribución semafórica de auditorías en planta
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0 hidden sm:inline font-sans">
                  Ver módulo →
                </span>
              </div>

              {/* Donut Semafórico */}
              {auditMaturity.total > 0 ? (
                <div className="relative h-40 flex items-center justify-center my-0.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditMaturity.distribution.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {auditMaturity.distribution
                          .filter((d) => d.value > 0)
                          .map((entry, index) => (
                            <Cell
                              key={`audit-mature-${index}`}
                              fill={entry.color}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          `${value} auditorías (${
                            auditMaturity.total > 0
                              ? Math.round(
                                  (Number(value) / auditMaturity.total) * 100
                                )
                              : 0
                          }%)`,
                          name,
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

                  {/* Centro del Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none font-sans">
                      Promedio
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5 font-sans">
                      {auditMaturity.avgScore}%
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none font-sans">
                      Planta
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-medium font-sans">
                  Sin auditorías registradas
                </div>
              )}
            </div>

            {/* 3 Tarjetas Inferiores: Excelente / Regular / Crítico */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 font-sans">
              {auditMaturity.distribution.map((tier) => (
                <div
                  key={tier.key}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    tier.key === 'high'
                      ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200/90'
                      : tier.key === 'mid'
                      ? 'bg-amber-50/70 text-amber-950 border-amber-200/90'
                      : 'bg-rose-50/70 text-rose-950 border-rose-200/90'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase block truncate text-slate-900">
                    {tier.key === 'high'
                      ? 'Excelente'
                      : tier.key === 'mid'
                      ? 'Regular'
                      : 'Crítico'}
                  </span>
                  <span className="text-xl font-black block mt-0.5 font-sans text-slate-900">
                    {tier.value}
                  </span>
                  <span className="text-[10px] font-semibold block text-slate-600 font-sans">
                    {tier.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIMELINE ACTIVITY FEED */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-2 flex flex-col">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 z-10 flex items-center gap-2 font-sans">
            Actividad Reciente
          </h4>

          {/* Timeline Container */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[290px] relative pl-2 pt-2">
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 z-0"></div>

            {(() => {
              const allActivity = data.recentActivity || [];

              if (allActivity.length === 0)
                return (
                  <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                      <Activity size={32} />
                    </div>
                    <p className="text-slate-500 font-bold font-sans">
                      Sin actividad reciente
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Las acciones en 5S, Quick Wins y A3 aparecerán aquí.
                    </p>
                  </div>
                );

              return allActivity.map((item, idx) => {
                const dateObj = new Date(item.rawDate);
                const dateStr = isNaN(dateObj.getTime())
                  ? 'Reciente'
                  : dateObj.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                // Style by type
                let typeConfig = {
                  label: 'Tarjeta 5S',
                  icon: <Tag size={15} />,
                  color: 'text-amber-600 bg-amber-50 border border-amber-200/80',
                  ringColor: 'ring-amber-50',
                };

                if (item.type === '5S') {
                  typeConfig = {
                    label: 'Tarjeta 5S',
                    icon: <Tag size={15} />,
                    color: 'text-rose-600 bg-rose-50 border border-rose-200/80',
                    ringColor: 'ring-rose-50',
                  };
                } else if (item.type === 'QW') {
                  typeConfig = {
                    label: 'Quick Win',
                    icon: <Zap size={15} />,
                    color: 'text-amber-600 bg-amber-50 border border-amber-200/80',
                    ringColor: 'ring-amber-50',
                  };
                } else if (item.type === 'A3') {
                  typeConfig = {
                    label: 'Proyecto A3',
                    icon: <Target size={15} />,
                    color: 'text-indigo-600 bg-indigo-50 border border-indigo-200/80',
                    ringColor: 'ring-indigo-50',
                  };
                } else if (item.type === 'AUDIT') {
                  typeConfig = {
                    label: 'Auditoría 5S',
                    icon: <ClipboardList size={15} />,
                    color: 'text-emerald-600 bg-emerald-50 border border-emerald-200/80',
                    ringColor: 'ring-emerald-50',
                  };
                }

                // Status badge styling
                const isCompleted = [
                  'cerrada',
                  'cerrado',
                  'done',
                  'resuelto',
                  'resuelta',
                  'finalizado',
                  'implementada',
                  'completada',
                ].includes((item.status || item.statusLabel || '').toLowerCase());

                const inProgress = [
                  'en proceso',
                  'in_progress',
                  'en ejecución',
                  'en curso',
                  'atendiendo',
                ].includes((item.status || item.statusLabel || '').toLowerCase());

                let statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200/80';
                if (isCompleted) {
                  statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                } else if (inProgress) {
                  statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200/80';
                }

                return (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    className="relative pl-10 pb-6 last:pb-2 group"
                  >
                    {/* Timeline Dot */}
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 ring-4 ${typeConfig.ringColor} ${typeConfig.color}`}
                    >
                      {typeConfig.icon}
                    </div>

                    {/* Connector Line */}
                    {idx !== allActivity.length - 1 && (
                      <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col gap-1 -mt-1 font-sans">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {typeConfig.label}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                          >
                            {item.statusLabel || item.status || 'Registrado'}
                          </span>
                          {item.cardNumber && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{item.cardNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {dateStr}
                        </span>
                      </div>

                      {/* Main Title (Findings / Project Title) */}
                      <p className="text-sm font-bold text-slate-800 leading-snug group-hover:text-cyan-700 transition-colors">
                        {item.title || item.reason || 'Sin Título'}
                      </p>

                      {/* Metadata Row: Area & Responsible */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {item.area && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" />
                            <span className="text-slate-600">{item.area}</span>
                          </span>
                        )}

                        {item.responsible && item.responsible !== 'Sin asignar' && (
                          <span className="inline-flex items-center gap-1">
                            <User size={11} className="text-slate-400" />
                            <span className="text-slate-400">
                              {item.type === 'A3'
                                ? 'Líder:'
                                : item.type === 'AUDIT'
                                ? 'Auditor:'
                                : 'Responsable:'}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {item.responsible}
                            </span>
                          </span>
                        )}

                        {item.impact && (
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                            Impacto {item.impact}
                          </span>
                        )}
                      </div>

                      {/* Secondary description note if different from title */}
                      {item.description && item.description !== item.title && (
                        <p className="text-xs text-slate-500 italic pl-2.5 border-l-2 border-slate-200 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
