import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Company } from '../../types';
import {
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  Users,
  Settings,
  CheckCircle,
  X,
  Layers,
  Edit,
  Sliders,
  Check,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Zap,
  FileText,
  Activity,
  Brain,
  Footprints,
  type LucideIcon,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

// ---------------------------------------------------------
// Definición de Módulos Lean del Ecosistema
// ---------------------------------------------------------
export interface LeanModuleDef {
  key: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    iconBg: string;
    iconText: string;
  };
}

export const AVAILABLE_MODULES: LeanModuleDef[] = [
  {
    key: '5s',
    name: 'Tarjetas 5S',
    shortName: '5S',
    description: 'Detección, registro y resolución de anomalías en piso de planta',
    icon: ClipboardList,
    color: {
      bg: 'bg-cyan-50/60',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      badgeBg: 'bg-cyan-50',
      badgeText: 'text-cyan-700',
      badgeBorder: 'border-cyan-200',
      iconBg: 'bg-cyan-100 text-cyan-700',
      iconText: 'text-cyan-600',
    },
  },
  {
    key: 'auditoria_5s',
    name: 'Auditoría 5S',
    shortName: 'Auditorías',
    description: 'Evaluaciones periódicas, checklists y radar de madurez 5S',
    icon: ShieldCheck,
    color: {
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      iconText: 'text-emerald-600',
    },
  },
  {
    key: 'quick_wins',
    name: 'Quick Wins',
    shortName: 'Quick Wins',
    description: 'Mejoras rápidas de alto impacto y bajo esfuerzo con planes de acción',
    icon: Zap,
    color: {
      bg: 'bg-amber-50/60',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700',
      badgeBorder: 'border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      iconText: 'text-amber-600',
    },
  },
  {
    key: 'a3',
    name: 'Proyectos A3 Toyota',
    shortName: 'A3 Toyota',
    description: 'Metodología sistemática de resolución de problemas complejos en 8 pasos',
    icon: FileText,
    color: {
      bg: 'bg-blue-50/60',
      text: 'text-blue-800',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
      iconText: 'text-blue-600',
    },
  },
  {
    key: 'vsm',
    name: 'Mapeo de Procesos VSM',
    shortName: 'VSM',
    description: 'Value Stream Mapping del flujo de valor, tiempos de ciclo y cuellos de botella',
    icon: Activity,
    color: {
      bg: 'bg-purple-50/60',
      text: 'text-purple-800',
      border: 'border-purple-200',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-700',
      badgeBorder: 'border-purple-200',
      iconBg: 'bg-purple-100 text-purple-700',
      iconText: 'text-purple-600',
    },
  },
  {
    key: 'responsables',
    name: 'Matriz de Responsables',
    shortName: 'Responsables',
    description: 'Asignación de roles, facilitadores y líderes Lean por proceso',
    icon: Users,
    color: {
      bg: 'bg-indigo-50/60',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-700',
      badgeBorder: 'border-indigo-200',
      iconBg: 'bg-indigo-100 text-indigo-700',
      iconText: 'text-indigo-600',
    },
  },
  {
    key: 'consultor_ia',
    name: 'Consultor IA Lean',
    shortName: 'Consultor IA',
    description: 'Asistente con Inteligencia Artificial para análisis de causa raíz y Kaizen',
    icon: Brain,
    color: {
      bg: 'bg-fuchsia-50/60',
      text: 'text-fuchsia-800',
      border: 'border-fuchsia-200',
      badgeBg: 'bg-fuchsia-50',
      badgeText: 'text-fuchsia-700',
      badgeBorder: 'border-fuchsia-200',
      iconBg: 'bg-fuchsia-100 text-fuchsia-700',
      iconText: 'text-fuchsia-600',
    },
  },
  {
    key: 'gemba_walk',
    name: 'Gemba Walk',
    shortName: 'Gemba Walk',
    description: 'Rondas estandarizadas de liderazgo, captura de mudas y coaching en piso',
    icon: Footprints,
    color: {
      bg: 'bg-rose-50/60',
      text: 'text-rose-800',
      border: 'border-rose-200',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      iconText: 'text-rose-600',
    },
  },
];

