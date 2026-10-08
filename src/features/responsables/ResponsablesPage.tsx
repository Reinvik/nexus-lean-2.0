import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  ClipboardList,
  Zap,
  FileText,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Award,
  Search,
  ArrowLeft,
  Mail,
  ChevronRight,
  Target,
  BarChart2,
  Send,
  Copy,
  Check,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import toast from 'react-hot-toast';

// Helper: Calculate ISO week number and year
export const getISOWeekInfo = (
  d: Date | string
): { week: number; year: number; label: string; key: string } => {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) {
    const now = new Date();
    return getISOWeekInfo(now);
  }
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return {
    week: weekNr,
    year: target.getUTCFullYear(),
    label: `Sem ${weekNr}`,
    key: `${target.getUTCFullYear()}-W${String(weekNr).padStart(2, '0')}`,
  };
};

// Helper: Generate list of the last N ISO weeks
export const getLastNWeeks = (
  n: number = 8
): { week: number; year: number; label: string; key: string }[] => {
  const weeks = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weeks.push(getISOWeekInfo(d));
  }
  return weeks;
};

export interface TaskItem {
  id: string;
  type: '5S' | 'QW' | 'A3' | 'A3_ACTION' | 'AUDIT';
  title: string;
  area?: string;
  status: 'pending' | 'in_progress' | 'completed';
  rawStatus: string;
  createdAt: string;
  closeDate?: string;
  link: string;
  extra?: string;
  createdWeekKey: string;
  closedWeekKey?: string;
  rawTask?: any;
}

export interface WeeklyStat {
  weekKey: string;
  label: string;
  week: number;
  year: number;
  assigned: number;
  completed: number;
  efficiency: number;
}

export interface CollaboratorPerformance {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  avatarLetter: string;
  totalAssigned: number;
  totalCompleted: number;
  totalPending: number;
  totalInProgress: number;
  complianceRate: number; // 0 - 100%
  // Module breakdown
  fiveSCount: { pending: number; completed: number; total: number };
  quickWinsCount: { pending: number; completed: number; total: number };
  a3Count: { pending: number; completed: number; total: number };
  auditsCount: number;
  // Weekly performance
  weeklyHistory: WeeklyStat[];
  thisWeekCompleted: number;
  thisWeekAssigned: number;
  prevWeekCompleted: number;
  trendVsLastWeek: number;
  tasks: TaskItem[];
  // Raw items for send-email Edge Function
  rawTasks: {
    fiveS: any[];
    quickWins: any[];
    vsm: any[];
    a3: any[];
    a3Actions: any[];
  };
}

