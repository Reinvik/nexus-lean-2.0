import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Layers,
  Edit2,
  CheckSquare,
  ListFilter,
  DollarSign,
  MapPin,
  HelpCircle,
  ArrowRight,
  Sparkles,
  FolderPlus,
  MoreVertical,
  Check,
  X,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import type { A3ActionPlanItem, A3Subtask, A3PlanGroup } from '../../../types';
import A3ActionModal from './A3ActionModal';

interface A3ActionPlan5W2HProps {
  actions?: A3ActionPlanItem[];
  onChange: (actions: A3ActionPlanItem[]) => void;
  users?: { name: string; email?: string }[];
  countermeasures?: string[];
  plansMeta?: A3PlanGroup[];
  onUpdatePlansMeta?: (groups: A3PlanGroup[]) => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onShareEmail?: () => void;
}

const DEFAULT_PLANS: A3PlanGroup[] = [
  { id: 'main', name: 'Plan Principal (5W2H)', description: 'Plan de acción para erradicar la causa raíz', isDefault: true, color: 'brand' },
  { id: 'containment', name: 'Plan de Contención', description: 'Acciones inmediatas provisionales de contención', isDefault: false, color: 'amber' },
  { id: 'standardization', name: 'Plan de Estandarización', description: 'Auditorías, actualización de POE y entrenamiento', isDefault: false, color: 'indigo' },
];

