import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HeaderWithFilter } from '../../components/common/HeaderWithFilter';
import {
  Plus,
  Search,
  X,
  Save,
  FileText,
  BarChart2,
  GitBranch,
  Target,
  Layout,
  Calendar,
  User,
  Trash2,
  Image as ImageIcon,
  Building,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Monitor,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ListTodo,
  ArrowLeft,
  Share2,
  Mail,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { A3Project, A3ActionPlanItem, A3PlanGroup, Profile, A3FollowUpConfig } from '../../types';

// Subcomponents
import A3Ishikawa from './components/A3Ishikawa';
import A3FiveWhys from './components/A3FiveWhys';
import A3Pareto from './components/A3Pareto';
import A3FollowUp from './components/A3FollowUp';
import A3CountermeasureManager from './components/A3CountermeasureManager';
import A3ActionPlan5W2H from './components/A3ActionPlan5W2H';
import A3BoardView from './components/A3BoardView';
import A3ShareModal from './components/A3ShareModal';
import RichTextEditor from '../../components/common/RichTextEditor';

export const A3Page: React.FC = () => {
  const { user, globalFilterCompanyId, companies } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Core State
  const [a3Projects, setA3Projects] = useState<A3Project[]>([]);
  const [selectedA3, setSelectedA3] = useState<A3Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Refs for auto-saving
  const selectedA3Ref = useRef<A3Project | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    selectedA3Ref.current = selectedA3;
  }, [selectedA3]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // View / Editor Navigation State
  const [activeTab, setActiveTab] = useState<'context' | 'analysis' | 'countermeasures' | 'plan' | 'followup'>('context');
  const [isBoardMode, setIsBoardMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);

  // Target Company ID
  const targetCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.isGlobalAdmin) {
      return globalFilterCompanyId && globalFilterCompanyId !== 'all'
        ? globalFilterCompanyId
        : null;
    }
    return user.company_id || user.companyId || null;
  }, [user, globalFilterCompanyId]);

  // Load profiles / users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        let q = supabase.from('profiles').select('id, full_name, email, company_id');
        if (targetCompanyId) {
          q = q.eq('company_id', targetCompanyId);
        }
        const { data, error } = await q;
        if (!error && data) {
          setProfiles(data as any);
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      }
    };
    fetchUsers();
  }, [targetCompanyId]);

  // Fetch Projects from Supabase
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('a3_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (targetCompanyId) {
        query = query.eq('company_id', targetCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const formatted: A3Project[] = data.map((p) => {
          let list = p.countermeasure_list || [];
          let text = p.countermeasures || '';
          if (typeof p.countermeasures === 'string' && p.countermeasures.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(p.countermeasures);
              if (parsed && typeof parsed === 'object') {
                list = Array.isArray(parsed.list) ? parsed.list : list;
                text = parsed.freeText !== undefined ? parsed.freeText : text;
              }
            } catch (e) {
              // Ignore
            }
          }

          return {
            id: p.id,
            company_id: p.company_id,
            companyId: p.company_id,
            title: p.title || 'Proyecto A3 sin título',
            status: p.status || 'Nuevo',
            responsible: p.responsible || '',
            date: p.date || new Date().toISOString().split('T')[0],
            background: p.background || '',
            backgroundImageUrl: p.background_image_url || null,
            background_image_url: p.background_image_url || null,
            currentCondition: p.current_condition || '',
            current_condition: p.current_condition || '',
            currentConditionImageUrl: p.current_condition_image_url || null,
            current_condition_image_url: p.current_condition_image_url || null,
            goal: p.goal || '',
            rootCause: p.root_cause || '',
            root_cause: p.root_cause || '',
            paretoData: p.pareto_data || [],
            pareto_data: p.pareto_data || [],
            countermeasures: text,
            countermeasureList: list,
            countermeasure_list: list,
            plan: p.execution_plan || '',
            execution_plan: p.execution_plan || '',
            followUp: p.follow_up_notes || '',
            follow_up_notes: p.follow_up_notes || '',
            ishikawas: p.ishikawas || [],
            multipleFiveWhys: p.five_whys || [],
            five_whys: p.five_whys || [],
            followUpData: Array.isArray(p.follow_up_data)
              ? p.follow_up_data
              : p.follow_up_data
              ? [p.follow_up_data]
              : [],
            follow_up_data: p.follow_up_data || [],
            actionPlan: p.action_plan || [],
            action_plan: p.action_plan || [],
            actionPlansMeta: p.action_plans_meta || null,
            action_plans_meta: p.action_plans_meta || null,
            created_at: p.created_at,
          };
        });

        setA3Projects(formatted);

        // Handle Deep Linking if any
        const params = new URLSearchParams(location.search);
        const projectId = params.get('projectId');
        if (projectId) {
          const match = formatted.find((p) => p.id === projectId);
          if (match) {
            setSelectedA3(match);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching A3 projects:', err);
      toast.error('Error al cargar proyectos A3: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [user, targetCompanyId, location.search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fullscreen Handlers
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (fullScreenContainerRef.current?.requestFullscreen) {
        fullScreenContainerRef.current.requestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // Filtered Projects for List View
  const filteredProjects = useMemo(() => {
    return a3Projects.filter((p) => {
      if (statusFilter !== 'Todos' && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(query) ||
          p.responsible?.toLowerCase().includes(query) ||
          p.background?.toLowerCase().includes(query) ||
          p.rootCause?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [a3Projects, statusFilter, searchTerm]);

  // KPI Metrics
  const projectMetrics = useMemo(() => {
    const total = a3Projects.length;
    const completed = a3Projects.filter((p) => p.status === 'Completado').length;
    const inProgress = a3Projects.filter(
      (p) => p.status === 'En Proceso' || p.status === 'En Revisión'
    ).length;
    const newCount = a3Projects.filter((p) => p.status === 'Nuevo').length;

    // Average 5W2H progress
    let totalProgressSum = 0;
    let projectsWithActions = 0;
    a3Projects.forEach((p) => {
      const actions = (p.actionPlan || p.action_plan || []) as A3ActionPlanItem[];
      if (actions.length > 0) {
        projectsWithActions++;
        const pAvg =
          actions.reduce(
            (acc, a) => acc + (a.progress || (a.status === 'completed' ? 100 : 0)),
            0
          ) / actions.length;
        totalProgressSum += pAvg;
      }
    });

    const avgProgress =
      projectsWithActions > 0 ? Math.round(totalProgressSum / projectsWithActions) : 0;

    return { total, completed, inProgress, newCount, avgProgress };
  }, [a3Projects]);

  // Helper to select project and clear pending auto-save timers
  const handleSelectProject = (project: A3Project | null) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setSelectedA3(project);
    selectedA3Ref.current = project;
    setLastSavedAt(null);
  };

  // Create New A3
  const handleNewA3 = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    const newProj: A3Project = {
      id: '',
      company_id: targetCompanyId || (user?.company_id ?? null),
      companyId: targetCompanyId || (user?.company_id ?? null),
      title: '',
      status: 'Nuevo',
      responsible: user ? user.name : '',
      date: new Date().toISOString().split('T')[0],
      background: '',
      backgroundImageUrl: '',
      currentCondition: '',
      currentConditionImageUrl: '',
      goal: '',
      rootCause: '',
      paretoData: [],
      countermeasures: '',
      countermeasureList: [],
      plan: '',
      followUp: '',
      ishikawas: [
        {
          problem: '',
          categories: {},
        },
      ],
      multipleFiveWhys: [],
      five_whys: [],
      followUpData: [],
      actionPlan: [],
    };
    setSelectedA3(newProj);
    selectedA3Ref.current = newProj;
    setLastSavedAt(null);
    setActiveTab('context');
    setIsBoardMode(false);
  };

  // Auto-Save Action Plan directly to Supabase immediately
  const handleActionPlanChange = async (acts: A3ActionPlanItem[]) => {
    const current = selectedA3Ref.current || selectedA3;
    if (!current) return;

    // 1. Immediately update React state for UI responsiveness
    const updatedA3: A3Project = {
      ...current,
      actionPlan: acts,
      action_plan: acts,
    };
    selectedA3Ref.current = updatedA3;
    setSelectedA3(updatedA3);

    if (current.id) {
      setA3Projects((prev) =>
        prev.map((p) => (p.id === current.id ? { ...p, actionPlan: acts, action_plan: acts } : p))
      );
    }

    // 2. Persist to Supabase
    setIsAutoSaving(true);
    try {
      if (current.id) {
        const { error } = await supabase
          .from('a3_projects')
          .update({
            action_plan: acts,
            action_plans_meta: current.actionPlansMeta || current.action_plans_meta || null,
          })
          .eq('id', current.id);

        if (error) throw error;
        setLastSavedAt(new Date());
        toast.success('Plan de acción guardado automáticamente', { id: 'a3-autosave' });
      } else {
        // New project: auto-create the project record so the action plan is safely stored!
        const resolvedCompanyId =
          current.company_id || current.companyId || targetCompanyId || user?.company_id || null;

        const titleToSave = current.title?.trim() || 'Nuevo Proyecto A3';

        let serializedCountermeasures = current.countermeasures || '';
        if (Array.isArray(current.countermeasureList)) {
          try {
            serializedCountermeasures = JSON.stringify({
              list: current.countermeasureList,
              freeText: current.countermeasures || '',
            });
          } catch (e) {
            serializedCountermeasures = current.countermeasures || '';
          }
        }

        const payload: any = {
          title: titleToSave,
          status: current.status || 'Nuevo',
          date: current.date || new Date().toISOString().split('T')[0],
          responsible: current.responsible || user?.name || '',
          background: current.background || '',
          background_image_url: current.backgroundImageUrl || current.background_image_url || null,
          current_condition: current.currentCondition || current.current_condition || '',
          current_condition_image_url: current.currentConditionImageUrl || current.current_condition_image_url || null,
          goal: current.goal || '',
          root_cause: current.rootCause || current.root_cause || '',
          pareto_data: current.paretoData || current.pareto_data || [],
          countermeasures: serializedCountermeasures,
          execution_plan: current.plan || current.execution_plan || '',
          follow_up_notes: current.followUp || current.follow_up_notes || '',
          ishikawas: current.ishikawas || [],
          five_whys: current.multipleFiveWhys || current.five_whys || [],
          follow_up_data: current.followUpData || current.follow_up_data || [],
          action_plan: acts,
          action_plans_meta: current.actionPlansMeta || current.action_plans_meta || null,
          company_id: resolvedCompanyId,
        };

        const { data, error } = await supabase
          .from('a3_projects')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          const createdProj: A3Project = {
            ...updatedA3,
            id: data[0].id,
            title: titleToSave,
          };
          selectedA3Ref.current = createdProj;
          setSelectedA3(createdProj);
          setA3Projects((prev) => [createdProj, ...prev]);
        }
        setLastSavedAt(new Date());
        toast.success('Proyecto y plan de acción guardados automáticamente', { id: 'a3-autosave' });
      }
    } catch (err: any) {
      console.error('Error auto-saving action plan:', err);
      toast.error('Error al guardar plan de acción: ' + (err.message || ''));
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Debounced auto-save for general A3 project edits (background, goal, root causes, etc.)
  const debouncedSaveProject = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      const proj = selectedA3Ref.current;
      if (!proj || !proj.id) return;
      if (!proj.title?.trim()) return;

      setIsAutoSaving(true);
      try {
        const resolvedCompanyId =
          proj.company_id || proj.companyId || targetCompanyId || user?.company_id || null;

        let serializedCountermeasures = proj.countermeasures || '';
        if (Array.isArray(proj.countermeasureList)) {
          try {
            serializedCountermeasures = JSON.stringify({
              list: proj.countermeasureList,
              freeText: proj.countermeasures || '',
            });
          } catch (e) {
            serializedCountermeasures = proj.countermeasures || '';
          }
        }

        const payload: any = {
          title: proj.title,
          status: proj.status,
          date: proj.date,
          responsible: proj.responsible,
          background: proj.background,
          background_image_url: proj.backgroundImageUrl || proj.background_image_url,
          current_condition: proj.currentCondition || proj.current_condition,
          current_condition_image_url:
            proj.currentConditionImageUrl || proj.current_condition_image_url,
          goal: proj.goal,
          root_cause: proj.rootCause || proj.root_cause,
          pareto_data: proj.paretoData || proj.pareto_data,
          countermeasures: serializedCountermeasures,
          execution_plan: proj.plan || proj.execution_plan,
          follow_up_notes: proj.followUp || proj.follow_up_notes,
          ishikawas: proj.ishikawas,
          five_whys: proj.multipleFiveWhys || proj.five_whys,
          follow_up_data: proj.followUpData || proj.follow_up_data,
          action_plan: proj.actionPlan || proj.action_plan,
          action_plans_meta: proj.actionPlansMeta || proj.action_plans_meta || null,
          company_id: resolvedCompanyId,
        };

        const { error } = await supabase
          .from('a3_projects')
          .update(payload)
          .eq('id', proj.id);

        if (!error) {
          setLastSavedAt(new Date());
          setA3Projects((prev) =>
            prev.map((p) => (p.id === proj.id ? { ...p, ...proj } : p))
          );
        }
      } catch (err) {
        console.error('Silent autosave error:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000);
  }, [targetCompanyId, user]);

  // Save Project to Supabase manually
  const handleSaveProject = async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    const current = selectedA3Ref.current || selectedA3;
    if (!current) return;
    if (!current.title.trim()) {
      toast.error('El título del proyecto A3 es obligatorio.');
      return;
    }

    setIsSaving(true);
    const resolvedCompanyId =
      current.company_id || current.companyId || targetCompanyId || user?.company_id || null;

    let serializedCountermeasures = current.countermeasures || '';
    if (Array.isArray(current.countermeasureList)) {
      try {
        serializedCountermeasures = JSON.stringify({
          list: current.countermeasureList,
          freeText: current.countermeasures || '',
        });
      } catch (e) {
        serializedCountermeasures = current.countermeasures || '';
      }
    }

    const payload: any = {
      title: current.title,
      status: current.status,
      date: current.date,
      responsible: current.responsible,
      background: current.background,
      background_image_url: current.backgroundImageUrl || current.background_image_url,
      current_condition: current.currentCondition || current.current_condition,
      current_condition_image_url:
        current.currentConditionImageUrl || current.current_condition_image_url,
      goal: current.goal,
      root_cause: current.rootCause || current.root_cause,
      pareto_data: current.paretoData || current.pareto_data,
      countermeasures: serializedCountermeasures,
      execution_plan: current.plan || current.execution_plan,
      follow_up_notes: current.followUp || current.follow_up_notes,
      ishikawas: current.ishikawas,
      five_whys: current.multipleFiveWhys || current.five_whys,
      follow_up_data: current.followUpData || current.follow_up_data,
      action_plan: current.actionPlan || current.action_plan,
      action_plans_meta: current.actionPlansMeta || current.action_plans_meta || null,
      company_id: resolvedCompanyId,
    };

    try {
      if (current.id) {
        // Update
        const { error } = await supabase
          .from('a3_projects')
          .update(payload)
          .eq('id', current.id);

        if (error) throw error;
        setLastSavedAt(new Date());
        toast.success('Proyecto A3 actualizado correctamente');
      } else {
        // Insert
        const { data, error } = await supabase
          .from('a3_projects')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          current.id = data[0].id;
          selectedA3Ref.current = { ...current, id: data[0].id };
          setSelectedA3({ ...current, id: data[0].id });
        }
        setLastSavedAt(new Date());
        toast.success('Proyecto A3 creado con éxito');
      }

      await fetchProjects();
    } catch (err: any) {
      console.error('Error saving A3 project:', err);
      toast.error('Error al guardar: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto A3? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase.from('a3_projects').delete().eq('id', id);
      if (error) throw error;

      toast.success('Proyecto A3 eliminado');
      setA3Projects((prev) => prev.filter((p) => p.id !== id));
      if (selectedA3?.id === id) {
        handleSelectProject(null);
      }
    } catch (err: any) {
      console.error('Error deleting A3 project:', err);
      toast.error('Error al eliminar: ' + (err.message || ''));
    }
  };

  // Helpers to update selectedA3 fields
  const updateA3Field = (field: string, value: any) => {
    if (field === 'actionPlan' || field === 'action_plan') {
      handleActionPlanChange(value);
      return;
    }

    setSelectedA3((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        [field]: value,
        // Also sync aliases
        ...(field === 'background' ? { background: value } : {}),
        ...(field === 'currentCondition' ? { current_condition: value } : {}),
        ...(field === 'rootCause' ? { root_cause: value } : {}),
        ...(field === 'paretoData' || field === 'pareto_data'
          ? { paretoData: value, pareto_data: value }
          : {}),
        ...(field === 'five_whys' || field === 'multipleFiveWhys'
          ? { five_whys: value, multipleFiveWhys: value }
          : {}),
        ...(field === 'followUpData' || field === 'follow_up_data'
          ? { followUpData: value, follow_up_data: value }
          : {}),
        ...(field === 'actionPlansMeta' || field === 'action_plans_meta'
          ? { actionPlansMeta: value, action_plans_meta: value }
          : {}),
      };
      selectedA3Ref.current = updated;
      return updated;
    });

    if (selectedA3Ref.current?.id) {
      debouncedSaveProject();
    }
  };

  // Memoized Follow-Up Charts list (Supporting multiple KPI charts per A3!)
  const followUpCharts = useMemo<A3FollowUpConfig[]>(() => {
    if (!selectedA3) return [];
    const raw = selectedA3.followUpData ?? selectedA3.follow_up_data;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return [raw as A3FollowUpConfig];
    }
    return [];
  }, [selectedA3]);

  const handleAddFollowUpChart = () => {
    const newChart: A3FollowUpConfig = {
      id: Date.now(),
      kpiName: `Indicador #${followUpCharts.length + 1}`,
      kpiGoal: '90',
      goalType: 'maximize',
      isPercentage: true,
      dataPoints: [],
    };
    const updated = [...followUpCharts, newChart];
    updateA3Field('followUpData', updated);
    toast.success('Nuevo gráfico KPI añadido');
  };

  const handleUpdateFollowUpChart = (idx: number, updatedChart: A3FollowUpConfig) => {
    const updated = [...followUpCharts];
    updated[idx] = updatedChart;
    updateA3Field('followUpData', updated);
  };

  const handleDeleteFollowUpChart = (idx: number) => {
    const target = followUpCharts[idx];
    const chartName = target?.kpiName || `Gráfico #${idx + 1}`;
    if (window.confirm(`¿Estás seguro de que deseas eliminar el gráfico "${chartName}"?`)) {
      const updated = followUpCharts.filter((_, i) => i !== idx);
      updateA3Field('followUpData', updated);
      toast.success(`Gráfico "${chartName}" eliminado`);
    }
  };

  // Promote cause or countermeasure into 5W2H Action Plan
  const handlePromoteTo5W2H = (text: string, sourceCategory?: string) => {
    const current = selectedA3Ref.current || selectedA3;
    if (!current) return;
    const currentActions = (current.actionPlan || current.action_plan || []) as A3ActionPlanItem[];
    const newAction: A3ActionPlanItem = {
      id: Date.now(),
      planId: 'main',
      what: `Implementar contramedida: ${text}`,
      why: sourceCategory ? `Causa identificada en ${sourceCategory}` : 'Neutralizar causa raíz detectada',
      who: current.responsible || user?.name || '',
      when: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      progress: 0,
      subtasks: [
        {
          id: Date.now() + 1,
          title: `Definir estándar o procedimiento para ${text.slice(0, 30)}...`,
          completed: false,
        },
        {
          id: Date.now() + 2,
          title: 'Ejecutar prueba piloto en puesto de trabajo',
          completed: false,
        },
      ],
      countermeasure: text,
      countermeasures: [text],
    };

    handleActionPlanChange([...currentActions, newAction]);
    setActiveTab('plan');
    toast.success('¡Acción 5W2H generada y guardada automáticamente!', { id: 'a3-autosave' });
  };

  return (
    <div
      ref={fullScreenContainerRef}
      className={`min-h-screen bg-slate-50/50 ${
        isFullScreen ? 'p-6 bg-slate-900 text-white overflow-y-auto' : ''
      }`}
    >
      {/* ============================================================== */}
      {/* 1. LIST VIEW (TABLERO DE PROYECTOS A3) */}
      {/* ============================================================== */}
      {!selectedA3 ? (
        <div className="space-y-6">
          {/* Header with Company Selector & New A3 Button */}
          <HeaderWithFilter
            title="Proyectos A3 Toyota"
            subtitle="Metodología estructurada de resolución de problemas en 8 pasos con planes de acción 5W2H"
          >
            <button
              type="button"
              onClick={handleNewA3}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
            >
              <Plus size={16} />
              <span>+ Nuevo Proyecto A3</span>
            </button>
          </HeaderWithFilter>

          {/* Metric Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Proyectos A3
                </span>
                <p className="text-2xl font-black text-slate-800 mt-1">{projectMetrics.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                  En Proceso
                </span>
                <p className="text-2xl font-black text-blue-600 mt-1">{projectMetrics.inProgress}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                  Completados
                </span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {projectMetrics.completed}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Avance 5W2H Medio
                </span>
                <p className="text-2xl font-black text-white mt-1">
                  {projectMetrics.avgProgress}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <TrendingUp size={20} />
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, líder, causa raíz..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['Todos', 'Nuevo', 'En Proceso', 'En Revisión', 'Completado'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Cargando proyectos A3...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm px-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <FileText size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No se encontraron proyectos A3</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No hay proyectos registrados con los filtros seleccionados. Comienza un nuevo proyecto A3 Toyota para resolver desviaciones operativas.
              </p>
              <button
                type="button"
                onClick={handleNewA3}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-brand-700 hover:to-indigo-700 transition-all inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>Crear Primer Proyecto A3</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const actions = (project.actionPlan || project.action_plan || []) as A3ActionPlanItem[];
                const completedActions = actions.filter((a) => a.status === 'completed').length;
                const progressPct =
                  actions.length > 0
                    ? Math.round(
                        actions.reduce(
                          (acc, a) => acc + (a.progress || (a.status === 'completed' ? 100 : 0)),
                          0
                        ) / actions.length
                      )
                    : 0;

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Top */}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                            project.status === 'Completado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : project.status === 'En Proceso'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : project.status === 'En Revisión'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {project.status}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{project.date}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => {
                          handleSelectProject(project);
                          setActiveTab('context');
                        }}
                        className="text-base font-bold text-slate-800 leading-snug hover:text-brand-600 cursor-pointer line-clamp-2 transition-colors mb-2"
                      >
                        {project.title}
                      </h3>

                      {/* Problem or Goal Snippet */}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {project.goal || project.background || 'Sin descripción adicional.'}
                      </p>

                      {/* Root Cause Tag if identified */}
                      {project.rootCause && (
                        <div className="mb-4 p-2 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs flex items-start gap-1.5">
                          <Sparkles size={13} className="text-purple-600 mt-0.5 shrink-0" />
                          <span className="font-semibold text-purple-900 line-clamp-1">
                            Causa Raíz: {project.rootCause}
                          </span>
                        </div>
                      )}

                      {/* 5W2H Progress Bar */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <ListTodo size={13} className="text-brand-600" />
                            <span>Plan 5W2H ({completedActions}/{actions.length})</span>
                          </span>
                          <span className="font-black text-brand-600">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progressPct === 100 ? 'bg-emerald-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Responsible & Actions */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {project.responsible ? project.responsible.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                          {project.responsible || 'Sin responsable'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectProject(project);
                            setIsBoardMode(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                          title="Ver en Modo Lámina (Board View)"
                        >
                          <Layout size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectProject(project);
                            setIsBoardMode(false);
                            setActiveTab('context');
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-brand-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors shadow-xs"
                        >
                          <span>Abrir</span>
                          <ChevronRight size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. DETAIL / EDITOR VIEW (FICHA A3 TOYOTA) */
        /* ============================================================== */
        <div className="space-y-5">
          {/* Top Bar Navigation */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <button
                type="button"
                onClick={() => handleSelectProject(null)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                title="Volver al tablero de proyectos"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex-1">
                <input
                  type="text"
                  value={selectedA3.title}
                  onChange={(e) => updateA3Field('title', e.target.value)}
                  placeholder="Título del Proyecto A3 (Ej: Reducción de Mermas en Línea 2)..."
                  className="w-full text-base sm:text-lg font-black text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none pb-0.5"
                />
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>ID: {selectedA3.id || 'Nuevo Borrador'}</span>
                  <span>•</span>
                  <span>📅 {selectedA3.date}</span>
                </div>
              </div>
            </div>

            {/* Controls & Save button */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status selector */}
              <select
                value={selectedA3.status}
                onChange={(e) => updateA3Field('status', e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Nuevo">⚪ Nuevo</option>
                <option value="En Proceso">🔵 En Proceso</option>
                <option value="En Revisión">🟡 En Revisión</option>
                <option value="Completado">🟢 Completado</option>
                <option value="Standby">⏸️ Standby</option>
              </select>

              {/* Responsible selector */}
              <input
                type="text"
                list="responsible-users"
                value={selectedA3.responsible || ''}
                onChange={(e) => updateA3Field('responsible', e.target.value)}
                placeholder="Líder A3..."
                className="w-36 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
              />
              <datalist id="responsible-users">
                {profiles.map((p) => (
                  <option key={p.id} value={p.full_name || p.email || ''} />
                ))}
              </datalist>

              {/* View Mode Toggle: Editor Tabs vs Board Sheet */}
              <button
                type="button"
                onClick={() => setIsBoardMode(!isBoardMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isBoardMode
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Layout size={14} />
                <span>{isBoardMode ? 'Modo Editor' : 'Modo Lámina A3'}</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullScreen}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title={isFullScreen ? 'Salir de pantalla completa' : 'Presentación Pantalla Completa'}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Auto-save Status Indicator */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-100/90 border border-slate-200 text-slate-600 shrink-0"
                title={lastSavedAt ? `Último guardado: ${lastSavedAt.toLocaleTimeString()}` : 'Autoguardado activado'}
              >
                {isAutoSaving ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-amber-700">Autoguardando...</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-800">
                      Guardado {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-medium text-slate-500">Autoguardado</span>
                  </>
                )}
              </div>

              {/* Share Pending Tasks via Email Button */}
              {selectedA3 && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0"
                  title="Compartir tareas pendientes por correo electrónico"
                >
                  <Mail size={15} />
                  <span className="hidden sm:inline">Compartir Tareas</span>
                  {(() => {
                    const acts = (selectedA3.actionPlan || selectedA3.action_plan || []) as A3ActionPlanItem[];
                    const pendCount = acts.filter((a) => a.status !== 'completed').length;
                    return pendCount > 0 ? (
                      <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-indigo-600 text-white font-black rounded-full">
                        {pendCount}
                      </span>
                    ) : null;
                  })()}
                </button>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={isSaving || isAutoSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0"
              >
                <Save size={15} />
                <span>{isSaving ? 'Guardando...' : 'Guardar A3'}</span>
              </button>

              {selectedA3.id && (
                <button
                  type="button"
                  onClick={() => handleDeleteProject(selectedA3.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar este A3"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* VIEW: BOARD VIEW vs TABBED EDITOR */}
          {isBoardMode ? (
            <A3BoardView
              a3={selectedA3}
              onUpdate={updateA3Field}
              users={profiles.map((p) => ({ name: p.full_name || p.email || 'Usuario', email: p.email || undefined }))}
            />
          ) : (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('context')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'context'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText size={14} />
                  <span>1. Contexto & Situación Actual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('analysis')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'analysis'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GitBranch size={14} />
                  <span>2. Análisis Causa Raíz</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('countermeasures')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'countermeasures'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>3. Contramedidas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 relative ${
                    activeTab === 'plan'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListTodo size={14} />
                  <span>4. Planes de Acción 5W2H</span>
                  {((selectedA3.actionPlan || selectedA3.action_plan || []).length > 0) && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeTab === 'plan' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {(selectedA3.actionPlan || selectedA3.action_plan || []).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('followup')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === 'followup'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>5. Seguimiento & Estandarización</span>
                  {followUpCharts.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeTab === 'followup' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {followUpCharts.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Context & Current Condition */}
              {activeTab === 'context' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
                  {/* Background / Antecedentes */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Antecedentes del Negocio (Contexto)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Describe por qué este problema es prioritario: impacto financiero, quejas de clientes, cuellos de botella o seguridad.
                      </p>
                      <RichTextEditor
                        value={selectedA3.background || ''}
                        onChange={(val) => updateA3Field('background', val)}
                        placeholder="Detalla los antecedentes y relevancia operativa..."
                        minHeight="180px"
                      />
                    </div>
                  </div>

                  {/* Current Condition & Photos */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-sm font-bold text-slate-800">
                          Condición Actual (Situación de Partida)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Muestra la realidad con datos cuantitativos, gráficos, diagramas de flujo o fotos de la desviación.
                      </p>
                      <RichTextEditor
                        value={selectedA3.currentCondition || selectedA3.current_condition || ''}
                        onChange={(val) => updateA3Field('currentCondition', val)}
                        placeholder="Describe la línea base actual (ej: Scrap en 14%, OEE al 62%)..."
                        minHeight="140px"
                      />

                      {/* Image URL input for current condition */}
                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <ImageIcon size={13} className="text-slate-400" />
                          <span>URL de Evidencia Gráfica / Fotografía</span>
                        </label>
                        <input
                          type="text"
                          value={
                            selectedA3.currentConditionImageUrl ||
                            selectedA3.current_condition_image_url ||
                            ''
                          }
                          onChange={(e) =>
                            updateA3Field('currentConditionImageUrl', e.target.value)
                          }
                          placeholder="https://... imagen o gráfico de apoyo"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        {(selectedA3.currentConditionImageUrl ||
                          selectedA3.current_condition_image_url) && (
                          <div className="mt-2 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={
                                selectedA3.currentConditionImageUrl ||
                                selectedA3.current_condition_image_url ||
                                ''
                              }
                              alt="Condición Actual"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goal / SMART Target Condition (Full Width) */}
                  <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50/70 to-teal-50/70 p-5 rounded-2xl border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <h3 className="text-sm font-bold text-emerald-950">
                        Objetivo / Meta SMART (Condición Deseada)
                      </h3>
                    </div>
                    <p className="text-xs text-emerald-800 mb-3">
                      Define la meta específica, medible, alcanzable, relevante y con fecha límite clara.
                    </p>
                    <textarea
                      rows={3}
                      value={selectedA3.goal || ''}
                      onChange={(e) => updateA3Field('goal', e.target.value)}
                      placeholder="Ej: Reducir la merma de envasado del 14% al 3% para el 30 de Noviembre, ahorrando $4.2M CLP mensuales..."
                      className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Root Cause Analysis */}
              {activeTab === 'analysis' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Root cause summary badge */}
                  <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                          Causa Raíz Validada (Conclusión)
                        </h4>
                        <p className="text-xs text-purple-800">
                          Sintetiza la causa raíz fundamental descubierta en los análisis.
                        </p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={selectedA3.rootCause || selectedA3.root_cause || ''}
                      onChange={(e) => updateA3Field('rootCause', e.target.value)}
                      placeholder="Escribe la causa raíz principal..."
                      className="flex-1 min-w-[280px] px-3.5 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                    />
                  </div>

                  {/* Ishikawa Diagrams */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Diagramas de Espina de Pescado (Ishikawa 6M)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [
                            ...(selectedA3.ishikawas || []),
                            { problem: '', categories: {} },
                          ];
                          updateA3Field('ishikawas', next);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Plus size={14} />
                        <span>Añadir Otro Ishikawa</span>
                      </button>
                    </div>

                    {(selectedA3.ishikawas || []).map((ish, idx) => (
                      <A3Ishikawa
                        key={idx}
                        index={idx}
                        data={ish}
                        onChange={(f, val) => {
                          const next = [...(selectedA3.ishikawas || [])];
                          next[idx] = { ...next[idx], [f]: val };
                          updateA3Field('ishikawas', next);
                        }}
                        onDelete={
                          (selectedA3.ishikawas || []).length > 1
                            ? () => {
                                const next = (selectedA3.ishikawas || []).filter((_, i) => i !== idx);
                                updateA3Field('ishikawas', next);
                              }
                            : undefined
                        }
                        onPromoteTo5W2H={handlePromoteTo5W2H}
                      />
                    ))}
                  </div>

                  {/* 5 Whys Analysis */}
                  <A3FiveWhys
                    items={selectedA3.five_whys || selectedA3.multipleFiveWhys || []}
                    onChange={(items) => updateA3Field('five_whys', items)}
                    onPromoteTo5W2H={handlePromoteTo5W2H}
                  />

                  {/* Pareto Diagram */}
                  <A3Pareto
                    data={selectedA3.paretoData || selectedA3.pareto_data || []}
                    onChange={(data) => updateA3Field('paretoData', data)}
                    onPromoteTo5W2H={handlePromoteTo5W2H}
                  />
                </div>
              )}

              {/* Tab 3: Countermeasures */}
              {activeTab === 'countermeasures' && (
                <div className="space-y-6 animate-fadeIn">
                  <A3CountermeasureManager
                    items={selectedA3.countermeasureList || selectedA3.countermeasure_list || []}
                    onChange={(items) => updateA3Field('countermeasureList', items)}
                    onSendTo5W2H={handlePromoteTo5W2H}
                  />
                </div>
              )}

              {/* Tab 4: 5W2H Action Plans with Subtasks (CORE FEATURE) */}
              {activeTab === 'plan' && (
                <div className="animate-fadeIn">
                  <A3ActionPlan5W2H
                    actions={(selectedA3.actionPlan || selectedA3.action_plan || []) as A3ActionPlanItem[]}
                    onChange={handleActionPlanChange}
                    users={profiles.map((p) => ({ name: p.full_name || p.email || 'Usuario', email: p.email || undefined }))}
                    countermeasures={(
                      selectedA3.countermeasureList ||
                      selectedA3.countermeasure_list ||
                      []
                    ).map((c) => c.title)}
                    plansMeta={selectedA3.actionPlansMeta || selectedA3.action_plans_meta || undefined}
                    onUpdatePlansMeta={(groups) => {
                      updateA3Field('actionPlansMeta', groups);
                      if (selectedA3Ref.current?.id) {
                        supabase
                          .from('a3_projects')
                          .update({ action_plans_meta: groups })
                          .eq('id', selectedA3Ref.current.id)
                          .then(({ error }) => {
                            if (!error) {
                              setLastSavedAt(new Date());
                            }
                          });
                      }
                    }}
                    isSaving={isAutoSaving}
                    lastSavedAt={lastSavedAt}
                    onShareEmail={() => setIsShareModalOpen(true)}
                  />
                </div>
              )}

              {/* Tab 5: Follow-Up & Standardization */}
              {activeTab === 'followup' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Header bar for KPI Evolution Charts */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 font-bold text-xs flex items-center justify-center">
                          7
                        </span>
                        <span>Seguimiento de Resultados y Eficacia</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Monitorea el comportamiento de los KPIs antes y después de implementar el Plan de Acción.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFollowUpChart}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
                    >
                      <Plus size={15} />
                      <span>Añadir Gráfico de Seguimiento</span>
                    </button>
                  </div>

                  {/* All KPI Follow-up charts */}
                  {followUpCharts.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">No hay gráficos de seguimiento registrados</h4>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                          Registra indicadores clave (OTIFD, SOB/FALT, OEE, Scrap, Atrasos semanales) para medir el impacto de las contramedidas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddFollowUpChart}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <Plus size={15} />
                        <span>Crear Primer Gráfico</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {followUpCharts.map((chartConfig, idx) => (
                        <A3FollowUp
                          key={chartConfig.id || idx}
                          data={chartConfig}
                          chartIndex={idx}
                          totalCharts={followUpCharts.length}
                          onChange={(updated) => handleUpdateFollowUpChart(idx, updated)}
                          onDelete={() => handleDeleteFollowUpChart(idx)}
                        />
                      ))}

                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={handleAddFollowUpChart}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-cyan-400 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Plus size={15} className="text-cyan-600" />
                          <span>Agregar Otro Gráfico de KPI</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standardization & Lessons Learned */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
                        8
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">
                        Estandarización y Lecciones Aprendidas (YOKOTEN)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Documenta los estándares actualizados (POE), matrices de habilidades, auditorías de sostenimiento y difusión a otras líneas (Yokoten).
                    </p>
                    <RichTextEditor
                      value={selectedA3.followUp || selectedA3.follow_up_notes || ''}
                      onChange={(val) => updateA3Field('followUp', val)}
                      placeholder="Registra los nuevos estándares, frecuencia de auditoría y reconocimientos al equipo..."
                      minHeight="160px"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Share Pending Tasks Modal */}
      {selectedA3 && (
        <A3ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          project={selectedA3}
          actions={(selectedA3.actionPlan || selectedA3.action_plan || []) as A3ActionPlanItem[]}
          companyId={
            targetCompanyId ||
            selectedA3.company_id ||
            selectedA3.companyId ||
            user?.company_id ||
            user?.companyId ||
            null
          }
          companyName={
            companies.find(
              (c) =>
                c.id ===
                (targetCompanyId ||
                  selectedA3.company_id ||
                  selectedA3.companyId ||
                  user?.company_id ||
                  user?.companyId)
            )?.name
          }
        />
      )}
    </div>
  );
};

export default A3Page;