export const ResponsablesPage: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const [collaborators, setCollaborators] = useState<CollaboratorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollaboratorName, setSelectedCollaboratorName] = useState<string | null>(null);

  // Sorting: 'pending_desc' (quienes deben más tareas) is the default requested by user!
  const [sortBy, setSortBy] = useState<'pending_desc' | 'completed_desc' | 'compliance_asc' | 'name_asc'>('pending_desc');
  const [onlyPending, setOnlyPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [teamChartMetric, setTeamChartMetric] = useState<'tasks' | 'efficiency'>('tasks');

  // Email Reminder Modal State
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    collab: CollaboratorPerformance | null;
    email: string;
    isSending: boolean;
  }>({
    isOpen: false,
    collab: null,
    email: '',
    isSending: false,
  });

  // Load all team performance data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const applyFilter = (query: any) => {
        if (activeCompanyId && activeCompanyId !== 'all' && activeCompanyId !== 'null') {
          return query.eq('company_id', activeCompanyId);
        }
        return query;
      };

      const [profilesRes, cardsRes, winsRes, a3Res, auditsRes, vsmRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, role, company_id'),
        applyFilter(
          supabase
            .from('five_s_cards')
            .select('id, assigned_to, responsible, status, findings, area, description, card_number, created_at, close_date, updated_at, company_id')
        ),
        applyFilter(
          supabase
            .from('quick_wins')
            .select('id, responsible, status, title, description, impact, created_at, completed_at, date, deadline, company_id')
        ),
        applyFilter(
          supabase
            .from('a3_projects')
            .select('id, responsible, status, title, action_plan, created_at, date, company_id')
        ),
        applyFilter(
          supabase
            .from('audit_5s')
            .select('id, auditor, status, total_score, audit_date, area, created_at, company_id')
            .not('auditor', 'is', null)
        ),
        applyFilter(
          supabase
            .from('vsm_projects')
            .select('id, name, status, responsible, created_at, company_id')
        ),
      ]);

      // Profile dictionaries for clean name & email resolution
      const profileById = new Map<string, { id: string; name: string; email: string; role: string }>();
      const profileByName = new Map<string, { id: string; name: string; email: string; role: string }>();

      (profilesRes.data || []).forEach((p: any) => {
        const fullName = p.full_name?.trim() || '';
        const email = p.email?.trim() || '';
        const displayName = fullName || email;
        if (!displayName) return;

        const info = { id: p.id, name: displayName, email, role: p.role || 'Colaborador' };
        if (p.id) profileById.set(p.id, info);
        profileByName.set(displayName.toLowerCase(), info);
      });

      // Name resolver helper (strictly avoids raw UUIDs)
      const resolveNameAndProfile = (val: string | null | undefined) => {
        if (!val) return null;
        const clean = val.trim();
        if (profileById.has(clean)) {
          return profileById.get(clean)!;
        }
        if (profileByName.has(clean.toLowerCase())) {
          return profileByName.get(clean.toLowerCase())!;
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
        if (isUuid) {
          return { id: clean, name: 'Colaborador Operativo', email: '', role: 'Operador' };
        }
        return { id: undefined, name: clean, email: '', role: 'Colaborador' };
      };

      // Reference weeks: last 8 ISO weeks
      const recentWeeks = getLastNWeeks(8);
      const currentWeekInfo = getISOWeekInfo(new Date());
      const prevWeekInfo = getISOWeekInfo(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      // Collaborator map: Name -> Performance Record
      const map = new Map<string, CollaboratorPerformance>();

      const getOrInitCollaborator = (name: string, email?: string, role?: string, id?: string): CollaboratorPerformance => {
        const clean = name.trim();
        if (!map.has(clean)) {
          const initialWeeks: WeeklyStat[] = recentWeeks.map((w) => ({
            weekKey: w.key,
            label: w.label,
            week: w.week,
            year: w.year,
            assigned: 0,
            completed: 0,
            efficiency: 0,
          }));

          map.set(clean, {
            id,
            name: clean,
            email: email || '',
            role: role || 'Colaborador',
            avatarLetter: clean.charAt(0).toUpperCase() || 'U',
            totalAssigned: 0,
            totalCompleted: 0,
            totalPending: 0,
            totalInProgress: 0,
            complianceRate: 0,
            fiveSCount: { pending: 0, completed: 0, total: 0 },
            quickWinsCount: { pending: 0, completed: 0, total: 0 },
            a3Count: { pending: 0, completed: 0, total: 0 },
            auditsCount: 0,
            weeklyHistory: initialWeeks,
            thisWeekCompleted: 0,
            thisWeekAssigned: 0,
            prevWeekCompleted: 0,
            trendVsLastWeek: 0,
            tasks: [],
            rawTasks: {
              fiveS: [],
              quickWins: [],
              vsm: [],
              a3: [],
              a3Actions: [],
            },
          });
        }
        const record = map.get(clean)!;
        if (!record.email && email) record.email = email;
        if (!record.id && id) record.id = id;
        return record;
      };

      // 1. Process Five S Cards
      (cardsRes.data || []).forEach((c: any) => {
        const prof = resolveNameAndProfile(c.responsible || c.assigned_to);
        if (!prof) return;

        const isClosed = ['cerrado', 'cerrada', 'resuelto', 'resuelta'].includes((c.status || '').toLowerCase());
        const inProgress = ['en proceso', 'en progreso', 'atendiendo'].includes((c.status || '').toLowerCase());
        const taskStatus = isClosed ? 'completed' : inProgress ? 'in_progress' : 'pending';

        const createdWeek = getISOWeekInfo(c.created_at);
        const closedDate = c.close_date || (isClosed ? c.updated_at || c.created_at : undefined);
        const closedWeek = closedDate ? getISOWeekInfo(closedDate) : undefined;

        const item: TaskItem = {
          id: c.id,
          type: '5S',
          title: c.findings?.trim() || c.description?.trim() || `Tarjeta 5S #${c.card_number || ''}`,
          area: c.area?.trim() || 'General',
          status: taskStatus,
          rawStatus: c.status || 'Abierto',
          createdAt: c.created_at,
          closeDate: closedDate,
          link: `/5s`,
          extra: c.card_number ? `#${c.card_number}` : undefined,
          createdWeekKey: createdWeek.key,
          closedWeekKey: closedWeek?.key,
          rawTask: c,
        };

        const collab = getOrInitCollaborator(prof.name, prof.email, prof.role, prof.id);
        collab.tasks.push(item);
        collab.totalAssigned++;
        collab.fiveSCount.total++;

        // Raw task for send-email function
        collab.rawTasks.fiveS.push({
          id: c.id,
          reason: c.findings || c.description,
          location: c.area,
          status: c.status,
          date: c.created_at,
          solutionDate: c.close_date,
        });

        if (isClosed) {
          collab.totalCompleted++;
          collab.fiveSCount.completed++;
        } else if (inProgress) {
          collab.totalInProgress++;
          collab.fiveSCount.pending++;
        } else {
          collab.totalPending++;
          collab.fiveSCount.pending++;
        }

        const weekSlotAssigned = collab.weeklyHistory.find((w) => w.weekKey === createdWeek.key);
        if (weekSlotAssigned) weekSlotAssigned.assigned++;

        if (isClosed && closedWeek) {
          const weekSlotCompleted = collab.weeklyHistory.find((w) => w.weekKey === closedWeek.key);
          if (weekSlotCompleted) weekSlotCompleted.completed++;
        }
      });

      // 2. Process Quick Wins
      (winsRes.data || []).forEach((w: any) => {
        const prof = resolveNameAndProfile(w.responsible);
        if (!prof) return;

        const isClosed = ['done', 'completada', 'cerrada', 'implementada'].includes((w.status || '').toLowerCase());
        const inProgress = ['in_progress', 'en proceso', 'ejecucion'].includes((w.status || '').toLowerCase());
        const taskStatus = isClosed ? 'completed' : inProgress ? 'in_progress' : 'pending';

        const createdWeek = getISOWeekInfo(w.created_at || w.date);
        const closedDate = w.completed_at || (isClosed ? w.date || w.created_at : undefined);
        const closedWeek = closedDate ? getISOWeekInfo(closedDate) : undefined;

        const item: TaskItem = {
          id: w.id,
          type: 'QW',
          title: w.title || 'Mejora Rápida',
          status: taskStatus,
          rawStatus: w.status || 'Propuesta',
          createdAt: w.created_at || w.date,
          closeDate: closedDate,
          link: `/quick-wins`,
          extra: w.impact ? `Impacto ${w.impact}` : undefined,
          createdWeekKey: createdWeek.key,
          closedWeekKey: closedWeek?.key,
          rawTask: w,
        };

        const collab = getOrInitCollaborator(prof.name, prof.email, prof.role, prof.id);
        collab.tasks.push(item);
        collab.totalAssigned++;
        collab.quickWinsCount.total++;

        collab.rawTasks.quickWins.push({
          id: w.id,
          title: w.title,
          description: w.description,
          status: w.status,
          date: w.created_at || w.date,
        });

        if (isClosed) {
          collab.totalCompleted++;
          collab.quickWinsCount.completed++;
        } else if (inProgress) {
          collab.totalInProgress++;
          collab.quickWinsCount.pending++;
        } else {
          collab.totalPending++;
          collab.quickWinsCount.pending++;
        }

        const weekSlotAssigned = collab.weeklyHistory.find((w) => w.weekKey === createdWeek.key);
        if (weekSlotAssigned) weekSlotAssigned.assigned++;

        if (isClosed && closedWeek) {
          const weekSlotCompleted = collab.weeklyHistory.find((w) => w.weekKey === closedWeek.key);
          if (weekSlotCompleted) weekSlotCompleted.completed++;
        }
      });

      // 3. Process A3 Projects & 5W2H Action Plan Subtasks
      (a3Res.data || []).forEach((a: any) => {
        if (a.responsible) {
          const prof = resolveNameAndProfile(a.responsible);
          if (prof) {
            const isClosed = ['done', 'cerrado', 'completado'].includes((a.status || '').toLowerCase());
            const inProgress = ['in_progress', 'en proceso'].includes((a.status || '').toLowerCase());
            const taskStatus = isClosed ? 'completed' : inProgress ? 'in_progress' : 'pending';

            const createdWeek = getISOWeekInfo(a.created_at || a.date);
            const closedDate = isClosed ? a.date || a.created_at : undefined;
            const closedWeek = closedDate ? getISOWeekInfo(closedDate) : undefined;

            const item: TaskItem = {
              id: a.id,
              type: 'A3',
              title: a.title || 'Proyecto A3',
              status: taskStatus,
              rawStatus: a.status || 'Iniciado',
              createdAt: a.created_at,
              closeDate: closedDate,
              link: `/a3`,
              extra: 'Líder del Proyecto',
              createdWeekKey: createdWeek.key,
              closedWeekKey: closedWeek?.key,
              rawTask: a,
            };

            const collab = getOrInitCollaborator(prof.name, prof.email, prof.role, prof.id);
            collab.tasks.push(item);
            collab.totalAssigned++;
            collab.a3Count.total++;

            collab.rawTasks.a3.push({
              id: a.id,
              title: a.title,
              status: a.status,
              date: a.created_at,
            });

            if (isClosed) {
              collab.totalCompleted++;
              collab.a3Count.completed++;
            } else if (inProgress) {
              collab.totalInProgress++;
              collab.a3Count.pending++;
            } else {
              collab.totalPending++;
              collab.a3Count.pending++;
            }

            const weekSlotAssigned = collab.weeklyHistory.find((w) => w.weekKey === createdWeek.key);
            if (weekSlotAssigned) weekSlotAssigned.assigned++;

            if (isClosed && closedWeek) {
              const weekSlotCompleted = collab.weeklyHistory.find((w) => w.weekKey === closedWeek.key);
              if (weekSlotCompleted) weekSlotCompleted.completed++;
            }
          }
        }

        // Subtasks in Action Plan
        if (Array.isArray(a.action_plan)) {
          a.action_plan.forEach((act: any, idx: number) => {
            if (!act.responsible) return;
            const actProf = resolveNameAndProfile(act.responsible);
            if (!actProf) return;

            const isDone = ['done', 'completada', 'cerrada', 'ok'].includes((act.status || '').toLowerCase());
            const taskStatus = isDone ? 'completed' : 'pending';
            const actionDate = act.created_at || act.date || a.created_at || a.date;
            const createdWeek = getISOWeekInfo(actionDate);
            const closedDate = act.completed_at || act.solutionDate || (isDone ? actionDate : undefined);
            const closedWeek = closedDate ? getISOWeekInfo(closedDate) : undefined;

            const item: TaskItem = {
              id: `a3_act_${a.id}_${idx}`,
              type: 'A3_ACTION',
              title: act.activity || act.what || `Acción en ${a.title}`,
              status: taskStatus,
              rawStatus: act.status || 'Pendiente',
              createdAt: actionDate,
              closeDate: closedDate,
              link: `/a3`,
              extra: `A3: ${a.title}`,
              createdWeekKey: createdWeek.key,
              closedWeekKey: closedWeek?.key,
              rawTask: act,
            };

            const collab = getOrInitCollaborator(actProf.name, actProf.email, actProf.role, actProf.id);
            collab.tasks.push(item);
            collab.totalAssigned++;
            collab.a3Count.total++;

            collab.rawTasks.a3Actions.push({
              id: `act_${a.id}_${idx}`,
              activity: act.activity || act.what || 'Acción A3',
              projectTitle: a.title,
              status: act.status,
              date: actionDate,
            });

            if (isDone) {
              collab.totalCompleted++;
              collab.a3Count.completed++;
            } else {
              collab.totalPending++;
              collab.a3Count.pending++;
            }

            const weekSlotAssigned = collab.weeklyHistory.find((w) => w.weekKey === createdWeek.key);
            if (weekSlotAssigned) weekSlotAssigned.assigned++;

            if (isDone && closedWeek) {
              const weekSlotCompleted = collab.weeklyHistory.find((w) => w.weekKey === closedWeek.key);
              if (weekSlotCompleted) weekSlotCompleted.completed++;
            }
          });
        }
      });

      // 4. Process VSM Projects
      (vsmRes.data || []).forEach((v: any) => {
        if (!v.responsible) return;
        const prof = resolveNameAndProfile(v.responsible);
        if (!prof) return;

        const collab = getOrInitCollaborator(prof.name, prof.email, prof.role, prof.id);
        collab.rawTasks.vsm.push({
          id: v.id,
          name: v.name,
          status: v.status,
          date: v.created_at,
        });
      });

      // 5. Process 5S Audits
      (auditsRes.data || []).forEach((au: any) => {
        if (!au.auditor) return;
        const prof = resolveNameAndProfile(au.auditor);
        if (!prof) return;

        const auditDate = au.audit_date || au.created_at;
        const auditWeek = getISOWeekInfo(auditDate);
        const score = Number(au.total_score) || 0;
        const normalizedScore = score <= 5 && score > 0 ? Math.round((score / 5) * 100) : Math.round(score);

        const item: TaskItem = {
          id: au.id,
          type: 'AUDIT',
          title: au.title || `Auditoría 5S en ${au.area || 'Planta'}`,
          area: au.area || 'Planta',
          status: 'completed',
          rawStatus: 'Realizada',
          createdAt: auditDate,
          closeDate: auditDate,
          link: `/auditorias-5s`,
          extra: `Puntaje: ${normalizedScore}%`,
          createdWeekKey: auditWeek.key,
          closedWeekKey: auditWeek.key,
        };

        const collab = getOrInitCollaborator(prof.name, prof.email, prof.role, prof.id);
        collab.tasks.push(item);
        collab.auditsCount++;
        collab.totalAssigned++;
        collab.totalCompleted++;

        const weekSlot = collab.weeklyHistory.find((w) => w.weekKey === auditWeek.key);
        if (weekSlot) {
          weekSlot.assigned++;
          weekSlot.completed++;
        }
      });

      // Efficiency, Trends and Rates
      const list: CollaboratorPerformance[] = Array.from(map.values()).map((c) => {
        c.weeklyHistory.forEach((w) => {
          w.efficiency = w.assigned > 0 ? Math.min(100, Math.round((w.completed / w.assigned) * 100)) : w.completed > 0 ? 100 : 0;
        });

        const thisWeek = c.weeklyHistory.find((w) => w.weekKey === currentWeekInfo.key);
        const prevWeek = c.weeklyHistory.find((w) => w.weekKey === prevWeekInfo.key);

        c.thisWeekCompleted = thisWeek?.completed || 0;
        c.thisWeekAssigned = thisWeek?.assigned || 0;
        c.prevWeekCompleted = prevWeek?.completed || 0;
        c.trendVsLastWeek = c.thisWeekCompleted - c.prevWeekCompleted;

        c.complianceRate =
          c.totalAssigned > 0 ? Math.round((c.totalCompleted / c.totalAssigned) * 100) : 0;

        return c;
      });

      // Filter out generic admin accounts if they have zero tasks
      const cleanList = list.filter((c) => {
        const lower = c.name.toLowerCase();
        if ((lower === 'admin' || lower === 'administrador') && c.totalAssigned === 0) {
          return false;
        }
        return true;
      });

      setCollaborators(cleanList);
    } catch (err) {
      console.error('Error loading responsables:', err);
      toast.error('Error al cargar métricas de responsables');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected collaborator object
  const selectedCollaborator = useMemo(() => {
    if (!selectedCollaboratorName) return null;
    return collaborators.find((c) => c.name === selectedCollaboratorName) || null;
  }, [collaborators, selectedCollaboratorName]);

  // Team aggregated weekly performance
  const teamWeeklyData = useMemo(() => {
    const weeks = getLastNWeeks(8);
    return weeks.map((w) => {
      let assignedSum = 0;
      let completedSum = 0;

      collaborators.forEach((c) => {
        const slot = c.weeklyHistory.find((wh) => wh.weekKey === w.key);
        if (slot) {
          assignedSum += slot.assigned;
          completedSum += slot.completed;
        }
      });

      const efficiency = assignedSum > 0 ? Math.round((completedSum / assignedSum) * 100) : completedSum > 0 ? 100 : 0;

      return {
        label: w.label,
        weekKey: w.key,
        Asignadas: assignedSum,
        Resueltas: completedSum,
        Efectividad: efficiency,
      };
    });
  }, [collaborators]);

  // General KPIs across the team
  const teamKPIs = useMemo(() => {
    const totalMembers = collaborators.length;
    const totalAssigned = collaborators.reduce((acc, c) => acc + c.totalAssigned, 0);
    const totalCompleted = collaborators.reduce((acc, c) => acc + c.totalCompleted, 0);
    const totalPending = collaborators.reduce((acc, c) => acc + c.totalPending, 0);

    const complianceRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    // MVP: Member with highest completed count
    const mvp = collaborators.length > 0 ? [...collaborators].sort((a, b) => b.totalCompleted - a.totalCompleted)[0] : null;

    // Busiest: Member with highest pending workload (quien debe más tareas)
    const busiest =
      collaborators.length > 0 ? [...collaborators].sort((a, b) => b.totalPending - a.totalPending)[0] : null;

    // Team weekly velocity
    const currentWeekInfo = getISOWeekInfo(new Date());
    const prevWeekInfo = getISOWeekInfo(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const thisWeekCompleted = teamWeeklyData.find((w) => w.weekKey === currentWeekInfo.key)?.Resueltas || 0;
    const prevWeekCompleted = teamWeeklyData.find((w) => w.weekKey === prevWeekInfo.key)?.Resueltas || 0;
    const weeklyDelta = thisWeekCompleted - prevWeekCompleted;

    return {
      totalMembers,
      totalAssigned,
      totalCompleted,
      totalPending,
      complianceRate,
      mvp,
      busiest,
      thisWeekCompleted,
      weeklyDelta,
    };
  }, [collaborators, teamWeeklyData]);

  // Filtered and Sorted collaborators list
  const filteredCollaborators = useMemo(() => {
    let result = collaborators.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (onlyPending && c.totalPending === 0) return false;
      return true;
    });

    // Apply Sorting requested by user!
    result.sort((a, b) => {
      if (sortBy === 'pending_desc') {
        // Quienes deben más tareas primero
        return b.totalPending - a.totalPending || b.totalAssigned - a.totalAssigned;
      }
      if (sortBy === 'completed_desc') {
        // Mayor resolución
        return b.totalCompleted - a.totalCompleted;
      }
      if (sortBy === 'compliance_asc') {
        // Menor cumplimiento (más atrasados porcentualmente)
        return a.complianceRate - b.complianceRate || b.totalPending - a.totalPending;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [collaborators, searchQuery, onlyPending, sortBy]);

  // Filtered tasks for the selected collaborator
  const selectedTasksFiltered = useMemo(() => {
    if (!selectedCollaborator) return [];

    return selectedCollaborator.tasks.filter((t) => {
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) {
        return false;
      }
      return true;
    });
  }, [selectedCollaborator, taskStatusFilter]);

  // Trigger Send Email via Supabase Edge Function (like in nexus_lean!)
  const handleExecuteSendEmail = async () => {
    if (!emailModal.collab) return;
    const targetEmail = emailModal.email.trim();
    if (!targetEmail) {
      toast.error('Por favor especifica un correo electrónico válido');
      return;
    }

    setEmailModal((prev) => ({ ...prev, isSending: true }));
    try {
      const payload = {
        to: targetEmail,
        recipientName: emailModal.collab.name,
        tasks: {
          fiveS: emailModal.collab.rawTasks.fiveS || [],
          quickWins: emailModal.collab.rawTasks.quickWins || [],
          vsm: emailModal.collab.rawTasks.vsm || [],
          a3: emailModal.collab.rawTasks.a3 || [],
          a3Actions: emailModal.collab.rawTasks.a3Actions || [],
          totalCompleted: emailModal.collab.totalCompleted,
        },
      };

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: payload,
      });

      if (error) throw error;

      if (data?.simulated) {
        toast('Modo simulado: El correo se generó en el servidor (falta configurar RESEND_API_KEY)', {
          icon: 'ℹ️',
          duration: 4000,
        });
      } else if (data?.error) {
        toast.error(`Error del servidor: ${data.error}`);
      } else {
        toast.success(`¡Informe de recordatorio enviado exitosamente a ${targetEmail}!`);
      }

      setEmailModal({ isOpen: false, collab: null, email: '', isSending: false });
    } catch (err: any) {
      console.error('Error invoking send-email edge function:', err);
      toast.error(`Error al enviar correo: ${err.message || 'Error de conexión'}`);
    } finally {
      setEmailModal((prev) => ({ ...prev, isSending: false }));
    }
  };

  // Open Email Modal
  const handleOpenEmailModal = (collab: CollaboratorPerformance) => {
    setEmailModal({
      isOpen: true,
      collab,
      email: collab.email || '',
      isSending: false,
    });
  };

  // Quick Action: Copy reminder summary to clipboard
  const handleCopySummary = (collab: CollaboratorPerformance) => {
    const pendingTasks = collab.tasks.filter((t) => t.status !== 'completed');
    const summaryText = [
      `📋 *Nexus Lean - Recordatorio de Compromisos Operacionales*`,
      `👤 Colaborador: *${collab.name}*`,
      `📊 Tareas Pendientes: *${collab.totalPending}* | Completadas: *${collab.totalCompleted}* (${collab.complianceRate}%)`,
      ``,
      `*Compromisos Activos por Cerrar:*`,
      ...pendingTasks.slice(0, 10).map((t, i) => `${i + 1}. [${t.type}] ${t.title} (${t.area || 'Planta'})`),
      pendingTasks.length > 10 ? `... y ${pendingTasks.length - 10} compromisos adicionales.` : '',
      ``,
      `Por favor ingresa a tu estación Nexus Lean para reportar avances y cerrar tus tareas.`,
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      toast.success(`¡Resumen de ${collab.name} copiado al portapapeles! Listo para enviar por WhatsApp o Teams.`);
    } else {
      toast.success(`Resumen generado para ${collab.name}.`);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* High-Contrast Light Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="text-cyan-600" size={28} />
            <span>Gestión de Responsables & Rendimiento</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Seguimiento semana a semana de la carga de trabajo, velocidad de resolución y efectividad operacional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCollaborator && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedCollaboratorName(null)}
              leftIcon={<ArrowLeft size={14} />}
            >
              Ver Todo el Equipo
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            isLoading={loading}
            leftIcon={<RefreshCw size={14} />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Top Executive KPI Grid (Light High-Contrast Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MVP Card */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Mayor Resolución (MVP)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 truncate">
              {teamKPIs.mvp ? teamKPIs.mvp.name : 'Sin datos'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-emerald-700 font-bold">
                {teamKPIs.mvp?.totalCompleted || 0} resueltas
              </span>
              <span>•</span>
              <span>{teamKPIs.mvp?.complianceRate || 0}% cumplimiento</span>
            </p>
          </div>
        </div>

        {/* Global Compliance */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Efectividad Global
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              {teamKPIs.complianceRate}%
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              <strong className="text-slate-800">{teamKPIs.totalCompleted}</strong> de{' '}
              {teamKPIs.totalAssigned} tareas cerradas
            </p>
          </div>
        </div>

        {/* Highest Workload (Quien debe más) */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Mayor Carga Pendiente
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 truncate">
              {teamKPIs.busiest ? teamKPIs.busiest.name : 'Sin datos'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              <span className="text-rose-700 font-bold">
                {teamKPIs.busiest?.totalPending || 0} tareas activas
              </span>{' '}
              requieren apoyo
            </p>
          </div>
        </div>

        {/* Weekly Velocity */}
        <div className="p-5 rounded-2xl bg-white border border-cyan-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
              Ritmo Semanal
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {teamKPIs.thisWeekCompleted}
              </span>
              <span className="text-xs text-slate-500 font-medium">resueltas esta sem.</span>
            </div>
            <p className="text-xs mt-1 flex items-center gap-1 font-bold">
              {teamKPIs.weeklyDelta >= 0 ? (
                <span className="text-emerald-700 flex items-center gap-0.5">
                  +{teamKPIs.weeklyDelta} vs sem. previa ▲
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-0.5">
                  {teamKPIs.weeklyDelta} vs sem. previa ▼
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW 1: SELECTED COLLABORATOR DRILL-DOWN */}
      {selectedCollaborator ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Collaborator Profile Header Card (Light Theme) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
                {selectedCollaborator.avatarLetter}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCollaborator.name}</h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      selectedCollaborator.complianceRate >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedCollaborator.complianceRate >= 60
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {selectedCollaborator.complianceRate}% Cumplimiento
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 font-medium">
                  <span>{selectedCollaborator.email || 'Correo no registrado'}</span>
                  <span>•</span>
                  <span>{selectedCollaborator.role}</span>
                  <span>•</span>
                  <span className="text-cyan-700 font-bold">{selectedCollaborator.totalAssigned} tareas asignadas</span>
                  <span>•</span>
                  <span className="text-rose-600 font-bold">{selectedCollaborator.totalPending} pendientes por cerrar</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopySummary(selectedCollaborator)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
                title="Copiar resumen para WhatsApp o Teams"
              >
                <Copy size={14} />
                <span>Copiar Resumen</span>
              </button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenEmailModal(selectedCollaborator)}
                leftIcon={<Mail size={15} />}
              >
                Enviar Correo de Recordatorio
              </Button>
            </div>
          </div>

          {/* Collaborator Specific Weekly Chart + Module Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Weekly Evolution Chart for Collaborator (Light Theme) */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="text-cyan-600" size={18} />
                    <span>Evolución Semana a Semana ({selectedCollaborator.name})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial de tareas asignadas vs tareas resueltas por semana ISO
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg font-bold">
                  Últimas 8 semanas
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={selectedCollaborator.weeklyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="assigned" name="Tareas Asignadas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Tareas Resueltas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="efficiency" name="% Efectividad" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4 Modules Mini Stats (Light Theme) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3 content-start">
              <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <ClipboardList size={13} className="text-amber-600" /> Tarjetas 5S
                  </span>
                  <span className="font-bold text-slate-900">{selectedCollaborator.fiveSCount.total}</span>
                </div>
                <div className="text-xl font-black text-rose-600">
                  {selectedCollaborator.fiveSCount.pending} <span className="text-xs font-normal text-slate-500">pendientes</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  ✓ {selectedCollaborator.fiveSCount.completed} resueltas
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-cyan-200/80 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="text-cyan-600" /> Quick Wins
                  </span>
                  <span className="font-bold text-slate-900">{selectedCollaborator.quickWinsCount.total}</span>
                </div>
                <div className="text-xl font-black text-cyan-600">
                  {selectedCollaborator.quickWinsCount.pending} <span className="text-xs font-normal text-slate-500">pendientes</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  ✓ {selectedCollaborator.quickWinsCount.completed} listos
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-indigo-200/80 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Target size={13} className="text-indigo-600" /> Proyectos A3
                  </span>
                  <span className="font-bold text-slate-900">{selectedCollaborator.a3Count.total}</span>
                </div>
                <div className="text-xl font-black text-indigo-600">
                  {selectedCollaborator.a3Count.pending} <span className="text-xs font-normal text-slate-500">pendientes</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  ✓ {selectedCollaborator.a3Count.completed} terminados
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" /> Auditorías
                  </span>
                  <span className="font-bold text-slate-900">{selectedCollaborator.auditsCount}</span>
                </div>
                <div className="text-xl font-black text-emerald-600">
                  {selectedCollaborator.auditsCount} <span className="text-xs font-normal text-slate-500">realizadas</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Como auditor líder</div>
              </div>
            </div>
          </div>

          {/* Interactive Task List for Collaborator (Light Theme) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Detalle de Compromisos Operacionales</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedTasksFiltered.length} tareas encontradas para este filtro
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({selectedCollaborator.tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('pending')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskStatusFilter === 'pending'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Pendientes ({selectedCollaborator.totalPending})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('in_progress')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskStatusFilter === 'in_progress'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
                  }`}
                >
                  En Proceso ({selectedCollaborator.totalInProgress})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskStatusFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskStatusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Completadas ({selectedCollaborator.totalCompleted})
                </button>
              </div>
            </div>

            {/* Task rows */}
            {selectedTasksFiltered.length > 0 ? (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedTasksFiltered.map((task, idx) => {
                  const typeBadgeClass =
                    task.type === '5S'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : task.type === 'QW'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : task.type === 'AUDIT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                  const statusBadgeClass =
                    task.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800';

                  const dateStr = task.createdAt ? new Date(task.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : 'S/F';

                  return (
                    <div
                      key={`${task.id}_${idx}`}
                      onClick={() => navigate(task.link)}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-500 hover:bg-white cursor-pointer transition-all flex items-center justify-between gap-4 group shadow-sm hover:shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${typeBadgeClass}`}>
                          {task.type === '5S' ? '5S' : task.type === 'QW' ? 'QW' : task.type === 'AUDIT' ? 'Auditoría' : 'A3'}
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-cyan-700 transition-colors truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-medium">
                            {task.area && <span>Área: {task.area}</span>}
                            {task.extra && <span>• {task.extra}</span>}
                            <span>• Sem. {getISOWeekInfo(task.createdAt).week} ({dateStr})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}>
                          {task.status === 'completed' ? 'Cerrada' : task.status === 'in_progress' ? 'En Proceso' : 'Pendiente'}
                        </span>
                        <ChevronRight size={15} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                No hay tareas que coincidan con el filtro seleccionado.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: TEAM OVERVIEW & WEEKLY PROGRESS */
        <div className="space-y-6">
          {/* Team Weekly Velocity Chart Card (Light Theme) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="text-cyan-600" size={18} />
                  <span>Rendimiento y Velocidad Semanal del Equipo</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Balance semana a semana de nuevas tareas creadas vs tareas resueltas en planta
                </p>
              </div>

              {/* Chart Metric Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTeamChartMetric('tasks')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    teamChartMetric === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Volumen (Asignadas vs Resueltas)
                </button>
                <button
                  type="button"
                  onClick={() => setTeamChartMetric('efficiency')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    teamChartMetric === 'efficiency' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  % Efectividad Semanal
                </button>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {teamChartMetric === 'tasks' ? (
                  <BarChart data={teamWeeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Asignadas" name="Nuevas Asignadas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Resueltas" name="Tareas Resueltas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <ComposedChart data={teamWeeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Resueltas" name="Resueltas (Cant.)" fill="#10b981" opacity={0.3} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Efectividad" name="% Cumplimiento Semanal" stroke="#06b6d4" strokeWidth={3} dot={{ r: 5, fill: '#06b6d4' }} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Search, Sorting & Filters Toolbar (Light Theme) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Equipo de Colaboradores</span>
                <span className="text-xs text-cyan-800 bg-cyan-50 border border-cyan-200 font-bold px-2 py-0.5 rounded-full font-mono">
                  {filteredCollaborators.length} de {collaborators.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Haz clic en cualquier tarjeta para ver su ficha individual y enviar recordatorio
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar colaborador..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              {/* Sort Selector requested by User! */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <ArrowUpDown size={13} className="text-cyan-600" />
                <span className="text-slate-500 font-medium">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="pending_desc">🚨 Quienes deben más tareas (Mayor Carga)</option>
                  <option value="completed_desc">🏆 Mayor Resolución (Más Resueltas)</option>
                  <option value="compliance_asc">📉 Menor Cumplimiento (% más bajo)</option>
                  <option value="name_asc">🔤 Nombre (A - Z)</option>
                </select>
              </div>

              {/* Only Pending Toggle */}
              <button
                type="button"
                onClick={() => setOnlyPending(!onlyPending)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  onlyPending
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Filter size={13} />
                <span>Solo con Pendientes</span>
              </button>
            </div>
          </div>

          {/* Collaborators Grid (Light Cards, High Contrast) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : filteredCollaborators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollaborators.map((person) => {
                const statusBadgeClass =
                  person.totalPending === 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : person.totalPending > 4
                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                const progressWidth = `${person.complianceRate}%`;

                return (
                  <div
                    key={person.name}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Header: Avatar + Name + Workload Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => setSelectedCollaboratorName(person.name)}
                        >
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            {person.avatarLetter}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors truncate">
                              {person.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {person.email || person.role}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border shrink-0 ${statusBadgeClass}`}
                        >
                          {person.totalPending === 0 ? '✓ Al día' : `${person.totalPending} deben`}
                        </span>
                      </div>

                      {/* Compliance Progress Bar */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Cumplimiento Global</span>
                          <span className="text-slate-900">{person.complianceRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              person.complianceRate >= 80
                                ? 'bg-emerald-500'
                                : person.complianceRate >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: progressWidth }}
                          />
                        </div>
                      </div>

                      {/* Module breakdown count */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-bold">5S</span>
                          <span className="text-xs font-extrabold text-amber-700">
                            {person.fiveSCount.total}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-bold">QW</span>
                          <span className="text-xs font-extrabold text-cyan-700">
                            {person.quickWinsCount.total}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-bold">A3</span>
                          <span className="text-xs font-extrabold text-indigo-700">
                            {person.a3Count.total}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-bold">Auditor</span>
                          <span className="text-xs font-extrabold text-emerald-700">
                            {person.auditsCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Quick Actions + Details */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Clock size={12} className="text-cyan-600" />
                        <span>Esta sem: <strong className="text-slate-800">+{person.thisWeekCompleted}</strong> resueltas</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEmailModal(person)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          title="Enviar correo de recordatorio"
                        >
                          <Mail size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCollaboratorName(person.name)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 font-bold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <span>Detalle</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <Users size={32} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800">No se encontraron colaboradores</h3>
              <p className="text-xs text-slate-500">
                Asegúrate de que haya usuarios registrados o tareas asignadas en la empresa seleccionada.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Email Reminder Modal */}
      {emailModal.isOpen && emailModal.collab && (
        <Modal
          isOpen={emailModal.isOpen}
          onClose={() => setEmailModal({ isOpen: false, collab: null, email: '', isSending: false })}
          title={`Enviar Recordatorio de Tareas: ${emailModal.collab.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 font-sans text-slate-800">
            <p className="text-xs text-slate-600">
              Se enviará un correo corporativo formal a través de Nexus Lean con el informe detallado de todos los compromisos pendientes de este colaborador.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Colaborador:</span>
                <span className="font-bold text-slate-900">{emailModal.collab.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Tareas Pendientes:</span>
                <span className="font-bold text-rose-600">{emailModal.collab.totalPending} activas</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Tareas Completadas:</span>
                <span className="font-bold text-emerald-600">{emailModal.collab.totalCompleted} resueltas</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Correo Electrónico del Destinatario:
              </label>
              <input
                type="email"
                value={emailModal.email}
                onChange={(e) => setEmailModal((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="ej: nombre.apellido@empresa.cl"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-cyan-500 font-medium"
              />
              <p className="text-[11px] text-slate-400">
                Puedes cambiar el correo de destino antes de enviar si es necesario.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  handleCopySummary(emailModal.collab!);
                  setEmailModal({ isOpen: false, collab: null, email: '', isSending: false });
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Copy size={14} />
                <span>Copiar para WhatsApp</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEmailModal({ isOpen: false, collab: null, email: '', isSending: false })}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteSendEmail}
                  isLoading={emailModal.isSending}
                  leftIcon={<Send size={14} />}
                >
                  Enviar Correo Ahora
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ResponsablesPage;