export const A3ActionPlan5W2H: React.FC<A3ActionPlan5W2HProps> = ({
  actions = [],
  onChange,
  users = [],
  countermeasures = [],
  plansMeta,
  onUpdatePlansMeta,
  isSaving = false,
  lastSavedAt = null,
  onShareEmail,
}) => {
  // Plan groups state
  const planGroups = useMemo<A3PlanGroup[]>(() => {
    let base: A3PlanGroup[];
    if (Array.isArray(plansMeta)) {
      // Respect user's saved/customized plans even if only 1 plan exists (e.g. user deleted containment/standardization)
      base = plansMeta.length > 0 ? [...plansMeta] : [DEFAULT_PLANS[0]];
    } else {
      // Only uninitialized projects start with default plans
      base = [...DEFAULT_PLANS];
    }

    // Auto-discover and ensure any plan with existing actions is never hidden
    const existingIds = new Set(base.map((p) => p.id));
    (actions || []).forEach((act) => {
      const pid = act.planId;
      if (pid && pid !== 'all' && !existingIds.has(pid)) {
        existingIds.add(pid);
        const discoveredName =
          act.planName ||
          (pid.toLowerCase().includes('5s') ? 'Plan 5S' : `Plan ${pid.replace('plan-', '')}`);
        base.push({
          id: pid,
          name: discoveredName,
          description: `Plan de acción ${discoveredName}`,
          color: 'indigo',
        });
      }
    });

    return base;
  }, [plansMeta, actions]);

  const [activePlanId, setActivePlanId] = useState<string>('all'); // 'all' or plan.id
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'delayed'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');

  // Accordion state for subtasks { [actionId]: boolean }
  const [openSubtaskRows, setOpenSubtaskRows] = useState<Record<string | number, boolean>>({});

  // Quick subtask input state { [actionId]: string }
  const [quickSubtaskInputs, setQuickSubtaskInputs] = useState<Record<string | number, string>>({});

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<A3ActionPlanItem | null>(null);

  // New Plan Creation Modal
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  // Normalize legacy action items if any
  const normalizedActions = useMemo<A3ActionPlanItem[]>(() => {
    return (actions || []).map((a) => ({
      ...a,
      id: a.id || Date.now() + Math.random(),
      planId: a.planId || 'main',
      what: a.what || a.activity || '',
      who: a.who || a.responsible || '',
      when: a.when || a.date || '',
      status: a.status || 'pending',
      subtasks: a.subtasks || [],
      progress:
        a.progress !== undefined
          ? a.progress
          : a.subtasks && a.subtasks.length > 0
          ? Math.round(
              (a.subtasks.filter((s) => s.completed).length / a.subtasks.length) * 100
            )
          : a.status === 'completed'
          ? 100
          : 0,
    }));
  }, [actions]);

  // Filter actions based on active plan, search, status, and responsible
  const filteredActions = useMemo(() => {
    return normalizedActions.filter((a) => {
      // Plan filter
      if (activePlanId !== 'all' && a.planId !== activePlanId) {
        return false;
      }
      // Status filter
      const isDelayed =
        a.when &&
        new Date(a.when).getTime() < new Date().setHours(0, 0, 0, 0) &&
        a.status !== 'completed';

      if (statusFilter === 'delayed') {
        if (!isDelayed) return false;
      } else if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false;
      }

      // Responsible filter
      if (responsibleFilter !== 'all' && a.who !== responsibleFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          a.what?.toLowerCase().includes(query) ||
          a.why?.toLowerCase().includes(query) ||
          a.who?.toLowerCase().includes(query) ||
          a.where?.toLowerCase().includes(query) ||
          a.how?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [normalizedActions, activePlanId, statusFilter, responsibleFilter, searchQuery]);

  // Overall Plan Metrics
  const metrics = useMemo(() => {
    const targetActions =
      activePlanId === 'all'
        ? normalizedActions
        : normalizedActions.filter((a) => a.planId === activePlanId);

    const total = targetActions.length;
    const completed = targetActions.filter((a) => a.status === 'completed').length;
    const inProgress = targetActions.filter((a) => a.status === 'in_progress').length;
    const pending = targetActions.filter((a) => a.status === 'pending').length;
    const delayed = targetActions.filter((a) => {
      return (
        a.when &&
        new Date(a.when).getTime() < new Date().setHours(0, 0, 0, 0) &&
        a.status !== 'completed'
      );
    }).length;

    // Subtasks summary
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    targetActions.forEach((a) => {
      if (a.subtasks && a.subtasks.length > 0) {
        totalSubtasks += a.subtasks.length;
        completedSubtasks += a.subtasks.filter((s) => s.completed).length;
      }
    });

    const progressPercentage =
      total > 0
        ? Math.round(
            targetActions.reduce((acc, a) => acc + (a.progress || 0), 0) / total
          )
        : 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      delayed,
      totalSubtasks,
      completedSubtasks,
      progressPercentage,
    };
  }, [normalizedActions, activePlanId]);

  // Toggle subtasks accordion
  const toggleSubtasks = (actionId: string | number) => {
    setOpenSubtaskRows((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  // Add subtask directly from accordion
  const handleQuickAddSubtask = (actionId: string | number) => {
    const title = (quickSubtaskInputs[actionId] || '').trim();
    if (!title) return;

    const updated = normalizedActions.map((a) => {
      if (a.id === actionId) {
        const nextSubs: A3Subtask[] = [
          ...(a.subtasks || []),
          {
            id: Date.now() + Math.random(),
            title,
            completed: false,
          },
        ];
        const completedCount = nextSubs.filter((s) => s.completed).length;
        const progress = Math.round((completedCount / nextSubs.length) * 100);
        return {
          ...a,
          subtasks: nextSubs,
          progress,
          status: progress === 100 ? ('completed' as const) : a.status === 'pending' ? ('in_progress' as const) : a.status,
        };
      }
      return a;
    });

    onChange(updated);
    setQuickSubtaskInputs((prev) => ({ ...prev, [actionId]: '' }));
  };

  // Toggle subtask completion
  const handleToggleSubtask = (actionId: string | number, subId: string | number) => {
    const updated = normalizedActions.map((a) => {
      if (a.id === actionId) {
        const nextSubs = (a.subtasks || []).map((s) =>
          s.id === subId ? { ...s, completed: !s.completed } : s
        );
        const completedCount = nextSubs.filter((s) => s.completed).length;
        const progress = Math.round((completedCount / nextSubs.length) * 100);
        const newStatus =
          progress === 100
            ? ('completed' as const)
            : progress > 0 && a.status === 'pending'
            ? ('in_progress' as const)
            : a.status;

        return {
          ...a,
          subtasks: nextSubs,
          progress,
          status: newStatus,
        };
      }
      return a;
    });

    onChange(updated);
  };

  // Delete subtask
  const handleDeleteSubtask = (actionId: string | number, subId: string | number) => {
    const updated = normalizedActions.map((a) => {
      if (a.id === actionId) {
        const nextSubs = (a.subtasks || []).filter((s) => s.id !== subId);
        const completedCount = nextSubs.filter((s) => s.completed).length;
        const progress =
          nextSubs.length > 0 ? Math.round((completedCount / nextSubs.length) * 100) : a.progress;
        return {
          ...a,
          subtasks: nextSubs,
          progress,
        };
      }
      return a;
    });

    onChange(updated);
  };

  // Change action status
  const handleChangeStatus = (
    actionId: string | number,
    newStatus: 'pending' | 'in_progress' | 'completed' | 'delayed'
  ) => {
    const updated = normalizedActions.map((a) => {
      if (a.id === actionId) {
        return {
          ...a,
          status: newStatus,
          progress:
            newStatus === 'completed'
              ? 100
              : a.progress === 100
              ? 50
              : a.progress,
        };
      }
      return a;
    });

    onChange(updated);
  };

  // Delete action
  const handleDeleteAction = (actionId: string | number) => {
    if (!window.confirm('¿Eliminar esta acción del plan?')) return;
    onChange(normalizedActions.filter((a) => a.id !== actionId));
  };

  // Save from modal
  const handleSaveModal = (item: A3ActionPlanItem) => {
    const exists = normalizedActions.some((a) => a.id === item.id);
    let next: A3ActionPlanItem[];
    if (exists) {
      next = normalizedActions.map((a) => (a.id === item.id ? item : a));
    } else {
      next = [...normalizedActions, item];
    }
    onChange(next);
  };

  // Create new plan group
  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    const newGroup: A3PlanGroup = {
      id: `plan-${Date.now()}`,
      name: newPlanName.trim(),
      description: newPlanDesc.trim() || undefined,
      color: 'indigo',
    };

    const nextGroups = [...planGroups, newGroup];
    if (onUpdatePlansMeta) {
      onUpdatePlansMeta(nextGroups);
    }
    setActivePlanId(newGroup.id);
    setIsNewPlanModalOpen(false);
    setNewPlanName('');
    setNewPlanDesc('');
  };

  // Delete a plan group
  const handleDeletePlanGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (planGroups.length <= 1) {
      alert('Debe existir al menos un plan de acción.');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar este plan de acción y mover sus tareas al Plan Principal?')) {
      return;
    }

    const nextGroups = planGroups.filter((g) => g.id !== groupId);
    const nextActions = normalizedActions.map((a) =>
      a.planId === groupId ? { ...a, planId: 'main' } : a
    );

    if (onUpdatePlansMeta) {
      onUpdatePlansMeta(nextGroups);
    }
    onChange(nextActions);
    setActivePlanId('main');
  };

  // Calculate days remaining helper
  const getDaysRemainingBadge = (dateStr?: string, status?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (status === 'completed') {
      return (
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          Completada
        </span>
      );
    }

    if (diffDays < 0) {
      return (
        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
          {Math.abs(diffDays)}d atrasada
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
          Vence hoy
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
          {diffDays}d restantes
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
        {diffDays}d
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Multiple Plans Tabs & Manager */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Plan Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActivePlanId('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activePlanId === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>Todos los Planes</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activePlanId === 'all' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {normalizedActions.length}
              </span>
            </button>

            {planGroups.map((plan) => {
              const count = normalizedActions.filter((a) => a.planId === plan.id).length;
              const isActive = activePlanId === plan.id;

              return (
                <div key={plan.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setActivePlanId(plan.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{plan.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                    {!plan.isDefault && (
                      <span
                        onClick={(e) => handleDeletePlanGroup(plan.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-300 ml-1 p-0.5 transition-opacity"
                        title="Eliminar este plan"
                      >
                        <X size={12} />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* + Add New Plan Button */}
            <button
              type="button"
              onClick={() => setIsNewPlanModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl border border-dashed border-brand-300 transition-colors"
            >
              <FolderPlus size={14} />
              <span>+ Nuevo Plan</span>
            </button>
          </div>

          {/* Action Trigger & Auto-save Status */}
          <div className="flex items-center gap-2 shrink-0">
            {isSaving ? (
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Guardando plan...
              </span>
            ) : lastSavedAt ? (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Guardado autom. ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Autoguardado activo
              </span>
            )}
            {onShareEmail && (
              <button
                type="button"
                onClick={onShareEmail}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
                title="Compartir tareas pendientes por correo"
              >
                <Mail size={15} />
                <span>Compartir Pendientes</span>
                {metrics.total - metrics.completed > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-indigo-600 text-white rounded-full font-black">
                    {metrics.total - metrics.completed}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingAction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <Plus size={16} />
              <span>+ Nueva Acción 5W2H</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Avance del Plan
            </span>
            <span className="text-xs font-black text-cyan-300">
              {metrics.progressPercentage}%
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-700/70 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.progressPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {metrics.completedSubtasks} de {metrics.totalSubtasks} subtareas hechas
            </p>
          </div>
        </div>

        {/* Total Actions */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Acciones
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-800">{metrics.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">5W2H</span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={12} /> Completadas
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{metrics.completed}</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
            <Clock size={12} /> En Proceso
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-600">{metrics.inProgress}</span>
            <span className="text-[10px] text-slate-400 font-medium">activas</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Circle size={12} /> Pendientes
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-700">{metrics.pending}</span>
            <span className="text-[10px] text-slate-400 font-medium">por iniciar</span>
          </div>
        </div>

        {/* Delayed */}
        <div
          className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            metrics.delayed > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              metrics.delayed > 0 ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            <AlertCircle size={12} /> Atrasadas
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-black ${
                metrics.delayed > 0 ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {metrics.delayed}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">fuera de plazo</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Qué, Quién, Dónde o Cómo..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'pending' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'in_progress' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              En Proceso
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Completadas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delayed')}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'delayed' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Atrasadas
            </button>
          </div>

          {/* Responsible selector filter */}
          {users.length > 0 && (
            <select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">👤 Todos los Responsables</option>
              {users.map((u, i) => (
                <option key={i} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. The 5W2H Action Plan Table & Accordion Subtasks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredActions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <CheckSquare size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No hay acciones en este plan de acción
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Comienza creando una acción estructurada con la metodología 5W2H y añade subtareas para un seguimiento detallado.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingAction(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-brand-700 hover:to-indigo-700 transition-all"
            >
              + Crear Primera Acción 5W2H
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActions.map((action, idx) => {
              const isSubtasksOpen = Boolean(openSubtaskRows[action.id]);
              const subtasks = action.subtasks || [];
              const completedCount = subtasks.filter((s) => s.completed).length;
              const hasSubtasks = subtasks.length > 0;
              const currentPlan = planGroups.find((g) => g.id === action.planId);

              return (
                <div
                  key={action.id}
                  className={`transition-colors ${
                    action.status === 'completed'
                      ? 'bg-slate-50/40 hover:bg-slate-50'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Action Main Card / Row */}
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: What + Badges + Subtasks trigger */}
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Number badge */}
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Plan tag if in 'all' view */}
                        {activePlanId === 'all' && currentPlan && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {currentPlan.name}
                          </span>
                        )}

                        {/* Status badge */}
                        <select
                          value={action.status}
                          onChange={(e) =>
                            handleChangeStatus(action.id, e.target.value as any)
                          }
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer outline-none ${
                            action.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : action.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : action.status === 'delayed'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="pending">⏳ Pendiente</option>
                          <option value="in_progress">⚡ En Proceso</option>
                          <option value="completed">✅ Completada</option>
                          <option value="delayed">⚠️ Atrasada</option>
                        </select>

                        {/* Deadline badge */}
                        {getDaysRemainingBadge(action.when, action.status)}

                        {/* Countermeasure tag */}
                        {action.countermeasure && (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[180px]">
                            🛡️ {action.countermeasure}
                          </span>
                        )}
                      </div>

                      {/* 1. WHAT Title */}
                      <h4
                        className={`text-sm font-bold text-slate-800 leading-snug ${
                          action.status === 'completed' ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {action.what}
                      </h4>

                      {/* 2. WHY description */}
                      {action.why && (
                        <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
                          <span className="text-slate-400 font-bold">Por qué:</span> {action.why}
                        </p>
                      )}

                      {/* Subtasks Accordion Toggle button */}
                      <button
                        type="button"
                        onClick={() => toggleSubtasks(action.id)}
                        className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        {isSubtasksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>Subtareas Operativas</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            completedCount === subtasks.length && hasSubtasks
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {completedCount}/{subtasks.length}
                        </span>
                      </button>
                    </div>

                    {/* Middle: 5W2H Info Pills (Who, When, Where, How, How Much) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs shrink-0 lg:max-w-xl">
                      {/* WHO */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Quién (Who)
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {action.who ? action.who.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-semibold text-slate-700 truncate max-w-[90px]">
                            {action.who || 'Sin asignar'}
                          </span>
                        </div>
                      </div>

                      {/* WHEN */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Cuándo (When)
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-slate-700 font-semibold">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{action.when || 'Sin fecha'}</span>
                        </div>
                      </div>

                      {/* WHERE */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Dónde (Where)
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-slate-700 font-semibold">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[80px]">
                            {action.where || 'Planta'}
                          </span>
                        </div>
                      </div>

                      {/* HOW MUCH */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          Cuánto (Cost)
                        </span>
                        <div className="flex items-center gap-1 mt-0.5 text-slate-700 font-semibold">
                          <DollarSign size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[80px]">
                            {action.howMuch || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress bar & Control buttons */}
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      {/* Action Progress Bar */}
                      <div className="w-24 text-right">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-400">Progreso</span>
                          <span
                            className={
                              (action.progress || 0) === 100
                                ? 'text-emerald-600'
                                : 'text-brand-600'
                            }
                          >
                            {action.progress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (action.progress || 0) === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${action.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAction(action);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Editar acción 5W2H"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAction(action.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Eliminar acción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Content: Subtasks (Subtareas) Management */}
                  {isSubtasksOpen && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <CheckSquare size={14} className="text-brand-600" />
                            <span>Subtareas del Plan ({subtasks.length})</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Marca cada subtarea para avanzar automáticamente el porcentaje de la acción
                          </span>
                        </div>

                        {/* Inline input to quickly add subtask */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Escribe el nombre de la subtarea y presiona Enter..."
                            value={quickSubtaskInputs[action.id] || ''}
                            onChange={(e) =>
                              setQuickSubtaskInputs((prev) => ({
                                ...prev,
                                [action.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddSubtask(action.id);
                              }
                            }}
                            className="flex-1 px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAddSubtask(action.id)}
                            disabled={!quickSubtaskInputs[action.id]?.trim()}
                            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm transition-colors"
                          >
                            <Plus size={14} />
                            <span>Añadir Subtarea</span>
                          </button>
                        </div>

                        {/* Subtasks items */}
                        {subtasks.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">
                            No hay subtareas. Añade pasos específicos para que tu equipo ejecute la acción.
                          </p>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {subtasks.map((sub, sIdx) => (
                              <div
                                key={sub.id}
                                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs transition-colors ${
                                  sub.completed
                                    ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50/50 shadow-xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={() => handleToggleSubtask(action.id, sub.id)}
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer shrink-0"
                                  />
                                  <span
                                    className={`truncate ${
                                      sub.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-900 font-bold'
                                    }`}
                                  >
                                    {sIdx + 1}. {sub.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-600 shrink-0 font-medium">
                                  {sub.responsible && (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                                      👤 {sub.responsible}
                                    </span>
                                  )}
                                  {sub.dueDate && (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                                      📅 {sub.dueDate}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubtask(action.id, sub.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                    title="Eliminar subtarea"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 5W2H Action Creation / Edit Modal */}
      <A3ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        actionToEdit={editingAction}
        users={users}
        planGroups={planGroups}
        activePlanId={activePlanId === 'all' ? 'main' : activePlanId}
        countermeasures={countermeasures}
      />

      {/* 6. New Plan Group Modal */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold">Crear Nuevo Plan de Acción</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Plan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fase 2: Automatización de Envasado"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción o Alcance (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivo de este plan de acción..."
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newPlanName.trim()}
                  className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Crear Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default A3ActionPlan5W2H;
