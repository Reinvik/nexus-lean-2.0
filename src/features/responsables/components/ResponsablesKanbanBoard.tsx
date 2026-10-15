import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  Search,
  ExternalLink,
  GripVertical,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  UserCheck,
  Filter,
  Eye,
  Camera,
} from 'lucide-react';
import type { TaskItem, CollaboratorPerformance } from '../ResponsablesPage';

interface ResponsablesKanbanBoardProps {
  tasks: TaskItem[];
  collaborators?: CollaboratorPerformance[];
  selectedCollaboratorFilter?: string;
  onSelectCollaboratorFilter?: (name: string) => void;
  currentUserName?: string;
  onUpdateTaskStatus: (task: TaskItem, newStatus: 'pending' | 'in_progress' | 'completed') => Promise<void>;
  onToggleSubtask?: (task: TaskItem, subtaskId: string | number) => Promise<void>;
  onOpenTask: (task: TaskItem) => void;
  onNavigateToTask?: (link: string) => void;
  isCompact?: boolean;
}

type KanbanColumnId = 'pending' | 'in_progress' | 'completed';

interface ColumnConfig {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
  headerBg: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  dropHighlight: string;
  icon: React.ReactNode;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    title: 'Por Hacer',
    subtitle: 'Pendientes de iniciar',
    headerBg: 'bg-rose-50/90',
    headerBorder: 'border-rose-200',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
    dropHighlight: 'ring-2 ring-rose-400 bg-rose-50/40',
    icon: <Clock size={16} className="text-rose-600" />,
  },
  {
    id: 'in_progress',
    title: 'En Proceso',
    subtitle: 'En ejecución activa (WIP)',
    headerBg: 'bg-cyan-50/90',
    headerBorder: 'border-cyan-200',
    badgeBg: 'bg-cyan-600',
    badgeText: 'text-white',
    dropHighlight: 'ring-2 ring-cyan-400 bg-cyan-50/40',
    icon: <PlayCircle size={16} className="text-cyan-600" />,
  },
  {
    id: 'completed',
    title: 'Realizado',
    subtitle: 'Cerradas y verificadas',
    headerBg: 'bg-emerald-50/90',
    headerBorder: 'border-emerald-200',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    dropHighlight: 'ring-2 ring-emerald-400 bg-emerald-50/40',
    icon: <CheckCircle2 size={16} className="text-emerald-600" />,
  },
];

