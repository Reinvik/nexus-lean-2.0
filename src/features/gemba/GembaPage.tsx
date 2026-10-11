import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type {
  GembaRoute,
  GembaWalk,
  GembaFinding,
  GembaStation,
  GembaFindingType,
  GembaMudaCategory,
} from '../../types';
import {
  Footprints,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Brain,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Award,
  Zap,
  FileText,
  ClipboardList,
  Check,
  X,
  Filter,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

// -------------------------------------------------------------
// Constantes de Desperdicios Lean (8 Mudas)
// -------------------------------------------------------------
export const MUDA_DEFINITIONS: Record<
  GembaMudaCategory,
  { label: string; icon: string; desc: string; color: string }
> = {
  sobreproduccion: {
    label: 'Sobreproducción',
    icon: '📦',
    desc: 'Producir más o antes de lo requerido por el cliente',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  espera: {
    label: 'Tiempo de Espera',
    icon: '⏳',
    desc: 'Operarios o máquinas detenidas esperando material o información',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  transporte: {
    label: 'Transporte Innecesario',
    icon: '🚚',
    desc: 'Movimiento excesivo de materiales, piezas o producto en proceso',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  sobreprocesamiento: {
    label: 'Sobreprocesamiento',
    icon: '⚙️',
    desc: 'Trabajo o pasos que no agregan valor percibido por el cliente',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  inventario: {
    label: 'Exceso de Inventario',
    icon: '📑',
    desc: 'Materia prima, WIP o producto terminado acumulado',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  movimiento: {
    label: 'Movimientos Innecesarios',
    icon: '🚶',
    desc: 'Búsqueda de herramientas o ergonomía deficiente del operario',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  defectos: {
    label: 'Defectos y Reprocesos',
    icon: '❌',
    desc: 'Errores, scrap, mermas o necesidad de retrabajar piezas',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  talento: {
    label: 'Talento No Aprovechado',
    icon: '💡',
    desc: 'No escuchar ni involucrar las ideas y habilidades del personal',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const GembaPage: React.FC = () => {
  const { user, companies, activeCompanyId } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'walks' | 'routes' | 'findings' | 'kudos' | 'kpis'
  >('walks');

  const [walks, setWalks] = useState<GembaWalk[]>([]);
  const [routes, setRoutes] = useState<GembaRoute[]>([]);
  const [findings, setFindings] = useState<GembaFinding[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMuda, setFilterMuda] = useState<string>('all');

  // Modales
  const [isNewWalkModalOpen, setIsNewWalkModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [activeRunningWalk, setActiveRunningWalk] = useState<GembaWalk | null>(null);

  // Carga de datos
  const loadData = async () => {
    setLoading(true);
    try {
      const companyId = activeCompanyId || user?.companyId;

      let walksQuery = supabase.from('gemba_walks').select('*').order('created_at', { ascending: false });
      let routesQuery = supabase.from('gemba_routes').select('*').order('created_at', { ascending: false });
      let findingsQuery = supabase.from('gemba_findings').select('*').order('created_at', { ascending: false });

      if (companyId) {
        walksQuery = walksQuery.eq('company_id', companyId);
        routesQuery = routesQuery.eq('company_id', companyId);
        findingsQuery = findingsQuery.eq('company_id', companyId);
      }

      const [walksRes, routesRes, findingsRes] = await Promise.all([
        walksQuery,
        routesQuery,
        findingsQuery,
      ]);

      if (walksRes.data) setWalks(walksRes.data as GembaWalk[]);
      if (routesRes.data) setRoutes(routesRes.data as GembaRoute[]);
      if (findingsRes.data) setFindings(findingsRes.data as GembaFinding[]);
    } catch (err) {
      console.error('Error loading gemba data:', err);
      toast.error('Error al cargar datos de Gemba Walk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompanyId, user?.companyId]);

  // Derivación 1-clic a Quick Win
  const handleDeriveToQuickWin = async (finding: GembaFinding) => {
    const toastId = toast.loading('Derivando a Quick Win...');
    try {
      const companyId = finding.company_id || activeCompanyId || user?.companyId;
      const title = `QW: ${finding.station_name} - ${finding.description.slice(0, 50)}`;

      const { data: newQw, error: qwErr } = await supabase
        .from('quick_wins')
        .insert([
          {
            company_id: companyId,
            title,
            description: `Hallazgo detectado en Gemba Walk (${finding.station_name}):\n${finding.description}`,
            proposed_solution: finding.immediate_action || 'Implementar mejora acordada en piso',
            status: 'Propuesto',
            impact: 'Medio',
            responsible: finding.operator_name || user?.name || 'Líder Gemba',
            date: new Date().toISOString().split('T')[0],
            image_url: finding.image_url || null,
          },
        ])
        .select()
        .single();

      if (qwErr) throw qwErr;

      // Actualizar finding
      await supabase
        .from('gemba_findings')
        .update({
          derived_type: 'quick_win',
          derived_record_id: newQw.id,
          status: 'en_proceso',
        })
        .eq('id', finding.id);

      toast.success('¡Hallazgo derivado a Quick Win exitosamente!', { id: toastId });
      loadData();
    } catch (err: any) {
      console.error('Error deriving to Quick Win:', err);
      toast.error(err?.message || 'Error al derivar a Quick Win', { id: toastId });
    }
  };

  // Derivación 1-clic a Tarjeta 5S
  const handleDeriveToFiveS = async (finding: GembaFinding) => {
    const toastId = toast.loading('Derivando a Tarjeta 5S...');
    try {
      const companyId = finding.company_id || activeCompanyId || user?.companyId;

      const { data: new5s, error: fiveSErr } = await supabase
        .from('five_s_cards')
        .insert([
          {
            company_id: companyId,
            area: finding.station_name || 'Gemba Planta',
            description: `Hallazgo Gemba Walk: ${finding.description}`,
            findings: finding.description,
            status: 'Abierto',
            priority: 'Media',
            category: 'Seiton',
            photo_url: finding.image_url || null,
            responsible: finding.operator_name || user?.name || 'Responsable de Área',
          },
        ])
        .select()
        .single();

      if (fiveSErr) throw fiveSErr;

      await supabase
        .from('gemba_findings')
        .update({
          derived_type: 'five_s',
          derived_record_id: new5s.id,
          status: 'en_proceso',
        })
        .eq('id', finding.id);

      toast.success('¡Hallazgo derivado a Tarjeta 5S exitosamente!', { id: toastId });
      loadData();
    } catch (err: any) {
      console.error('Error deriving to 5S:', err);
      toast.error(err?.message || 'Error al derivar a 5S', { id: toastId });
    }
  };

  // Derivación 1-clic a A3 Toyota
  const handleDeriveToA3 = async (finding: GembaFinding) => {
    const toastId = toast.loading('Derivando a Proyecto A3...');
    try {
      const companyId = finding.company_id || activeCompanyId || user?.companyId;
      const title = `A3: Problema en ${finding.station_name}`;

      const { data: newA3, error: a3Err } = await supabase
        .from('a3_projects')
        .insert([
          {
            company_id: companyId,
            title,
            status: 'Nuevo',
            responsible: user?.name || 'Líder Gemba',
            date: new Date().toISOString().split('T')[0],
            background: `Desviación recurrente detectada durante la caminata Gemba en ${finding.station_name}.`,
            current_condition: finding.description,
            current_condition_image_url: finding.image_url || null,
            goal: 'Eliminar la causa raíz y estabilizar el estándar del proceso.',
          },
        ])
        .select()
        .single();

      if (a3Err) throw a3Err;

      await supabase
        .from('gemba_findings')
        .update({
          derived_type: 'a3',
          derived_record_id: newA3.id,
          status: 'en_proceso',
        })
        .eq('id', finding.id);

      toast.success('¡Problema escalado a Proyecto A3 exitosamente!', { id: toastId });
      loadData();
    } catch (err: any) {
      console.error('Error deriving to A3:', err);
      toast.error(err?.message || 'Error al escalar a A3', { id: toastId });
    }
  };

  // Métricas LSW
  const totalWalks = walks.length;
  const completedWalks = walks.filter((w) => w.status === 'completada').length;
  const completionRate = totalWalks > 0 ? Math.round((completedWalks / totalWalks) * 100) : 0;
  const totalFindings = findings.filter((f) => f.finding_type !== 'reconocimiento_positivo').length;
  const totalKudos = findings.filter((f) => f.finding_type === 'reconocimiento_positivo').length;
  const resolvedFindings = findings.filter((f) => f.status === 'cerrado' || f.derived_type !== 'ninguna').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
            <Footprints size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Gemba Walk
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Leader Standard Work
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Ir y ver en el lugar real (Genchi Genbutsu), escuchar al operador, eliminar desperdicios y liderar con el ejemplo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewRouteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <MapPin size={15} />
            <span>+ Nueva Ruta</span>
          </button>

          <button
            onClick={() => setIsNewWalkModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-600/20"
          >
            <Plus size={16} />
            <span>+ Iniciar Caminata</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-all shadow-sm"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-rose-600' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Cumplimiento LSW</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {completionRate}%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {completedWalks} de {totalWalks} caminatas completadas
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Rutas Activas</span>
            <MapPin size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{routes.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Circuitos estandarizados</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Hallazgos & Mudas</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700">{totalFindings}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {resolvedFindings} derivados o resueltos
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Reconocimientos</span>
            <Award size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700">{totalKudos}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Buenas prácticas celebradas</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('walks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'walks'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Footprints size={15} />
          <span>Rondas y Caminatas</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {walks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'routes'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin size={15} />
          <span>Rutas Estándar</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {routes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'findings'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle size={15} />
          <span>Hallazgos & 8 Mudas</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {totalFindings}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kudos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'kudos'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award size={15} />
          <span>Muro de Reconocimientos</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {totalKudos}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kpis')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'kpis'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={15} />
          <span>Dashboard LSW</span>
        </button>
      </div>

      {/* Tab: Caminatas */}
      {activeTab === 'walks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filtrar:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="all">Todos los estados</option>
                <option value="programada">Programadas</option>
                <option value="en_curso">En Curso</option>
                <option value="completada">Completadas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {walks
              .filter((w) => filterStatus === 'all' || w.status === filterStatus)
              .map((walk) => {
                const walkFindings = findings.filter((f) => f.walk_id === walk.id);
                const findingsCount = walkFindings.filter(
                  (f) => f.finding_type !== 'reconocimiento_positivo'
                ).length;
                const kudosCount = walkFindings.filter(
                  (f) => f.finding_type === 'reconocimiento_positivo'
                ).length;

                return (
                  <div
                    key={walk.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            walk.status === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : walk.status === 'en_curso'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {walk.status === 'completada'
                            ? '✓ Completada'
                            : walk.status === 'en_curso'
                            ? '⚡ En Curso'
                            : '📅 Programada'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDate(walk.scheduled_date)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                        {walk.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{walk.area}</span>
                        {walk.focus_theme && (
                          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded ml-1">
                            {walk.focus_theme}
                          </span>
                        )}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Users size={14} className="text-slate-400" />
                          <span>{walk.walker_name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                            {findingsCount} hallazgos
                          </span>
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                            {kudosCount} kudos
                          </span>
                        </div>
                      </div>

                      {walk.summary_notes && (
                        <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 italic">
                          "{walk.summary_notes}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {walk.status !== 'completada' ? (
                        <button
                          onClick={() => setActiveRunningWalk(walk)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-600/20"
                        >
                          <Play size={14} />
                          <span>{walk.status === 'en_curso' ? 'Continuar en Piso' : 'Iniciar Ahora'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveRunningWalk(walk)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          <Footprints size={14} />
                          <span>Ver Resumen & Hallazgos</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {walks.length === 0 && !loading && (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Footprints size={40} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-700">No hay caminatas registradas</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Programa una ronda de liderazgo o inicia una caminata en terreno para capturar observaciones y dialogar con los operadores.
                </p>
                <button
                  onClick={() => setIsNewWalkModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Plus size={15} />
                  <span>+ Iniciar Primera Caminata</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Rutas Estándar */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => {
              const stations = Array.isArray(route.stations) ? route.stations : [];
              return (
                <div
                  key={route.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {route.focus_theme || 'General'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Clock size={13} />
                        <span>~{route.estimated_duration_min || 30} min</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{route.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{route.area}</p>
                    {route.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {route.description}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700 block mb-2">
                        Estaciones del Circuito ({stations.length}):
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {stations.map((st: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100"
                          >
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {st.name || `Estación ${idx + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        // Crear caminata automática en esta ruta
                        setIsNewWalkModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200"
                    >
                      <Play size={14} />
                      <span>Iniciar Ronda en esta Ruta</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {routes.length === 0 && !loading && (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
                <MapPin size={40} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-700">No hay rutas predefinidas</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Crea una ruta estándar con paradas fijas por estación para que los líderes sigan el mismo circuito en cada turno.
                </p>
                <button
                  onClick={() => setIsNewRouteModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm"
                >
                  <Plus size={15} />
                  <span>+ Crear Nueva Ruta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Hallazgos & 8 Mudas */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Desperdicio (Muda):</span>
              <select
                value={filterMuda}
                onChange={(e) => setFilterMuda(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">Todas las categorías</option>
                {Object.entries(MUDA_DEFINITIONS).map(([k, def]) => (
                  <option key={k} value={k}>
                    {def.icon} {def.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {findings.filter((f) => f.finding_type !== 'reconocimiento_positivo').length} hallazgos registrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {findings
              .filter((f) => f.finding_type !== 'reconocimiento_positivo')
              .filter((f) => filterMuda === 'all' || f.muda_category === filterMuda)
              .map((finding) => {
                const mudaInfo = finding.muda_category
                  ? MUDA_DEFINITIONS[finding.muda_category]
                  : null;

                return (
                  <div
                    key={finding.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2.5">
                        {mudaInfo ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${mudaInfo.color}`}
                          >
                            <span>{mudaInfo.icon}</span>
                            <span>{mudaInfo.label}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {finding.finding_type}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            finding.derived_type && finding.derived_type !== 'ninguna'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {finding.derived_type && finding.derived_type !== 'ninguna'
                            ? `Derivado a ${finding.derived_type.toUpperCase()}`
                            : 'Pendiente de derivar'}
                        </span>
                      </div>

                      {/* Station & Operator */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin size={13} className="text-rose-500" />
                          <span>{finding.station_name}</span>
                        </span>
                        {finding.operator_name && (
                          <span className="text-[11px] text-slate-500">
                            Operador: {finding.operator_name}
                          </span>
                        )}
                      </div>

                      {/* Image if present */}
                      {finding.image_url && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-slate-100 max-h-48 bg-slate-50">
                          <img
                            src={finding.image_url}
                            alt="Evidencia Gemba"
                            className="w-full h-40 object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {finding.description}
                      </p>

                      {finding.immediate_action && (
                        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block text-[11px]">
                            Acción Inmediata Acordada:
                          </span>
                          <span className="text-slate-600 italic">"{finding.immediate_action}"</span>
                        </div>
                      )}
                    </div>

                    {/* Derivation 1-Click Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                        Convertir Hallazgo en:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleDeriveToQuickWin(finding)}
                          disabled={finding.derived_type === 'quick_win'}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border ${
                            finding.derived_type === 'quick_win'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                          title="Crear Quick Win automático"
                        >
                          <Zap size={12} />
                          <span>Quick Win</span>
                        </button>

                        <button
                          onClick={() => handleDeriveToFiveS(finding)}
                          disabled={finding.derived_type === 'five_s'}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border ${
                            finding.derived_type === 'five_s'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Crear Tarjeta 5S"
                        >
                          <ClipboardList size={12} />
                          <span>5S</span>
                        </button>

                        <button
                          onClick={() => handleDeriveToA3(finding)}
                          disabled={finding.derived_type === 'a3'}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border ${
                            finding.derived_type === 'a3'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          }`}
                          title="Escalar a Proyecto A3 Toyota"
                        >
                          <FileText size={12} />
                          <span>A3</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab: Muro de Reconocimientos */}
      {activeTab === 'kudos' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Award size={28} />
              <h2 className="text-xl font-bold">Muro de Reconocimientos Kaizen</h2>
            </div>
            <p className="text-xs sm:text-sm text-rose-100 max-w-xl">
              "El verdadero respeto por las personas consiste en reconocer el esfuerzo de los operarios que mantienen el estándar y proponen mejoras en su estación de trabajo."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {findings
              .filter((f) => f.finding_type === 'reconocimiento_positivo')
              .map((kudo) => (
                <div
                  key={kudo.id}
                  className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full flex items-start justify-end p-2 text-rose-500">
                    <Award size={20} />
                  </div>

                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-block mb-3">
                    👏 Reconocimiento en Gemba
                  </span>

                  <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Users size={14} className="text-rose-500" />
                    <span>Operador: {kudo.operator_name || 'Equipo de Estación'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{kudo.station_name}</span>
                  </p>

                  <p className="text-xs text-slate-700 bg-rose-50/40 p-3 rounded-xl border border-rose-100 italic">
                    "{kudo.description}"
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatDate(kudo.created_at)}</span>
                    <span className="text-rose-600 font-bold">★ Estándar Cumplido</span>
                  </div>
                </div>
              ))}

            {totalKudos === 0 && (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Award size={40} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-700">Aún no hay reconocimientos registrados</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Durante tus caminatas Gemba, aprovecha de felicitar en terreno a los operadores que cuidan su puesto y respetan los estándares 5S.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dashboard LSW */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Desglose de Mudas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>Distribución de los 8 Desperdicios (Mudas)</span>
              </h3>
              <div className="space-y-2.5">
                {Object.entries(MUDA_DEFINITIONS).map(([key, def]) => {
                  const count = findings.filter((f) => f.muda_category === key).length;
                  const pct = totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0;

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <span>{def.icon}</span>
                          <span>{def.label}</span>
                        </span>
                        <span className="text-slate-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rutina de Liderazgo */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <span>Disciplina de Liderazgo (Leader Standard Work)</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  El cumplimiento regular de caminatas asegura que los líderes conozcan la realidad del piso de planta y apoyen a sus equipos diariamente.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] text-slate-400 font-bold block">TASA DE CUMPLIMIENTO</span>
                    <span className="text-2xl font-extrabold text-slate-900">{completionRate}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[11px] text-slate-400 font-bold block">TASA DE RESOLUCIÓN</span>
                    <span className="text-2xl font-extrabold text-emerald-700">
                      {totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
                <span className="font-bold block mb-1">💡 Principio Toyota de Gemba:</span>
                "No camines para buscar culpables ni para castigar. Camina para comprender el proceso, eliminar obstáculos y desarrollar la capacidad de resolución de problemas en las personas."
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Programar / Iniciar Nueva Caminata */}
      {isNewWalkModalOpen && (
        <NewWalkModal
          routes={routes}
          onClose={() => setIsNewWalkModalOpen(false)}
          onCreated={(walk) => {
            setIsNewWalkModalOpen(false);
            loadData();
            setActiveRunningWalk(walk);
          }}
        />
      )}

      {/* Modal: Crear Nueva Ruta */}
      {isNewRouteModalOpen && (
        <NewRouteModal
          onClose={() => setIsNewRouteModalOpen(false)}
          onCreated={() => {
            setIsNewRouteModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* Runner en Piso (Gemba Execution Modal) */}
      {activeRunningWalk && (
        <GembaRunnerModal
          walk={activeRunningWalk}
          routes={routes}
          onClose={() => {
            setActiveRunningWalk(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponente: Modal Crear Caminata
// -------------------------------------------------------------
const NewWalkModal: React.FC<{
  routes: GembaRoute[];
  onClose: () => void;
  onCreated: (walk: GembaWalk) => void;
}> = ({ routes, onClose, onCreated }) => {
  const { user, activeCompanyId } = useAuth();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('Planta Principal');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [walkerName, setWalkerName] = useState(user?.name || '');
  const [focusTheme, setFocusTheme] = useState('Seguridad y 5S');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
      setTitle(`Caminata: ${routes[0].name}`);
      setArea(routes[0].area);
      if (routes[0].focus_theme) setFocusTheme(routes[0].focus_theme);
    }
  }, [routes]);

  const handleRouteChange = (rId: string) => {
    setSelectedRouteId(rId);
    const r = routes.find((x) => x.id === rId);
    if (r) {
      setTitle(`Caminata: ${r.name}`);
      setArea(r.area);
      if (r.focus_theme) setFocusTheme(r.focus_theme);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Ingresa un título para la caminata');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Iniciando caminata...');
    try {
      const companyId = activeCompanyId || user?.companyId;
      const payload = {
        company_id: companyId,
        route_id: selectedRouteId || null,
        title: title.trim(),
        area: area.trim(),
        walker_id: user?.id || null,
        walker_name: walkerName.trim() || user?.name || 'Líder Gemba',
        scheduled_date: new Date().toISOString().split('T')[0],
        status: 'en_curso',
        start_time: new Date().toISOString(),
        focus_theme: focusTheme,
      };

      const { data, error } = await supabase
        .from('gemba_walks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast.success('¡Caminata iniciada! Modo piso activo.', { id: toastId });
      onCreated(data as GembaWalk);
    } catch (err: any) {
      console.error('Error creating walk:', err);
      toast.error(err?.message || 'Error al iniciar caminata', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Footprints size={18} className="text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Iniciar Gemba Walk</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {routes.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ruta Estándar (opcional)
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Sin ruta fija / Ruta libre --</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.area})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título de la Caminata *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Caminata Turno Mañana Línea 1"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Área / Nave</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Líder Caminante</label>
              <input
                type="text"
                value={walkerName}
                onChange={(e) => setWalkerName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tema Foco de la Ronda</label>
            <select
              value={focusTheme}
              onChange={(e) => setFocusTheme(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
            >
              <option value="Seguridad y 5S">Seguridad y 5S en Piso</option>
              <option value="Flujo y Tiempos de Ciclo">Flujo de Proceso y Esperas</option>
              <option value="Calidad y Estandarización">Calidad y Cumplimiento de Estándar</option>
              <option value="Ergonomía y Ambiente">Ergonomía y Condiciones de Trabajo</option>
              <option value="General">Observación General de Planta</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Iniciando...' : 'Comenzar Caminata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponente: Modal Crear Ruta Estándar
// -------------------------------------------------------------
const NewRouteModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const { user, activeCompanyId } = useAuth();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [focusTheme, setFocusTheme] = useState('Seguridad y 5S');
  const [duration, setDuration] = useState(30);
  const [stationsText, setStationsText] = useState(
    '1. Recepción de Materia Prima\n2. Línea de Envasado 1\n3. Línea de Envasado 2\n4. Control de Calidad\n5. Zona de Despacho'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre de la ruta');
      return;
    }

    const stationsList = stationsText
      .split('\n')
      .map((line) => line.replace(/^[0-9]+[\.\-\)]\s*/, '').trim())
      .filter(Boolean)
      .map((stName, idx) => ({
        id: `st_${idx + 1}`,
        name: stName,
        area: area || 'Planta',
        orderIndex: idx + 1,
      }));

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando ruta...');
    try {
      const companyId = activeCompanyId || user?.companyId;
      const { error } = await supabase.from('gemba_routes').insert([
        {
          company_id: companyId,
          name: name.trim(),
          area: area.trim() || 'Planta Principal',
          focus_theme: focusTheme,
          estimated_duration_min: Number(duration) || 30,
          stations: stationsList,
          is_active: true,
        },
      ]);

      if (error) throw error;
      toast.success('¡Ruta creada exitosamente!', { id: toastId });
      onCreated();
    } catch (err: any) {
      console.error('Error creating route:', err);
      toast.error(err?.message || 'Error al crear ruta', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Crear Ruta Estándar</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre de la Ruta *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Circuito Productivo Línea 1 y Bodega"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Área</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej: Nave Central"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Duración (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Estaciones / Paradas del Circuito (una por línea)
            </label>
            <textarea
              rows={5}
              value={stationsText}
              onChange={(e) => setStationsText(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-[11px] focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Define el orden secuencial en el que el líder caminará por las estaciones.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Ruta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponente: Runner en Piso (Gemba Runner Modal)
// -------------------------------------------------------------
const GembaRunnerModal: React.FC<{
  walk: GembaWalk;
  routes: GembaRoute[];
  onClose: () => void;
}> = ({ walk, routes, onClose }) => {
  const { user } = useAuth();
  const currentRoute = routes.find((r) => r.id === walk.route_id);
  const stations: GembaStation[] = Array.isArray(currentRoute?.stations)
    ? currentRoute!.stations
    : [
        { id: 'st_1', name: 'Estación 1', area: walk.area, orderIndex: 1 },
        { id: 'st_2', name: 'Estación 2', area: walk.area, orderIndex: 2 },
      ];

  const [currentStationIdx, setCurrentStationIdx] = useState(0);
  const activeStation = stations[currentStationIdx] || {
    name: 'Piso de Planta',
    area: walk.area,
  };

  // Estado para capturar hallazgo en la estación actual
  const [findingType, setFindingType] = useState<GembaFindingType>('desperdicio_muda');
  const [mudaCategory, setMudaCategory] = useState<GembaMudaCategory>('espera');
  const [description, setDescription] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSavingFinding, setIsSavingFinding] = useState(false);

  // Asistente IA de preguntas
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [walkFindings, setWalkFindings] = useState<GembaFinding[]>([]);

  // Cargar hallazgos de esta caminata
  const loadWalkFindings = async () => {
    const { data } = await supabase
      .from('gemba_findings')
      .select('*')
      .eq('walk_id', walk.id)
      .order('created_at', { ascending: false });
    if (data) setWalkFindings(data as GembaFinding[]);
  };

  useEffect(() => {
    loadWalkFindings();
  }, [walk.id]);

  // Generar preguntas socráticas con IA para la estación actual
  const handleAskAiCoach = async () => {
    setIsGeneratingAi(true);
    try {
      // Preguntas predefinidas inteligentes según el tema para respuesta inmediata
      const fallbackSet = [
        `¿Cómo sabes en este momento si la estación ${activeStation.name} va al ritmo planificado o está retrasada?`,
        `¿Cuál es el paso más difícil o con mayor probabilidad de error en el estándar de esta operación?`,
        `¿Qué herramienta, material o espera te detuvo o te hizo perder tiempo durante el último turno?`,
      ];

      // Si existe clave de Gemini, podemos enriquecer con API
      const geminiKey =
        (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null) ||
        import.meta.env.VITE_GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const prompt = `Actúa como un experto consultor Lean Manufacturing en un Gemba Walk (Toyota Production System).
El líder está en la estación "${activeStation.name}" (Área: ${walk.area}, Tema foco: ${walk.focus_theme || 'General'}).
Genera exactamente 3 preguntas socráticas abiertas (Kata Coaching) que el líder debe hacerle amablemente al operador para detectar causas raíz de desperdicio y verificar el estándar.
Devuelve sólo las 3 preguntas numeradas, sin introducción ni despedida.`;

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
              }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const lines = text
                .split('\n')
                .map((l: string) => l.replace(/^[0-9]+[\.\-\)]\s*/, '').trim())
                .filter(Boolean);
              if (lines.length >= 2) {
                setAiQuestions(lines.slice(0, 3));
                setIsGeneratingAi(false);
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Fallback a preguntas locales:', e);
        }
      }

      setAiQuestions(fallbackSet);
    } catch (err) {
      console.error('Error generando preguntas:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Guardar Hallazgo
  const handleSaveFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Ingresa la descripción del hallazgo o felicitación');
      return;
    }

    setIsSavingFinding(true);
    const toastId = toast.loading('Registrando en piso...');
    try {
      const payload = {
        company_id: walk.company_id,
        walk_id: walk.id,
        station_name: activeStation.name,
        operator_name: operatorName.trim() || null,
        finding_type: findingType,
        muda_category: findingType === 'desperdicio_muda' ? mudaCategory : null,
        description: description.trim(),
        image_url: imageUrl.trim() || null,
        immediate_action: immediateAction.trim() || null,
        status: 'abierto',
      };

      const { error } = await supabase.from('gemba_findings').insert([payload]);
      if (error) throw error;

      toast.success('¡Registro guardado en esta estación!', { id: toastId });
      setDescription('');
      setImmediateAction('');
      setImageUrl('');
      await loadWalkFindings();
    } catch (err: any) {
      console.error('Error saving finding:', err);
      toast.error(err?.message || 'Error al guardar hallazgo', { id: toastId });
    } finally {
      setIsSavingFinding(false);
    }
  };

  // Finalizar Caminata
  const handleFinishWalk = async () => {
    const summary = window.prompt(
      'Ingresa un breve resumen de cierre o compromisos del líder para esta caminata:',
      'Ronda completada con éxito. Se identificaron oportunidades de mejora y se conversó con los operadores.'
    );

    if (summary === null) return;

    try {
      await supabase
        .from('gemba_walks')
        .update({
          status: 'completada',
          end_time: new Date().toISOString(),
          summary_notes: summary,
        })
        .eq('id', walk.id);

      toast.success('¡Caminata Gemba completada con éxito!');
      onClose();
    } catch (err) {
      console.error('Error closing walk:', err);
      toast.error('Error al finalizar caminata');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto">
        {/* Runner Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <Footprints size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-rose-400 font-bold">
                  Modo Piso de Planta
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-base sm:text-lg font-bold">{walk.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFinishWalk}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              ✓ Finalizar Caminata
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Station Navigation Bar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-rose-600" />
            <span className="text-xs font-bold text-slate-700">Estación Actual:</span>
            <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {activeStation.name} ({currentStationIdx + 1} de {stations.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentStationIdx === 0}
              onClick={() => setCurrentStationIdx((prev) => Math.max(0, prev - 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
            >
              ← Anterior
            </button>
            <button
              disabled={currentStationIdx >= stations.length - 1}
              onClick={() => setCurrentStationIdx((prev) => Math.min(stations.length - 1, prev + 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Runner Body */}
        <div className="p-6 overflow-y-auto space-y-6 grow">
          {/* Box de Preguntas Socráticas con IA */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-4 rounded-2xl border border-indigo-100 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-900">
                  Coach IA: Preguntas de Diálogo en Terreno (Kata Coaching)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAskAiCoach}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles size={13} className={isGeneratingAi ? 'animate-spin' : ''} />
                <span>{isGeneratingAi ? 'Consultando IA...' : 'Generar Preguntas'}</span>
              </button>
            </div>

            {aiQuestions.length > 0 ? (
              <div className="space-y-1.5 mt-3">
                {aiQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-indigo-700/80 mt-1">
                Presiona "Generar Preguntas" para que la IA sugiera 3 preguntas abiertas clave para hacerle al operador de esta estación sin juzgar.
              </p>
            )}
          </div>

          {/* Formulario de Captura de Hallazgo en esta Estación */}
          <form
            onSubmit={handleSaveFinding}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Camera size={16} className="text-rose-500" />
                <span>Registrar Observación en: {activeStation.name}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFindingType('desperdicio_muda')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs ${
                    findingType === 'desperdicio_muda'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  ⚠️ Desperdicio (Muda)
                </button>
                <button
                  type="button"
                  onClick={() => setFindingType('reconocimiento_positivo')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs ${
                    findingType === 'reconocimiento_positivo'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👏 Reconocimiento Positivo
                </button>
              </div>
            </div>

            {findingType === 'desperdicio_muda' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Categoría de Desperdicio (8 Mudas):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(MUDA_DEFINITIONS).map(([key, def]) => {
                    const isSelected = mudaCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMudaCategory(key as GembaMudaCategory)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? `${def.color} font-bold ring-2 ring-rose-400`
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base">{def.icon}</span>
                        <span className="text-[11px] truncate">{def.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Operador entrevistado</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ej: Juan Pérez / Operador de Envasado"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL de Foto / Evidencia</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... o foto de cámara"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {findingType === 'reconocimiento_positivo'
                  ? 'Descripción del Reconocimiento / Buena Práctica *'
                  : 'Descripción del Desperdicio o Anomalía Observada *'}
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  findingType === 'reconocimiento_positivo'
                    ? 'Ej: El operador mantiene el puesto limpio, herramientas rotuladas y sugirió una mejora en la guía de entrada...'
                    : 'Ej: Se observó acumulación de 15 bandejas detenidas esperando etiquetado por falta de insumo...'
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>

            {findingType !== 'reconocimiento_positivo' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Acción Inmediata o Compromiso del Líder
                </label>
                <input
                  type="text"
                  value={immediateAction}
                  onChange={(e) => setImmediateAction(e.target.value)}
                  placeholder="Ej: Coordinar con bodega abastecimiento cada 30 min / Reparar tope"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingFinding}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSavingFinding ? 'Guardando...' : 'Guardar Hallazgo en Estación'}</span>
              </button>
            </div>
          </form>

          {/* Historial de Hallazgos en esta Caminata */}
          {walkFindings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Registros Capturados en esta Ronda ({walkFindings.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {walkFindings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {f.station_name} •{' '}
                        <span className="text-slate-500 font-normal">
                          {f.finding_type === 'reconocimiento_positivo'
                            ? '👏 Reconocimiento'
                            : `⚠️ ${f.muda_category || 'Muda'}`}
                        </span>
                      </span>
                      <p className="text-slate-600 line-clamp-1 mt-0.5">{f.description}</p>
                    </div>
                    {f.operator_name && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {f.operator_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GembaPage;
