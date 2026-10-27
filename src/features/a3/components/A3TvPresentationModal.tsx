import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tv,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Filter,
  Layers,
  Search,
  Sparkles,
  ChevronDown,
  Layout,
  ListTodo,
  ShieldCheck,
  Check,
  Plus,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { A3Project, A3ActionPlanItem, A3PlanGroup, A3Subtask } from '../../../types';
import A3BoardView from './A3BoardView';
import { ImageLightbox } from '../../../components/common/ImageLightbox';

interface A3TvPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  a3: A3Project;
  onUpdate: (field: string, value: any) => void;
  users?: { name: string; email?: string }[];
}

const ZOOM_STEPS = [90, 100, 115, 125, 140, 155, 175, 200];

export const A3TvPresentationModal: React.FC<A3TvPresentationModalProps> = ({
  isOpen,
  onClose,
  a3,
  onUpdate,
  users = [],
}) => {
  // Persisted Zoom Level (default 125% for TV readability)
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_a3_tv_zoom');
      return saved ? Number(saved) : 125;
    } catch {
      return 125;
    }
  });

  const [viewMode, setViewMode] = useState<'tasks' | 'sheet'>('tasks');
  const [activePlanId, setActivePlanId] = useState<string>('all');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'delayed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync zoom changes to localStorage
  const handleSetZoom = (newZoom: number) => {
    const clamped = Math.max(80, Math.min(220, newZoom));
    setZoomLevel(clamped);
    try {
      localStorage.setItem('nexus_a3_tv_zoom', clamped.toString());
    } catch {
      // ignore
    }
  };

  const handleZoomIn = () => {
    const next = ZOOM_STEPS.find((s) => s > zoomLevel);
    handleSetZoom(next || zoomLevel + 15);
  };

  const handleZoomOut = () => {
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < zoomLevel);
    handleSetZoom(prev || zoomLevel - 15);
  };

  const handleResetZoom = () => {
    handleSetZoom(125);
  };

  // Toggle true browser fullscreen
  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut: Esc to exit, +/- for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lightboxImage) {
        onClose();
      } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
        e.preventDefault();
        handleZoomOut();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, zoomLevel]);

  // Plan groups from A3 meta
  const planGroups: A3PlanGroup[] = useMemo(() => {
    const raw = a3.actionPlansMeta || a3.action_plans_meta;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [{ id: 'main', name: 'Plan Principal (5W2H)', isDefault: true }];
  }, [a3.actionPlansMeta, a3.action_plans_meta]);

  // All actions normalized
  const actions: A3ActionPlanItem[] = useMemo(() => {
    const list = (a3.actionPlan || a3.action_plan || []) as A3ActionPlanItem[];
    return list.map((a) => ({
      ...a,
      id: a.id || Date.now() + Math.random(),
      planId: a.planId || 'main',
      what: a.what || a.activity || '',
      who: a.who || a.responsible || '',
      when: a.when || a.date || '',
      status: a.status || 'pending',
      subtasks: a.subtasks || [],
      images: a.image_urls || a.images || [],
    }));
  }, [a3.actionPlan, a3.action_plan]);

  // Unique responsibles for quick filter chips
  const responsiblesList = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      const name = (a.who || a.responsible || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [actions]);

  // Filter actions for TV view
  const filteredActions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return actions.filter((a) => {
      if (activePlanId !== 'all' && a.planId !== activePlanId) {
        return false;
      }
      if (selectedResponsible !== 'all' && a.who !== selectedResponsible) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'delayed') {
          if (a.status === 'completed') return false;
          if (a.when && /^\d{4}-\d{2}-\d{2}$/.test(a.when) && a.when < todayStr) return true;
          return a.status === 'delayed';
        }
        if (a.status !== statusFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchWhat = (a.what || '').toLowerCase().includes(q);
        const matchWho = (a.who || '').toLowerCase().includes(q);
        const matchWhen = (a.when || '').toLowerCase().includes(q);
        if (!matchWhat && !matchWho && !matchWhen) return false;
      }
      return true;
    });
  }, [actions, activePlanId, selectedResponsible, statusFilter, searchQuery]);

  // Executive summary counts
  const counts = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const total = actions.length;
    let completed = 0;
    let delayed = 0;
    let inProgress = 0;

    actions.forEach((a) => {
      if (a.status === 'completed') {
        completed++;
      } else {
        if (a.status === 'in_progress') inProgress++;
        if (a.when && /^\d{4}-\d{2}-\d{2}$/.test(a.when) && a.when < todayStr) {
          delayed++;
        } else if (a.status === 'delayed') {
          delayed++;
        }
      }
    });

    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, delayed, inProgress, progressPct };
  }, [actions]);

  // Handler to toggle action status directly on the TV
  const handleToggleStatus = (actionId: string | number, currentStatus: string) => {
    let nextStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    if (currentStatus === 'pending') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'pending';

    const updated = actions.map((a) => {
      if (a.id === actionId) {
        return {
          ...a,
          status: nextStatus,
          progress: nextStatus === 'completed' ? 100 : nextStatus === 'in_progress' ? 50 : 0,
        };
      }
      return a;
    });

    onUpdate('action_plan', updated);
    if (nextStatus === 'completed') {
      toast.success('¡Tarea completada!', { icon: '🎉' });
    }
  };

  // Toggle subtask completion
  const handleToggleSubtask = (actionId: string | number, subtaskId: string | number) => {
    const updated = actions.map((a) => {
      if (a.id === actionId) {
        const nextSubs = (a.subtasks || []).map((s) =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        const compCount = nextSubs.filter((s) => s.completed).length;
        const progress = nextSubs.length > 0 ? Math.round((compCount / nextSubs.length) * 100) : a.progress;
        const isAllDone = compCount === nextSubs.length && nextSubs.length > 0;
        return {
          ...a,
          subtasks: nextSubs,
          progress,
          status: isAllDone ? ('completed' as const) : a.status,
        };
      }
      return a;
    });
    onUpdate('action_plan', updated);
  };

  // Helper date badge for TV
  const renderDateBadge = (whenStr: string | undefined | null, status: string | undefined | null) => {
    if (!whenStr) {
      return (
        <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
          Por definir
        </span>
      );
    }

    if (status === 'completed') {
      return (
        <span className="px-3 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 font-bold text-xs border border-emerald-600/50 flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>{whenStr}</span>
        </span>
      );
    }

    const lower = whenStr.toLowerCase();
    if (lower.includes('permanente') || lower.includes('continuo')) {
      return (
        <span className="px-3 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 font-bold text-xs border border-indigo-600/50 flex items-center gap-1.5 shadow-sm">
          <span>♾️ Permanente</span>
        </span>
      );
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(whenStr)) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const target = new Date(`${whenStr}T00:00:00`);
      const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <span className="px-3 py-1 rounded-xl bg-rose-950/90 text-rose-200 font-extrabold text-xs border border-rose-500/80 flex items-center gap-1.5 shadow-md animate-pulse">
            <AlertTriangle size={13} className="text-rose-400" />
            <span>Atrasada ({Math.abs(diffDays)}d) • {whenStr}</span>
          </span>
        );
      }
      if (diffDays === 0) {
        return (
          <span className="px-3 py-1 rounded-xl bg-amber-950/90 text-amber-200 font-extrabold text-xs border border-amber-500/80 flex items-center gap-1.5 shadow-sm">
            <Clock size={13} className="text-amber-400" />
            <span>Vence hoy • {whenStr}</span>
          </span>
        );
      }
      if (diffDays <= 3) {
        return (
          <span className="px-3 py-1 rounded-xl bg-amber-900/50 text-amber-300 font-bold text-xs border border-amber-600/50 flex items-center gap-1.5 shadow-sm">
            <Clock size={13} className="text-amber-400" />
            <span>En {diffDays} días • {whenStr}</span>
          </span>
        );
      }
      return (
        <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5">
          <Calendar size={13} className="text-cyan-400" />
          <span>{whenStr}</span>
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs border border-slate-700">
        {whenStr}
      </span>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none"
    >
      {/* 1. TOP FLOATING HUD / CONTROL BAR */}
      <header className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0 z-20">
        {/* Left: Project Brand & Info */}
        <div className="flex items-center gap-3 min-w-[280px]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Tv size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Modo Sala / Proyección TV
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  a3.status === 'Completado'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {a3.status || 'En Proceso'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate max-w-md">
              {a3.title || 'Proyecto A3'}
            </h1>
          </div>
        </div>

        {/* Center: View Mode Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('tasks')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'tasks'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListTodo size={15} />
            <span>Tablero de Tareas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {actions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'sheet'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layout size={15} />
            <span>Lámina A3 Completa</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Fullscreen Exit */}
        <div className="flex items-center gap-2">
          {/* Zoom Controller */}
          <div className="flex items-center bg-slate-800/90 rounded-2xl border border-slate-700 px-1 py-1 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Reducir escala (Ctrl -)"
            >
              <ZoomOut size={15} />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2.5 py-1 text-xs font-black text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Clic para reiniciar zoom a 125%"
            >
              {zoomLevel}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Aumentar escala (Ctrl +)"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Toggle Fullscreen button */}
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa de navegador'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Exit Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            title="Salir del Modo TV (Esc)"
          >
            <X size={16} />
            <span className="hidden sm:inline">Salir (Esc)</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR FOR TASKS VIEW: Plans & Live Filters */}
      {viewMode === 'tasks' && (
        <div className="px-6 py-2.5 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-10">
          {/* Plan Groups Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setActivePlanId('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activePlanId === 'all'
                  ? 'bg-slate-100 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers size={13} />
              <span>Todos los Planes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
                {actions.length}
              </span>
            </button>

            {planGroups.map((group) => {
              const count = actions.filter((a) => a.planId === group.id).length;
              const isActive = activePlanId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActivePlanId(group.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{group.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Responsible Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <User size={12} className="text-cyan-400" />
              <span>Responsable:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedResponsible('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedResponsible === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todos
            </button>

            {responsiblesList.slice(0, 6).map((resp) => {
              const count = actions.filter((a) => a.who === resp).length;
              const isSelected = selectedResponsible === resp;
              return (
                <button
                  key={resp}
                  type="button"
                  onClick={() => setSelectedResponsible(isSelected ? 'all' : resp)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 truncate max-w-[140px] ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={resp}
                >
                  <span className="truncate">{resp}</span>
                  <span className="text-[10px] opacity-70 font-semibold">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Indicators */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Avance:</span>
              <span className="text-xs font-black text-cyan-400">{counts.progressPct}%</span>
              <span className="text-[11px] text-slate-400">({counts.completed}/{counts.total})</span>
            </div>

            {counts.delayed > 0 && (
              <div className="flex items-center gap-1 bg-rose-950/80 text-rose-300 px-2.5 py-1 rounded-xl border border-rose-800/60 font-bold text-xs">
                <AlertCircle size={13} className="text-rose-400" />
                <span>{counts.delayed} atrasadas</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN SCALED BODY */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
        style={{
          zoom: zoomLevel / 100,
        }}
      >
        {viewMode === 'tasks' ? (
          /* ============================================================== */
          /* VISTA A: TABLERO GIGANTE DE TAREAS PARA LA REUNIÓN */
          /* ============================================================== */
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Header / Subtitle */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                  <ListTodo className="text-cyan-400" size={26} />
                  <span>
                    {activePlanId === 'all'
                      ? 'Compromisos y Planes de Acción'
                      : planGroups.find((g) => g.id === activePlanId)?.name || 'Plan de Acción'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mostrando {filteredActions.length} de {actions.length} tareas. Haz clic en el estado para actualizarlo en vivo durante la reunión.
                </p>
              </div>

              {/* Status quick toggle bar */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({actions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('delayed')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'delayed'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <span>Atrasadas</span>
                  {counts.delayed > 0 && <span className="text-[10px]">({counts.delayed})</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Completadas ({counts.completed})
                </button>
              </div>
            </div>

            {/* List of Tasks in Big Cards */}
            {filteredActions.length === 0 ? (
              <div className="bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-800 p-12 text-center space-y-2">
                <ListTodo size={42} className="text-slate-600 mx-auto" />
                <p className="text-base font-bold text-slate-400">No hay tareas que coincidan con los filtros</p>
                <button
                  type="button"
                  onClick={() => {
                    setActivePlanId('all');
                    setSelectedResponsible('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-cyan-400 hover:underline"
                >
                  Restablecer todos los filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActions.map((act, idx) => {
                  const isDone = act.status === 'completed';
                  const isInProgress = act.status === 'in_progress';

                  return (
                    <div
                      key={act.id || idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-slate-900/40 border-emerald-900/40 opacity-75'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Status Toggle & Task Title */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Big Status Clicker */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(act.id, act.status)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-sm ${
                              isDone
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                                : isInProgress
                                ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-cyan-400'
                            }`}
                            title={`Estado actual: ${act.status}. Clic para cambiar.`}
                          >
                            {isDone ? (
                              <Check size={20} strokeWidth={3} />
                            ) : isInProgress ? (
                              <Clock size={18} strokeWidth={2.5} />
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-slate-600" />
                            )}
                          </button>

                          {/* Task Text & Details */}
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-base sm:text-lg font-extrabold leading-snug tracking-tight ${
                                isDone ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {act.what || act.activity}
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                              {/* Responsible Badge */}
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 font-bold shadow-xs">
                                <User size={13} className="text-cyan-400" />
                                <span>{act.who || act.responsible || 'Sin responsable'}</span>
                              </span>

                              {/* Deadline / Plazo Badge */}
                              {renderDateBadge(act.when || act.date, act.status)}

                              {/* Notes / Agreements if present */}
                              {act.notes && (
                                <span className="text-[11px] text-slate-400 italic">
                                  {act.notes}
                                </span>
                              )}

                              {/* Plan Group tag if showing all */}
                              {activePlanId === 'all' && act.planName && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                  📁 {act.planName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Progress & Evidence Photos */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto pl-12 sm:pl-0">
                          {/* Evidence Photos Button */}
                          {(() => {
                            const photos = act.images || [];
                            if (photos.length === 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setLightboxImage(photos[0])}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                                title={`Ver ${photos.length} fotos de evidencia`}
                              >
                                <Camera size={14} className="text-brand-400" />
                                <span>{photos.length} foto{photos.length > 1 ? 's' : ''}</span>
                              </button>
                            );
                          })()}

                          {/* Status Pill Badge */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(act.id, act.status)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isInProgress
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                            }`}
                          >
                            {isDone ? 'Completada' : isInProgress ? 'En Proceso' : 'Pendiente'}
                          </button>
                        </div>
                      </div>

                      {/* Subtasks Accordion if any */}
                      {act.subtasks && act.subtasks.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-800/80 pl-12">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                            <span>Subtareas del compromiso ({act.subtasks.filter((s) => s.completed).length} de {act.subtasks.length}):</span>
                            <span>{act.progress || 0}%</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {act.subtasks.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleToggleSubtask(act.id, st.id)}
                                className={`p-2 rounded-xl text-left text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                                  st.completed
                                    ? 'bg-slate-900/60 border-emerald-900/40 text-slate-400 line-through'
                                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                    st.completed ? 'bg-emerald-500 text-slate-950 font-black' : 'border border-slate-600'
                                  }`}
                                >
                                  {st.completed && <Check size={11} strokeWidth={3} />}
                                </span>
                                <span className="truncate">{st.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* VISTA B: LÁMINA A3 COMPLETA PROYECTADA (TOYOTA REPORT) */
          /* ============================================================== */
          <div className="max-w-7xl mx-auto bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <A3BoardView
              a3={a3}
              onUpdate={onUpdate}
              users={users}
            />
          </div>
        )}
      </div>

      {/* Lightbox para ampliar pruebas de trabajo realizado */}
      <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>,
    document.body
  );
};

export default A3TvPresentationModal;