// ---------------------------------------------------------
// Roles / Paquetes de Empresa Predefinidos
// ---------------------------------------------------------
export interface RolePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  modules: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'basic_5s',
    name: 'Básico 5S',
    badge: 'Piso de Planta',
    description: 'Tarjetas 5S, Auditorías periódicas y Matriz de Responsables',
    modules: ['5s', 'auditoria_5s', 'responsables'],
  },
  {
    id: 'kaizen_standard',
    name: 'Kaizen Operacional',
    badge: 'Mejora Continua',
    description: '5S completo + Quick Wins para resolución rápida de problemas',
    modules: ['5s', 'auditoria_5s', 'quick_wins', 'responsables'],
  },
  {
    id: 'lean_expert',
    name: 'Lean Avanzado',
    badge: 'Metodología Total',
    description: 'Todo el paquete metodológico Lean (A3, VSM y Gemba Walk incluidos, sin IA)',
    modules: ['5s', 'auditoria_5s', 'quick_wins', 'a3', 'vsm', 'gemba_walk', 'responsables'],
  },
  {
    id: 'enterprise_all',
    name: 'Lean Enterprise + IA',
    badge: 'Ecosistema Total',
    description: 'Acceso ilimitado a todos los 8 módulos y Consultor IA',
    modules: [
      '5s',
      'auditoria_5s',
      'quick_wins',
      'a3',
      'vsm',
      'gemba_walk',
      'responsables',
      'consultor_ia',
    ],
  },
];

// Helper para normalizar módulos de una empresa desde la base de datos
export const normalizeCompanyModules = (compModules?: string[] | null): string[] => {
  if (!compModules || !Array.isArray(compModules) || compModules.length === 0) {
    // Si no tiene módulos definidos, por defecto se asumen todos los módulos
    return AVAILABLE_MODULES.map((m) => m.key);
  }

  const set = new Set<string>();
  compModules.forEach((item) => {
    const clean = item.toLowerCase().trim();
    if (clean === 'audits' || clean === 'auditoria_5s' || clean === '5s_audits' || clean === 'auditorias-5s') {
      set.add('auditoria_5s');
    } else if (clean === 'consultant' || clean === 'ai' || clean === 'consultor_ia') {
      set.add('consultor_ia');
    } else if (clean === 'quickwins' || clean === 'quick_wins' || clean === 'quick-wins') {
      set.add('quick_wins');
    } else if (clean === 'a3' || clean === 'a3_projects') {
      set.add('a3');
    } else if (clean === '5s' || clean === '5s_cards') {
      set.add('5s');
    } else if (clean === 'vsm') {
      set.add('vsm');
    } else if (clean === 'gemba' || clean === 'gemba_walk' || clean === 'gemba_walks') {
      set.add('gemba_walk');
    } else if (clean === 'responsables') {
      set.add('responsables');
    }
  });

  return Array.from(set);
};

// Helper para armar el payload de guardado con compatibilidad legacy
export const buildPayloadAllowedModules = (selectedKeys: string[]): string[] => {
  const result = new Set<string>(selectedKeys);
  if (result.has('auditoria_5s')) {
    result.add('audits'); // retrocompatibilidad
  }
  if (result.has('consultor_ia')) {
    result.add('consultant'); // retrocompatibilidad
  }
  return Array.from(result);
};

interface UserProfile {
  id: string;
  company_id?: string | null;
}