export const ResponsablesKanbanBoard: React.FC<ResponsablesKanbanBoardProps> = ({
  tasks,
  collaborators = [],
  selectedCollaboratorFilter = 'all',
  onSelectCollaboratorFilter,
  currentUserName,
  onUpdateTaskStatus,
  onToggleSubtask,
  onOpenTask,
  onNavigateToTask,
  isCompact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | '5S' | 'QW' | 'A3_ACTION' | 'A3' | 'AUDIT'>('ALL');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Record<string, boolean>>({});
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

  // Filter tasks by collaborator, module type, and search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        !isCompact &&
        selectedCollaboratorFilter &&
        selectedCollaboratorFilter !== 'all' &&
        task.collaboratorName !== selectedCollaboratorFilter
      ) {
        return false;
      }

      if (typeFilter !== 'ALL' && task.type !== typeFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchArea = task.area?.toLowerCase().includes(q);
        const matchExtra = task.extra?.toLowerCase().includes(q);
        const matchCollab = task.collaboratorName?.toLowerCase().includes(q);
        if (!matchTitle && !matchArea && !matchExtra && !matchCollab) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, isCompact, selectedCollaboratorFilter, typeFilter, searchTerm]);

  // Group tasks by column status
  const columnsData = useMemo(() => {
    const grouped: Record<KanbanColumnId, TaskItem[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    filteredTasks.forEach((t) => {
      const col: KanbanColumnId =
        t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : 'pending';
      grouped[col].push(t);
    });
    return grouped;
  }, [filteredTasks]);

  // Module counts for filter pills
  const moduleCounts = useMemo(() => {
    const base = tasks.filter((t) =>
      !isCompact && selectedCollaboratorFilter && selectedCollaboratorFilter !== 'all'
        ? t.collaboratorName === selectedCollaboratorFilter
        : true
    );
    return {
      ALL: base.length,
      '5S': base.filter((t) => t.type === '5S').length,
      QW: base.filter((t) => t.type === 'QW').length,
      A3_ACTION: base.filter((t) => t.type === 'A3_ACTION').length,
      A3: base.filter((t) => t.type === 'A3').length,
      AUDIT: base.filter((t) => t.type === 'AUDIT').length,
    };
  }, [tasks, isCompact, selectedCollaboratorFilter]);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, task: TaskItem) => {
    if (task.type === 'AUDIT') return; // Audits are read-only records
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: KanbanColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetCol || task.type === 'AUDIT') return;

    await triggerStatusChange(task, targetCol);
  };

  const triggerStatusChange = async (task: TaskItem, newStatus: KanbanColumnId) => {
    setUpdatingTaskIds((prev) => ({ ...prev, [task.id]: true }));
    try {
      await onUpdateTaskStatus(task, newStatus);
    } finally {
      setUpdatingTaskIds((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const toggleSubtaskAccordion = (taskId: string) => {
    setExpandedSubtasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getTypeStyle = (type: TaskItem['type']) => {
    switch (type) {
      case '5S':
        return {
          label: 'Tarjeta 5S',
          classes: 'bg-amber-50 text-amber-800 border-amber-300',
          accentBorder: 'border-l-amber-500',
        };
      case 'QW':
        return {
          label: 'Quick Win',
          classes: 'bg-cyan-50 text-cyan-800 border-cyan-300',
          accentBorder: 'border-l-cyan-500',
        };
      case 'A3_ACTION':
        return {
          label: 'Plan 5W2H (A3)',
          classes: 'bg-violet-50 text-violet-800 border-violet-300',
          accentBorder: 'border-l-violet-600',
        };
      case 'A3':
        return {
          label: 'Líder A3',
          classes: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          accentBorder: 'border-l-indigo-600',
        };
      case 'AUDIT':
        return {
          label: 'Auditoría 5S',
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          accentBorder: 'border-l-emerald-500',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Collaborator Selector Bar (Only in Global Kanban View) */}
      {!isCompact && collaborators.length > 0 && onSelectCollaboratorFilter && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-cyan-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Filtrar Tablero por Responsable:
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Arrastra las tarjetas entre columnas o usa los botones rápidos para actualizar su estado en vivo
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {/* All Team Button */}
            <button
              type="button"
              onClick={() => onSelectCollaboratorFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                selectedCollaboratorFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users size={14} />
              <span>Todo el Equipo</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  selectedCollaboratorFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tasks.length}
              </span>
            </button>

            {/* Quick "My Tasks" button if logged in user matches a collaborator */}
            {currentUserName &&
              collaborators.some((c) => c.name.toLowerCase() === currentUserName.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => {
                    const match = collaborators.find(
                      (c) => c.name.toLowerCase() === currentUserName.toLowerCase()
                    );
                    if (match) onSelectCollaboratorFilter(match.name);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                    selectedCollaboratorFilter.toLowerCase() === currentUserName.toLowerCase()
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-transparent shadow-sm'
                      : 'bg-cyan-50/70 text-cyan-800 border-cyan-200 hover:bg-cyan-100'
                  }`}
                >
                  <UserCheck size={14} />
                  <span>Mis Tareas</span>
                </button>
              )}

            {/* Individual Collaborator Pills */}
            {collaborators.map((collab) => {
              const isSelected = selectedCollaboratorFilter === collab.name;
              const activeCount = collab.totalPending + collab.totalInProgress;
              return (
                <button
                  key={collab.name}
                  type="button"
                  onClick={() => onSelectCollaboratorFilter(collab.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center ${
                      isSelected ? 'bg-white text-cyan-700' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {collab.avatarLetter}
                  </span>
                  <span className="truncate max-w-[140px]">{collab.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : activeCount > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {activeCount > 0 ? `${activeCount} act.` : '✓'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Module Type Filters & Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Module Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <Filter size={14} className="text-slate-400 mr-1 shrink-0" />
          {(
            [
              { id: 'ALL', label: 'Todas', count: moduleCounts.ALL },
              { id: 'A3_ACTION', label: 'Planes 5W2H (A3)', count: moduleCounts.A3_ACTION },
              { id: '5S', label: 'Tarjetas 5S', count: moduleCounts['5S'] },
              { id: 'QW', label: 'Quick Wins', count: moduleCounts.QW },
              { id: 'A3', label: 'Líder A3', count: moduleCounts.A3 },
              { id: 'AUDIT', label: 'Auditorías', count: moduleCounts.AUDIT },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                typeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  typeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tarea, proyecto A3, área..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 font-semibold"
          />
        </div>
      </div>

      {/* 3. Three-Column Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = columnsData[col.id];
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl bg-slate-100/80 border border-slate-200/90 flex flex-col transition-all min-h-[520px] ${
                isOver ? col.dropHighlight : ''
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-4 rounded-t-2xl border-b ${col.headerBg} ${col.headerBorder} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white shadow-xs border border-slate-200/60">
                    {col.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{col.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">{col.subtitle}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black shadow-xs ${col.badgeBg} ${col.badgeText}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="p-3 space-y-3 flex-1 max-h-[680px] overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-44 rounded-xl border-2 border-dashed border-slate-300/80 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <Layers size={22} className="mb-1.5 opacity-60" />
                    <p className="text-xs font-bold text-slate-500">Sin tareas en "{col.title}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Arrastra una tarjeta aquí para cambiar su estado
                    </p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const style = getTypeStyle(task.type);
                    const isUpdating = !!updatingTaskIds[task.id];
                    const subtasks = task.subtasks || [];
                    const completedSubtasks = subtasks.filter((s) => s.completed).length;
                    const isSubtasksOpen = !!expandedSubtasks[task.id];
                    const isOverdue =
                      task.deadline &&
                      task.status !== 'completed' &&
                      new Date(task.deadline).getTime() < Date.now() - 86400000;

                    const displayDate = task.deadline || task.createdAt;
                    const formattedDate = displayDate
                      ? new Date(displayDate).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : '';

                    return (
                      <div
                        key={task.id}
                        draggable={task.type !== 'AUDIT' && !isUpdating}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => onOpenTask(task)}
                        className={`group rounded-xl bg-white border border-slate-200/95 border-l-4 ${style.accentBorder} p-3.5 shadow-xs hover:shadow-md hover:border-cyan-300 transition-all space-y-2.5 cursor-pointer ${
                          task.type !== 'AUDIT' ? 'active:cursor-grabbing' : ''
                        } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        {/* Top Row: Badge + Date + Open Card Modal */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {task.type !== 'AUDIT' && (
                              <GripVertical
                                size={13}
                                className="text-slate-300 group-hover:text-slate-500 shrink-0 -ml-1"
                              />
                            )}
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wide ${style.classes}`}
                            >
                              {style.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const evidenceCount = (
                                task.rawTask?.image_urls ||
                                task.rawTask?.images ||
                                (task.rawTask?.image_url ? [task.rawTask.image_url] : [])
                              ).filter(Boolean).length;
                              if (evidenceCount === 0) return null;
                              return (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0"
                                  title={`${evidenceCount} foto(s) de prueba de trabajo adjunta(s)`}
                                >
                                  <Camera size={10} className="text-amber-600" />
                                  <span>{evidenceCount}</span>
                                </span>
                              );
                            })()}

                            {formattedDate && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isOverdue
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                                title={task.deadline ? `Fecha límite: ${task.deadline}` : 'Fecha creación'}
                              >
                                <Calendar size={10} />
                                <span>{formattedDate}</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenTask(task);
                              }}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-cyan-700 bg-cyan-50/80 hover:bg-cyan-600 hover:text-white border border-cyan-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Abrir tarjeta completa sin salir del módulo de Responsables"
                            >
                              <Eye size={11} />
                              <span>Abrir</span>
                            </button>
                          </div>
                        </div>

                        {/* Task Title */}
                        <h5 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-cyan-700 transition-colors leading-snug">
                          {task.title}
                        </h5>

                        {/* Context Info: Project / Area */}
                        {(task.extra || task.area) && (
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 font-medium">
                            {task.extra && (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-full font-semibold">
                                {task.extra}
                              </span>
                            )}
                            {task.area && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin size={11} className="text-slate-400" />
                                <span>{task.area}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Subtasks & Progress Bar for 5W2H Actions */}
                        {task.type === 'A3_ACTION' && (
                          <div className="pt-1 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (subtasks.length > 0) toggleSubtaskAccordion(task.id);
                                }}
                                className={`flex items-center gap-1 font-bold ${
                                  subtasks.length > 0
                                    ? 'text-indigo-700 hover:text-indigo-900 cursor-pointer'
                                    : 'text-slate-500'
                                }`}
                              >
                                {subtasks.length > 0 &&
                                  (isSubtasksOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                                <CheckSquare size={12} />
                                <span>
                                  {subtasks.length > 0
                                    ? `Subtareas (${completedSubtasks}/${subtasks.length})`
                                    : 'Avance de la acción'}
                                </span>
                              </button>
                              <span className="font-extrabold text-slate-800">
                                {typeof task.progress === 'number'
                                  ? `${task.progress}%`
                                  : task.status === 'completed'
                                  ? '100%'
                                  : task.status === 'in_progress'
                                  ? '50%'
                                  : '0%'}
                              </span>
                            </div>

                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : task.status === 'in_progress'
                                    ? 'bg-cyan-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{
                                  width: `${
                                    typeof task.progress === 'number'
                                      ? task.progress
                                      : task.status === 'completed'
                                      ? 100
                                      : task.status === 'in_progress'
                                      ? 50
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>

                            {/* Collapsible Subtasks Checklist right inside Kanban card */}
                            {isSubtasksOpen && subtasks.length > 0 && (
                              <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                {subtasks.map((sub) => (
                                  <label
                                    key={sub.id}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-start gap-2 text-[11px] cursor-pointer hover:bg-white p-1 rounded transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sub.completed}
                                      onChange={() => onToggleSubtask && onToggleSubtask(task, sub.id)}
                                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span
                                      className={`leading-tight ${
                                        sub.completed
                                          ? 'line-through text-slate-400 font-normal'
                                          : 'text-slate-800 font-semibold'
                                      }`}
                                    >
                                      {sub.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Collaborator Badge + Quick Status Move Buttons */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          {/* Collaborator info */}
                          {task.collaboratorName ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                {task.collaboratorName.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 truncate">
                                {task.collaboratorName}
                              </span>
                            </div>
                          ) : (
                            <span />
                          )}

                          {/* Quick Transition Buttons */}
                          {task.type !== 'AUDIT' && (
                            <div className="flex items-center gap-1 shrink-0">
                              {task.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerStatusChange(task, 'in_progress');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-600 text-cyan-700 hover:text-white border border-cyan-200 text-[10px] font-extrabold transition-colors flex items-center gap-1"
                                    title="Mover a En Proceso"
                                  >
                                    <span>Iniciar</span>
                                    <ArrowRight size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerStatusChange(task, 'completed');
                                    }}
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-colors"
                                    title="Marcar como Realizado"
                                  >
                                    <Check size={12} />
                                  </button>
                                </>
                              )}

                              {task.status === 'in_progress' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerStatusChange(task, 'pending');
                                    }}
                                    className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors"
                                    title="Devolver a Por Hacer"
                                  >
                                    <ArrowLeft size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerStatusChange(task, 'completed');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold transition-colors flex items-center gap-1 shadow-xs"
                                    title="Mover a Realizado"
                                  >
                                    <Check size={11} />
                                    <span>Realizado</span>
                                  </button>
                                </>
                              )}

                              {task.status === 'completed' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerStatusChange(task, 'in_progress');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 border border-slate-200 text-[10px] font-bold transition-colors flex items-center gap-1"
                                  title="Reabrir y mover a En Proceso"
                                >
                                  <RotateCcw size={10} />
                                  <span>Reabrir</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResponsablesKanbanBoard;