export const CompaniesPage: React.FC = () => {
  const { user, refreshData } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Crear Empresa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [newModules, setNewModules] = useState<string[]>(
    ROLE_PRESETS.find((p) => p.id === 'enterprise_all')?.modules || AVAILABLE_MODULES.map((m) => m.key)
  );
  const [selectedPresetForNew, setSelectedPresetForNew] = useState<string | null>('enterprise_all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Editar Empresa & Módulos
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [selectedPresetForEdit, setSelectedPresetForEdit] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesRes, usersRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('profiles').select('id, company_id'),
      ]);

      if (companiesRes.data) {
        setCompanies(companiesRes.data);
      }
      if (usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error('Error loading companies data:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    setSlug(autoSlug);
  };

  // Crear Empresa
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre de la empresa');
      return;
    }

    if (newModules.length === 0) {
      toast.error('Debes seleccionar al menos un módulo para la empresa');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Registrando empresa...');

    try {
      const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const schemaName = `client_${cleanSlug}`;
      const payloadModules = buildPayloadAllowedModules(newModules);

      const payload = {
        name: name.trim(),
        slug: cleanSlug,
        schema_name: schemaName,
        database_schema: schemaName,
        allowed_modules: payloadModules,
        allowed_apps: ['nexus-lean'],
        is_lobby: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('companies')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast.success('¡Empresa registrada exitosamente!', { id: toastId });
      setCompanies((prev) => [...prev, data]);
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setNewModules(AVAILABLE_MODULES.map((m) => m.key));
      setSelectedPresetForNew('enterprise_all');
    } catch (err: any) {
      console.error('Error creating company:', err);
      toast.error(err?.message || 'Error al crear empresa', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de edición con módulos de la empresa
  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setEditName(comp.name || '');

    const normalized = normalizeCompanyModules(comp.allowed_modules);
    setEditModules(normalized);

    // Detectar si coincide con algún preset
    const matchingPreset = ROLE_PRESETS.find((p) => {
      if (p.modules.length !== normalized.length) return false;
      return p.modules.every((m) => normalized.includes(m));
    });
    setSelectedPresetForEdit(matchingPreset ? matchingPreset.id : null);

    setIsEditModalOpen(true);
  };

  // Guardar Cambios en Empresa y Módulos
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editName.trim()) return;

    if (editModules.length === 0) {
      toast.error('Debes habilitar al menos un módulo para la empresa');
      return;
    }

    setIsSavingEdit(true);
    const toastId = toast.loading('Guardando configuración de empresa...');

    try {
      const payloadModules = buildPayloadAllowedModules(editModules);

      const { error } = await supabase
        .from('companies')
        .update({
          name: editName.trim(),
          allowed_modules: payloadModules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Empresa y módulos actualizados correctamente', { id: toastId });
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === editingCompany.id
            ? { ...c, name: editName.trim(), allowed_modules: payloadModules }
            : c
        )
      );
      setIsEditModalOpen(false);
      setEditingCompany(null);

      // Refrescar el contexto si el usuario actual pertenece a la empresa editada
      if (user?.companyId === editingCompany.id) {
        await refreshData();
      }
    } catch (err: any) {
      console.error('Error updating company:', err);
      toast.error(err?.message || 'Error al actualizar empresa', { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle de un módulo específico en edición
  const toggleEditModule = (key: string) => {
    setEditModules((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];

      // Verificar si coincide con preset
      const match = ROLE_PRESETS.find((p) => {
        if (p.modules.length !== next.length) return false;
        return p.modules.every((m) => next.includes(m));
      });
      setSelectedPresetForEdit(match ? match.id : null);

      return next;
    });
  };

  // Aplicar un Preset en edición
  const applyPresetEdit = (preset: RolePreset) => {
    setEditModules([...preset.modules]);
    setSelectedPresetForEdit(preset.id);
    toast.success(`Paquete "${preset.name}" aplicado`);
  };

  // Toggle de un módulo específico en creación
  const toggleNewModule = (key: string) => {
    setNewModules((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];

      const match = ROLE_PRESETS.find((p) => {
        if (p.modules.length !== next.length) return false;
        return p.modules.every((m) => next.includes(m));
      });
      setSelectedPresetForNew(match ? match.id : null);

      return next;
    });
  };

  // Aplicar un Preset en creación
  const applyPresetNew = (preset: RolePreset) => {
    setNewModules([...preset.modules]);
    setSelectedPresetForNew(preset.id);
  };

  // Eliminar Empresa
  const handleDelete = async (id: string, companyName: string) => {
    const userCount = users.filter((u) => u.company_id === id).length;
    if (userCount > 0) {
      if (
        !window.confirm(
          `Esta empresa tiene ${userCount} usuario(s) asignado(s). Si la eliminas, sus usuarios quedarán sin asignar. ¿Deseas continuar?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`¿Seguro que deseas eliminar la empresa "${companyName}"?`)) {
        return;
      }
    }

    const toastId = toast.loading('Eliminando empresa...');
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;

      toast.success('Empresa eliminada', { id: toastId });
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting company:', err);
      toast.error(err?.message || 'Error al eliminar', { id: toastId });
    }
  };

  const totalAssignedUsers = users.filter((u) => Boolean(u.company_id)).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <Users size={16} />
            <span>Usuarios</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold">
              {users.length}
            </span>
          </Link>

          <Link
            to="/admin/companies"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
          >
            <Building2 size={16} />
            <span>Empresas</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
              {companies.length}
            </span>
          </Link>

          <Link
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <Settings size={16} />
            <span>Configuración</span>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewModules(AVAILABLE_MODULES.map((m) => m.key));
              setSelectedPresetForNew('enterprise_all');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>+ Nueva Empresa</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <span>Empresas y Módulos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestiona empresas clientes, su esquema de base de datos y los módulos Lean habilitados según su rol o contrato.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Empresas Registradas</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{companies.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Usuarios Asignados</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">
              {totalAssignedUsers} <span className="text-xs text-slate-400 font-normal">/ {users.length}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Módulos en Plataforma</p>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-700">
              {AVAILABLE_MODULES.length} <span className="text-xs text-slate-400 font-normal">Módulos Lean</span>
            </p>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((comp) => {
          const compUsers = users.filter((u) => u.company_id === comp.id);
          const activeModules = normalizeCompanyModules(comp.allowed_modules);
          const isComplete = activeModules.length === AVAILABLE_MODULES.length;

          return (
            <div
              key={comp.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all p-5 flex flex-col justify-between group shadow-sm relative overflow-hidden"
            >
              {/* Top Accent bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isComplete ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-blue-400'
                }`}
              />

              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between mb-3 pt-1">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-xs">
                    <Building2 size={22} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(comp)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Gestionar Empresa y Módulos"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Eliminar Empresa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Company Name & Schema */}
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {comp.name}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-semibold">
                    {comp.schema_name || comp.slug || 'schema'}
                  </span>
                  {comp.is_lobby && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                      Lobby Global
                    </span>
                  )}
                </div>

                {/* Modules Section */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sliders size={13} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-700">Módulos Asignados</span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isComplete
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {activeModules.length} de {AVAILABLE_MODULES.length}
                    </span>
                  </div>

                  {/* Modules Badges Grid */}
                  <div className="flex flex-wrap gap-1.5 min-h-[46px] items-start">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isActive = activeModules.includes(mod.key);
                      const Icon = mod.icon;

                      if (!isActive) {
                        return null;
                      }

                      return (
                        <span
                          key={mod.key}
                          title={`${mod.name}: ${mod.description}`}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border shadow-2xs transition-all ${mod.color.badgeBg} ${mod.color.badgeText} ${mod.color.badgeBorder}`}
                        >
                          <Icon size={12} className={mod.color.iconText} />
                          <span>{mod.shortName}</span>
                        </span>
                      );
                    })}

                    {activeModules.length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">
                        Sin módulos asignados
                      </span>
                    )}
                  </div>

                  {/* Quick Edit Modules Button */}
                  <button
                    onClick={() => openEditModal(comp)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Sliders size={13} />
                    <span>Configurar Módulos y Roles</span>
                  </button>
                </div>

                {/* Users Count & Active status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/admin/users?company=${comp.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <Users size={14} className="text-slate-400" />
                    <span>{compUsers.length} Colaborador(es)</span>
                  </Link>

                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle size={11} />
                    <span>Activa</span>
                  </span>
                </div>
              </div>

              {/* Footer info */}
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatDate(comp.created_at)}</span>
                </span>
                <span className="font-mono text-slate-400">#{comp.id.substring(0, 8)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Registrar Nueva Empresa */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Nueva Empresa</h3>
                  <p className="text-xs text-slate-500">Configura la organización y sus módulos permitidos según su plan</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCompany} className="p-6 space-y-5 overflow-y-auto grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: CIAL Alimentos, AgroIndustria S.A."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identificador / Slug (automático)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="cial, agroindustria"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Esquema generado: <code>client_{slug || 'empresa'}</code>
                  </p>
                </div>
              </div>

              {/* Selector de Presets / Paquetes */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Paquete / Rol de Empresa
                  </label>
                  <span className="text-[11px] text-slate-500">Selecciona un perfil rápido:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetForNew === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPresetNew(preset)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{preset.name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{preset.description}</p>
                        <div className="mt-2 text-[10px] font-semibold text-blue-700">
                          {preset.modules.length} módulos incluidos
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Módulos Individuales */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Módulos Habilitados ({newModules.length} de {AVAILABLE_MODULES.length})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Puedes personalizar los módulos marcando o desmarcando casillas:
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNewModules(AVAILABLE_MODULES.map((m) => m.key));
                        setSelectedPresetForNew('enterprise_all');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewModules([]);
                        setSelectedPresetForNew(null);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline px-1"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = newModules.includes(mod.key);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleNewModule(mod.key)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Manejado por el contenedor
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${mod.color.iconBg}`}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {mod.name}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
                <span className="text-xs text-slate-500">
                  {newModules.length} módulos seleccionados
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Empresa'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Empresa y Módulos */}
      {isEditModalOpen && editingCompany && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Gestionar Empresa y Módulos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifica el nombre y asigna o quita módulos disponibles para {editingCompany.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Esquema / Identificador
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingCompany.schema_name || editingCompany.slug || 'schema'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ID: <code>{editingCompany.id.substring(0, 16)}...</code>
                  </p>
                </div>
              </div>

              {/* Selector de Paquetes / Roles */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Paquete / Rol de Empresa
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Aplica una plantilla de módulos con un solo clic:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetForEdit === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPresetEdit(preset)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{preset.name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{preset.description}</p>
                        <div className="mt-2 text-[10px] font-semibold text-blue-700">
                          {preset.modules.length} módulos incluidos
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personalización de Módulos Individuales */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Módulos Habilitados ({editModules.length} de {AVAILABLE_MODULES.length})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Marca o desmarca los módulos para ajustar el acceso de los colaboradores de esta empresa:
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditModules(AVAILABLE_MODULES.map((m) => m.key));
                        setSelectedPresetForEdit('enterprise_all');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditModules([]);
                        setSelectedPresetForEdit(null);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline px-1"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = editModules.includes(mod.key);
                    const Icon = mod.icon;

                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleEditModule(mod.key)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Manejado por el contenedor
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${mod.color.iconBg}`}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {mod.name}
                            </p>
                            {isChecked ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                Activo
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                Oculto
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
                <span className="text-xs text-slate-500">
                  {editModules.length} de {AVAILABLE_MODULES.length} módulos habilitados
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
