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
  GembaCommitmentMeta,
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
  Handshake,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

// -------------------------------------------------------------
// Helpers de Pacto de Compromiso en Terreno (Mano Estrechada)
// -------------------------------------------------------------
const addDaysToIsoDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const parseCommitmentMeta = (finding: GembaFinding): GembaCommitmentMeta | null => {
  if (!finding.audio_note_url) return null;
  try {
    const parsed = JSON.parse(finding.audio_note_url);
    if (parsed && typeof parsed === 'object' && parsed.isHandshake) {
      return parsed as GembaCommitmentMeta;
    }
  } catch {
    // No es JSON de compromiso
  }
  return null;
};

const serializeCommitmentMeta = (meta: GembaCommitmentMeta): string => {
  return JSON.stringify(meta);
};

const getCommitmentStatusInfo = (meta: GembaCommitmentMeta, findingStatus: string) => {
  if (findingStatus === 'cerrado' || meta.completedAt) {
    return {
      label: '✅ Compromiso Cumplido',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isOverdue: false,
      isCompleted: true,
    };
  }
  const todayStr = new Date().toISOString().split('T')[0];
  if (meta.dueDate < todayStr) {
    return {
      label: `⏰ Compromiso vencido (${formatDate(meta.dueDate)})`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      isOverdue: true,
      isCompleted: false,
    };
  }
  if (meta.dueDate === todayStr) {
    return {
      label: '🤝 Compromiso para HOY',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      isOverdue: false,
      isCompleted: false,
    };
  }
  return {
    label: `🤝 Pactado: ${meta.daysAgreed === 1 ? '1 día' : `${meta.daysAgreed} días`} (${formatDate(meta.dueDate)})`,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    isOverdue: false,
    isCompleted: false,
  };
};

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

// -------------------------------------------------------------
// Helper para Comprimir y Subir Fotos (Rutas Estándar y Evidencias Gemba)
// -------------------------------------------------------------
const compressGembaImage = (
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.78
): Promise<{ file: File; fallbackDataUrl: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve({ file: compressedFile, fallbackDataUrl: dataUrl });
            } else {
              resolve({ file, fallbackDataUrl: dataUrl });
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve({ file, fallbackDataUrl: (reader.result as string) || '' });
        reader.readAsDataURL(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve({ file, fallbackDataUrl: (reader.result as string) || '' });
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
};

const uploadGembaImage = async (
  rawFile: File,
  companyId?: string | null
): Promise<string | null> => {
  let fileToUpload = rawFile;
  let fallbackDataUrl = '';
  try {
    const comp = await compressGembaImage(rawFile);
    fileToUpload = comp.file;
    fallbackDataUrl = comp.fallbackDataUrl;

    const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const companyPath = companyId || 'global';
    const filePath = `${companyPath}/gemba/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('five-s-images')
      .upload(filePath, fileToUpload, { cacheControl: '31536000', upsert: true });

    if (uploadError) {
      const { error: fallbackErr } = await supabase.storage
        .from('images')
        .upload(`gemba/${filePath}`, fileToUpload, { cacheControl: '31536000', upsert: true });

      if (!fallbackErr) {
        const { data } = supabase.storage.from('images').getPublicUrl(`gemba/${filePath}`);
        return data.publicUrl;
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn('Upload fallback a DataURL:', err);
    return fallbackDataUrl || null;
  }
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
  const [filterOnlyHandshake, setFilterOnlyHandshake] = useState<boolean>(false);
  const [uploadingFulfillId, setUploadingFulfillId] = useState<string | null>(null);

  // Modales
  const [isNewWalkModalOpen, setIsNewWalkModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<GembaRoute | null>(null);
  const [activeRunningWalk, setActiveRunningWalk] = useState<GembaWalk | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // Cumplir Compromiso de Mano Estrechada (Cierra oportunidad + Crea Reconocimiento Automático)
  const handleFulfillCommitment = async (finding: GembaFinding, afterImageUrl?: string) => {
    const toastId = toast.loading('Registrando compromiso cumplido y creando reconocimiento...');
    try {
      const existingMeta = parseCommitmentMeta(finding);
      const updatedMeta: GembaCommitmentMeta = {
        isHandshake: true,
        daysAgreed: existingMeta?.daysAgreed ?? 2,
        dueDate: existingMeta?.dueDate || new Date().toISOString().split('T')[0],
        leaderSupport: existingMeta?.leaderSupport || '',
        completedAt: new Date().toISOString(),
        afterImageUrl: afterImageUrl || existingMeta?.afterImageUrl || null,
      };

      const { error: updateErr } = await supabase
        .from('gemba_findings')
        .update({
          status: 'cerrado',
          audio_note_url: serializeCommitmentMeta(updatedMeta),
        })
        .eq('id', finding.id);

      if (updateErr) throw updateErr;

      // Crear reconocimiento automático en el Muro de Reconocimientos Kaizen
      const plazoTexto =
        updatedMeta.daysAgreed === 0
          ? 'el mismo día'
          : updatedMeta.daysAgreed === 1
          ? 'en 1 día'
          : `en ${updatedMeta.daysAgreed} días`;

      const kudoPayload = {
        company_id: finding.company_id || activeCompanyId || user?.companyId,
        walk_id: finding.walk_id,
        station_name: finding.station_name,
        operator_name: finding.operator_name || 'Operador de Estación',
        finding_type: 'reconocimiento_positivo',
        muda_category: null,
        description: `🤝 Compromiso de palabra cumplido (${plazoTexto}): Propuesto y resuelto por ${
          finding.operator_name || 'el operador'
        }. Mejora lograda: "${finding.immediate_action || finding.description}"`,
        image_url: afterImageUrl || finding.image_url || null,
        status: 'cerrado',
      };

      await supabase.from('gemba_findings').insert([kudoPayload]);

      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(
        '🤝 ¡Compromiso cumplido! Se publicó automáticamente en el Muro de Reconocimientos.',
        { id: toastId, duration: 4500 }
      );
      await loadData();
    } catch (err: any) {
      console.error('Error fulfilling commitment:', err);
      toast.error(err?.message || 'Error al registrar cumplimiento', { id: toastId });
    }
  };

  const handleUploadAndFulfillCard = async (finding: GembaFinding, file?: File) => {
    if (!file) return;
    setUploadingFulfillId(finding.id);
    const toastId = toast.loading('Subiendo foto de la mejora implementada...');
    try {
      const companyId = finding.company_id || activeCompanyId || user?.companyId;
      const url = await uploadGembaImage(file, companyId);
      toast.dismiss(toastId);
      await handleFulfillCommitment(finding, url || undefined);
    } catch (err) {
      toast.error('Error al subir foto', { id: toastId });
    } finally {
      setUploadingFulfillId(null);
    }
  };

  // Métricas LSW
  const totalWalks = walks.length;
  const completedWalks = walks.filter((w) => w.status === 'completada').length;
  const completionRate = totalWalks > 0 ? Math.round((completedWalks / totalWalks) * 100) : 0;
  const totalFindings = findings.filter((f) => f.finding_type !== 'reconocimiento_positivo').length;
  const totalKudos = findings.filter((f) => f.finding_type === 'reconocimiento_positivo').length;
  const resolvedFindings = findings.filter((f) => f.status === 'cerrado' || f.derived_type !== 'ninguna').length;
  const totalHandshakeCommitments = findings.filter((f) => parseCommitmentMeta(f)?.isHandshake).length;

  return (
    <>
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingRoute(null);
              setIsNewRouteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <MapPin size={14} />
            <span>+ Nueva Ruta</span>
          </button>

          <button
            onClick={() => setIsNewWalkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>+ Iniciar Caminata</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
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
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'walks'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
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
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'routes'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
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
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'findings'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
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
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'kudos'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
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
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'kpis'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
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
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Play size={14} />
                          <span>{walk.status === 'en_curso' ? 'Continuar en Piso' : 'Iniciar Ahora'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveRunningWalk(walk)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
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
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                >
                  <Plus size={14} />
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
              const stationsWithPhoto = stations.filter((s: any) => s.standardImageUrl).length;
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
                      <div className="flex items-center gap-2">
                        {stationsWithPhoto > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Camera size={11} />
                            <span>{stationsWithPhoto}/{stations.length} Fotos Estándar</span>
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock size={13} />
                          <span>~{route.estimated_duration_min || 30} min</span>
                        </span>
                      </div>
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
                        Estaciones y Estándar Visual ({stations.length}):
                      </span>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {stations.map((st: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 truncate block">
                                  {st.name || `Estación ${idx + 1}`}
                                </span>
                                {st.standardNotes && (
                                  <span className="text-[10px] text-slate-500 truncate block">
                                    ✓ {st.standardNotes}
                                  </span>
                                )}
                              </div>
                            </div>
                            {st.standardImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(st.standardImageUrl)}
                                className="shrink-0 relative group rounded-md overflow-hidden border border-emerald-200 w-9 h-9 bg-white"
                                title="Ver foto de referencia del estándar"
                              >
                                <img
                                  src={st.standardImageUrl}
                                  alt={st.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                              </button>
                            ) : (
                              <span
                                className="text-[10px] text-slate-400 shrink-0 italic px-1.5 py-0.5 rounded bg-slate-100"
                                title="Sin foto del estándar aún"
                              >
                                Sin foto
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingRoute(route);
                        setIsNewRouteModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all"
                      title="Configurar estaciones y subir fotos del estándar ideal"
                    >
                      <Camera size={13} className="text-blue-600" />
                      <span>Fotos del Estándar</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsNewWalkModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Play size={14} />
                      <span>Iniciar Ronda</span>
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
                  Crea una ruta estándar con paradas fijas y fotos de cómo debe lucir cada estación para facilitar la comparación visual en terreno.
                </p>
                <button
                  onClick={() => {
                    setEditingRoute(null);
                    setIsNewRouteModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                >
                  <Plus size={14} />
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

              <button
                type="button"
                onClick={() => setFilterOnlyHandshake((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filterOnlyHandshake
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Handshake size={14} />
                <span>🤝 Sólo Compromisos Pactados ({totalHandshakeCommitments})</span>
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {findings.filter((f) => f.finding_type !== 'reconocimiento_positivo').length} hallazgos registrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {findings
              .filter((f) => f.finding_type !== 'reconocimiento_positivo')
              .filter((f) => filterMuda === 'all' || f.muda_category === filterMuda)
              .filter((f) => !filterOnlyHandshake || Boolean(parseCommitmentMeta(f)?.isHandshake))
              .map((finding) => {
                const mudaInfo = finding.muda_category
                  ? MUDA_DEFINITIONS[finding.muda_category]
                  : null;
                const commitmentMeta = parseCommitmentMeta(finding);
                const commitmentStatus = commitmentMeta
                  ? getCommitmentStatusInfo(commitmentMeta, finding.status)
                  : null;

                return (
                  <div
                    key={finding.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      commitmentMeta?.isHandshake
                        ? commitmentStatus?.isCompleted
                          ? 'border-emerald-200'
                          : 'border-indigo-200 ring-1 ring-indigo-100'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
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

                        {commitmentStatus ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${commitmentStatus.badgeClass}`}
                          >
                            {commitmentStatus.label}
                          </span>
                        ) : (
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
                        )}
                      </div>

                      {/* Station & Operator */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin size={13} className="text-rose-500" />
                          <span>{finding.station_name}</span>
                        </span>
                        {finding.operator_name && (
                          <span className="text-[11px] font-semibold text-slate-700">
                            👤 {finding.operator_name}
                          </span>
                        )}
                      </div>

                      {/* Image(s) if present */}
                      {(finding.image_url || commitmentMeta?.afterImageUrl) && (
                        <div
                          className={`mb-3 grid gap-2 ${
                            finding.image_url && commitmentMeta?.afterImageUrl
                              ? 'grid-cols-2'
                              : 'grid-cols-1'
                          }`}
                        >
                          {finding.image_url && (
                            <div
                              onClick={() => setPreviewImage(finding.image_url || null)}
                              className="rounded-xl overflow-hidden border border-slate-100 max-h-44 bg-slate-50 cursor-pointer relative group"
                            >
                              <img
                                src={finding.image_url}
                                alt="Evidencia Antes"
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-slate-900/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Antes
                              </span>
                            </div>
                          )}
                          {commitmentMeta?.afterImageUrl && (
                            <div
                              onClick={() =>
                                setPreviewImage(commitmentMeta.afterImageUrl || null)
                              }
                              className="rounded-xl overflow-hidden border border-emerald-200 max-h-44 bg-emerald-50 cursor-pointer relative group"
                            >
                              <img
                                src={commitmentMeta.afterImageUrl}
                                alt="Evidencia Después"
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-emerald-700/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                ✓ Después
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {finding.description}
                      </p>

                      {finding.immediate_action && (
                        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block text-[11px]">
                            Idea de Mejora Acordada con el Operador:
                          </span>
                          <span className="text-slate-600 italic">"{finding.immediate_action}"</span>
                        </div>
                      )}

                      {/* Tarjeta de Pacto de Mano Estrechada */}
                      {commitmentMeta?.isHandshake && (
                        <div
                          className={`mt-3 p-3 rounded-xl border text-xs space-y-2 ${
                            commitmentStatus?.isCompleted
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-[11px] flex items-center gap-1.5">
                              <Handshake size={14} className="text-indigo-600 shrink-0" />
                              <span>
                                Pacto de Mano Estrechada (
                                {commitmentMeta.daysAgreed === 0
                                  ? 'Mismo día'
                                  : commitmentMeta.daysAgreed === 1
                                  ? '1 día'
                                  : `${commitmentMeta.daysAgreed} días`}
                                )
                              </span>
                            </span>
                            <span className="text-[10px] font-bold opacity-80">
                              Meta: {formatDate(commitmentMeta.dueDate)}
                            </span>
                          </div>

                          {commitmentMeta.leaderSupport && (
                            <p className="text-[11px] text-indigo-800 bg-white/80 px-2 py-1 rounded-lg border border-indigo-100">
                              <span className="font-bold">Apoyo del líder:</span>{' '}
                              {commitmentMeta.leaderSupport}
                            </p>
                          )}

                          {!commitmentStatus?.isCompleted ? (
                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleFulfillCommitment(finding)}
                                className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition-all shadow-2xs"
                              >
                                <Check size={12} />
                                <span>¡Cumplió! Reconocer</span>
                              </button>
                              <label className="py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all">
                                <Camera size={12} />
                                <span>
                                  {uploadingFulfillId === finding.id
                                    ? 'Subiendo...'
                                    : '+ Foto Después'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  disabled={uploadingFulfillId === finding.id}
                                  onChange={(e) =>
                                    handleUploadAndFulfillCard(finding, e.target.files?.[0])
                                  }
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <Award size={13} className="text-rose-500" />
                              <span>
                                Cumplido y publicado en el Muro de Reconocimientos
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Derivation 1-Click Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                        Convertir Oportunidad en:
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
              "El verdadero respeto por las personas consiste en reconocer el esfuerzo de los operarios que mantienen el estándar y co-crean mejoras en su estación de trabajo."
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

                  {kudo.image_url && (
                    <div
                      onClick={() => setPreviewImage(kudo.image_url || null)}
                      className="mb-3 rounded-xl overflow-hidden border border-rose-100 max-h-44 bg-rose-50/30 cursor-pointer group"
                    >
                      <img
                        src={kudo.image_url}
                        alt="Evidencia Reconocimiento"
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

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
                  Durante tus caminatas Gemba, aprovecha de felicitar en terreno con evidencia fotográfica a los operadores que cuidan su puesto y proponen mejoras.
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
                <span className="font-bold block mb-1">💡 Filosofía de Diálogo y Causa Raíz en Gemba:</span>
                "Más que decirle a un operario que algo está mal o que no cumple con el estándar, pregúntale: «Mira, veo que esto podría mejorar, ¿crees que exista una manera de mejorar esto? ¿Qué origina el problema para eliminar la causa raíz?»"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Lightbox para Ampliar Fotos de Estándar o Evidencia */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 !mt-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 text-white border-b border-slate-800">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera size={15} className="text-rose-400" />
                <span>Vista Ampliada de Fotografía Gemba / Estándar Visual</span>
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[80vh]">
              <img
                src={previewImage}
                alt="Vista ampliada"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
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

      {/* Modal: Crear o Editar Ruta Estándar con Fotos */}
      {isNewRouteModalOpen && (
        <NewRouteModal
          routeToEdit={editingRoute}
          onClose={() => {
            setIsNewRouteModalOpen(false);
            setEditingRoute(null);
          }}
          onCreated={() => {
            setIsNewRouteModalOpen(false);
            setEditingRoute(null);
            loadData();
          }}
        />
      )}

      {/* Runner en Piso (Gemba Execution Modal) */}
      {activeRunningWalk && (
        <GembaRunnerModal
          walk={activeRunningWalk}
          routes={routes}
          allFindings={findings}
          onFulfillCommitment={handleFulfillCommitment}
          onRoutesUpdated={loadData}
          onClose={() => {
            setActiveRunningWalk(null);
            loadData();
          }}
        />
      )}
    </>
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
    <div className="fixed inset-0 !mt-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
// Subcomponente: Modal Crear / Editar Ruta Estándar con Fotos por Estación
// -------------------------------------------------------------
const NewRouteModal: React.FC<{
  routeToEdit?: GembaRoute | null;
  onClose: () => void;
  onCreated: () => void;
}> = ({ routeToEdit, onClose, onCreated }) => {
  const { user, activeCompanyId } = useAuth();
  const [name, setName] = useState(routeToEdit?.name || '');
  const [area, setArea] = useState(routeToEdit?.area || '');
  const [focusTheme, setFocusTheme] = useState(routeToEdit?.focus_theme || 'Seguridad y 5S');
  const [duration, setDuration] = useState(routeToEdit?.estimated_duration_min || 30);

  const [stations, setStations] = useState<GembaStation[]>(() => {
    if (routeToEdit && Array.isArray(routeToEdit.stations) && routeToEdit.stations.length > 0) {
      return routeToEdit.stations.map((st, idx) => ({
        id: st.id || `st_${idx + 1}`,
        name: st.name || `Estación ${idx + 1}`,
        area: st.area || routeToEdit.area || 'Planta',
        orderIndex: idx + 1,
        standardNotes: st.standardNotes || '',
        standardImageUrl: st.standardImageUrl || '',
      }));
    }
    return [
      {
        id: 'st_1',
        name: 'Recepción de Materia Prima',
        area: 'Planta',
        orderIndex: 1,
        standardNotes: 'Pasillos despejados, pallets demarcados y sin material fuera de zona',
        standardImageUrl: '',
      },
      {
        id: 'st_2',
        name: 'Línea de Proceso Principal',
        area: 'Planta',
        orderIndex: 2,
        standardNotes: 'Herramientas en panel sombra, flujo continuo sin bandejas acumuladas',
        standardImageUrl: '',
      },
      {
        id: 'st_3',
        name: 'Control de Calidad y Despacho',
        area: 'Planta',
        orderIndex: 3,
        standardNotes: 'Estación limpia, patrones visuales vigentes y etiquetas al día',
        standardImageUrl: '',
      },
    ];
  });

  const [uploadingStationIdx, setUploadingStationIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStationFieldChange = (
    idx: number,
    field: keyof GembaStation,
    value: string
  ) => {
    setStations((prev) =>
      prev.map((st, i) => (i === idx ? { ...st, [field]: value } : st))
    );
  };

  const handleAddStation = () => {
    setStations((prev) => [
      ...prev,
      {
        id: `st_${Date.now()}_${prev.length + 1}`,
        name: `Estación ${prev.length + 1}`,
        area: area || 'Planta',
        orderIndex: prev.length + 1,
        standardNotes: '',
        standardImageUrl: '',
      },
    ]);
  };

  const handleRemoveStation = (idx: number) => {
    if (stations.length <= 1) {
      toast.error('La ruta debe tener al menos 1 estación');
      return;
    }
    setStations((prev) =>
      prev.filter((_, i) => i !== idx).map((st, i) => ({ ...st, orderIndex: i + 1 }))
    );
  };

  const handleUploadStationPhoto = async (idx: number, file?: File) => {
    if (!file) return;
    setUploadingStationIdx(idx);
    const toastId = toast.loading('Subiendo foto del estándar...');
    try {
      const companyId = activeCompanyId || user?.companyId;
      const url = await uploadGembaImage(file, companyId);
      if (url) {
        handleStationFieldChange(idx, 'standardImageUrl', url);
        toast.success('Foto del estándar cargada', { id: toastId });
      } else {
        toast.error('No se pudo procesar la imagen', { id: toastId });
      }
    } catch (err) {
      console.error('Error uploading station standard image:', err);
      toast.error('Error al subir imagen', { id: toastId });
    } finally {
      setUploadingStationIdx(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre de la ruta');
      return;
    }

    const cleanedStations = stations
      .filter((st) => st.name.trim())
      .map((st, idx) => ({
        id: st.id || `st_${idx + 1}`,
        name: st.name.trim(),
        area: area.trim() || st.area || 'Planta',
        orderIndex: idx + 1,
        standardNotes: st.standardNotes?.trim() || '',
        standardImageUrl: st.standardImageUrl || '',
      }));

    if (cleanedStations.length === 0) {
      toast.error('Agrega al menos una estación válida');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      routeToEdit ? 'Actualizando ruta y estándares...' : 'Guardando ruta...'
    );
    try {
      const companyId = activeCompanyId || user?.companyId;
      if (routeToEdit) {
        const { error } = await supabase
          .from('gemba_routes')
          .update({
            name: name.trim(),
            area: area.trim() || 'Planta Principal',
            focus_theme: focusTheme,
            estimated_duration_min: Number(duration) || 30,
            stations: cleanedStations,
          })
          .eq('id', routeToEdit.id);

        if (error) throw error;
        toast.success('¡Ruta y fotos del estándar actualizadas!', { id: toastId });
      } else {
        const { error } = await supabase.from('gemba_routes').insert([
          {
            company_id: companyId,
            name: name.trim(),
            area: area.trim() || 'Planta Principal',
            focus_theme: focusTheme,
            estimated_duration_min: Number(duration) || 30,
            stations: cleanedStations,
            is_active: true,
          },
        ]);

        if (error) throw error;
        toast.success('¡Ruta creada exitosamente!', { id: toastId });
      }
      onCreated();
    } catch (err: any) {
      console.error('Error saving route:', err);
      toast.error(err?.message || 'Error al guardar ruta', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 !mt-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {routeToEdit
                  ? 'Configurar Ruta y Fotos del Estándar Ideal'
                  : 'Crear Ruta Estándar con Referencia Visual'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Sube una foto por estación de cómo debe lucir el estándar para comparar en terreno sin fricción.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto grow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tema Foco</label>
              <select
                value={focusTheme}
                onChange={(e) => setFocusTheme(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="Seguridad y 5S">Seguridad y 5S en Piso</option>
                <option value="Flujo y Tiempos de Ciclo">Flujo de Proceso y Esperas</option>
                <option value="Calidad y Estandarización">Calidad y Cumplimiento de Estándar</option>
                <option value="Ergonomía y Ambiente">Ergonomía y Condiciones de Trabajo</option>
                <option value="General">Observación General de Planta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Área / Nave</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ej: Nave Central"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Duración Estimada (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Constructor Visual de Estaciones */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block font-bold text-slate-800 text-xs">
                  Estaciones del Circuito y Estándar Visual ({stations.length})
                </label>
                <span className="text-[11px] text-slate-500">
                  Para cada parada, define qué observar y sube la foto de referencia de la condición ideal.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddStation}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all"
              >
                <Plus size={13} />
                <span>Agregar Estación</span>
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {stations.map((st, idx) => (
                <div
                  key={st.id || idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 grow">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={st.name}
                        onChange={(e) => handleStationFieldChange(idx, 'name', e.target.value)}
                        placeholder={`Nombre de la Estación ${idx + 1}`}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStation(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Eliminar estación"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start pl-8">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Criterio del Estándar (¿Cómo debe lucir?)
                      </label>
                      <input
                        type="text"
                        value={st.standardNotes || ''}
                        onChange={(e) =>
                          handleStationFieldChange(idx, 'standardNotes', e.target.value)
                        }
                        placeholder="Ej: Herramientas en su silueta, piso libre de despuntes, carro en línea amarilla..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Foto del Estándar Ideal
                      </label>
                      {st.standardImageUrl ? (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-emerald-200">
                          <img
                            src={st.standardImageUrl}
                            alt={st.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-emerald-700 block truncate">
                              ✓ Estándar cargado
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStationFieldChange(idx, 'standardImageUrl', '')
                              }
                              className="text-[10px] text-rose-600 hover:underline font-semibold"
                            >
                              Cambiar foto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-dashed border-blue-300 rounded-xl cursor-pointer transition-all font-bold text-[11px]">
                          <Camera size={14} />
                          <span>
                            {uploadingStationIdx === idx ? 'Subiendo...' : 'Subir Foto Estándar'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingStationIdx === idx}
                            onChange={(e) =>
                              handleUploadStationPhoto(idx, e.target.files?.[0])
                            }
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingStationIdx !== null}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {isSubmitting
                ? 'Guardando...'
                : routeToEdit
                ? 'Guardar Cambios en Ruta'
                : 'Crear Ruta con Estándares'}
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
  allFindings: GembaFinding[];
  onFulfillCommitment: (finding: GembaFinding, afterImageUrl?: string) => Promise<void>;
  onRoutesUpdated?: () => void;
  onClose: () => void;
}> = ({ walk, routes, allFindings, onFulfillCommitment, onRoutesUpdated, onClose }) => {
  const { user, activeCompanyId } = useAuth();
  const currentRoute = routes.find((r) => r.id === walk.route_id);
  const [localStations, setLocalStations] = useState<GembaStation[]>(() =>
    Array.isArray(currentRoute?.stations) && currentRoute!.stations.length > 0
      ? currentRoute!.stations
      : [
          { id: 'st_1', name: 'Estación 1', area: walk.area, orderIndex: 1 },
          { id: 'st_2', name: 'Estación 2', area: walk.area, orderIndex: 2 },
        ]
  );

  const [currentStationIdx, setCurrentStationIdx] = useState(0);
  const activeStation = localStations[currentStationIdx] || {
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

  // Estado para Pacto de Compromiso (Mano Estrechada)
  const [isHandshakeCommitment, setIsHandshakeCommitment] = useState<boolean>(true);
  const [commitmentDays, setCommitmentDays] = useState<number>(2);
  const [commitmentDueDate, setCommitmentDueDate] = useState<string>(() => addDaysToIsoDate(2));
  const [leaderSupport, setLeaderSupport] = useState<string>('');
  const [uploadingRunnerFulfillId, setUploadingRunnerFulfillId] = useState<string | null>(null);

  const [isUploadingFindingPhoto, setIsUploadingFindingPhoto] = useState(false);
  const [isUploadingStandardPhoto, setIsUploadingStandardPhoto] = useState(false);
  const [isSavingFinding, setIsSavingFinding] = useState(false);
  const [zoomStandardImg, setZoomStandardImg] = useState<string | null>(null);

  // Asistente IA de preguntas co-creativas orientadas a causa raíz
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [walkFindings, setWalkFindings] = useState<GembaFinding[]>([]);

  // Compromisos pendientes en la estación actual (de rondas anteriores o actual)
  const stationPendingCommitments = allFindings.filter((f) => {
    if (f.station_name !== activeStation.name || f.status === 'cerrado') return false;
    const meta = parseCommitmentMeta(f);
    return Boolean(meta?.isHandshake && !meta?.completedAt);
  });

  const handleSelectCommitmentDays = (days: number) => {
    setIsHandshakeCommitment(true);
    setCommitmentDays(days);
    setCommitmentDueDate(addDaysToIsoDate(days));
  };

  const handleRunnerFulfillWithPhoto = async (finding: GembaFinding, file?: File) => {
    if (!file) return;
    setUploadingRunnerFulfillId(finding.id);
    const toastId = toast.loading('Subiendo foto de la mejora cumplida...');
    try {
      const companyId = activeCompanyId || user?.companyId || walk.company_id;
      const url = await uploadGembaImage(file, companyId);
      toast.dismiss(toastId);
      await onFulfillCommitment(finding, url || undefined);
      await loadWalkFindings();
    } catch (err) {
      toast.error('Error al subir foto', { id: toastId });
    } finally {
      setUploadingRunnerFulfillId(null);
    }
  };

  // Preguntas colaborativas base alineadas con la filosofía de co-creación, causa raíz y compromiso
  const defaultCollaborativeQuestions = [
    `«Mira, veo que esto en ${activeStation.name} podría mejorar. Desde tu experiencia operando aquí todos los días, ¿crees que exista una manera más cómoda, rápida o segura de hacerlo?»`,
    `«¿Qué crees que origina realmente este problema o fricción para que ataquemos juntos la causa raíz y no se vuelva a repetir?»`,
    `«Si me propones esa mejora, ¿en cuánto tiempo crees que se puede resolver? ¿Crees que lo puedas hacer en 2 días? ¡Estrechemos la mano para dejarlo como compromiso!»`,
  ];

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

  // Actualizar preguntas base al cambiar de estación
  useEffect(() => {
    setAiQuestions([
      `«Mira, veo que esto en ${activeStation.name} podría mejorar. Desde tu experiencia operando aquí todos los días, ¿crees que exista una manera más cómoda, rápida o segura de hacerlo?»`,
      `«¿Qué crees que origina realmente este problema o fricción para que ataquemos juntos la causa raíz y no se vuelva a repetir?»`,
      `«Si me propones esa mejora, ¿en cuánto tiempo crees que se puede resolver? ¿Crees que lo puedas hacer en 2 días? ¡Estrechemos la mano para hacerlo compromiso!»`,
    ]);
  }, [currentStationIdx, activeStation.name]);

  // Subir o actualizar la foto del estándar de esta estación directamente desde el terreno
  const handleQuickUploadStationStandard = async (file?: File) => {
    if (!file) return;
    setIsUploadingStandardPhoto(true);
    const toastId = toast.loading('Guardando foto de referencia del estándar...');
    try {
      const companyId = activeCompanyId || user?.companyId || walk.company_id;
      const url = await uploadGembaImage(file, companyId);
      if (!url) throw new Error('No se pudo subir la imagen');

      const updated = localStations.map((st, i) =>
        i === currentStationIdx ? { ...st, standardImageUrl: url } : st
      );
      setLocalStations(updated);

      if (currentRoute?.id) {
        await supabase
          .from('gemba_routes')
          .update({ stations: updated })
          .eq('id', currentRoute.id);
        if (onRoutesUpdated) onRoutesUpdated();
      }
      toast.success('¡Foto del estándar actualizada para esta estación!', { id: toastId });
    } catch (err) {
      console.error('Error updating standard photo:', err);
      toast.error('Error al actualizar foto del estándar', { id: toastId });
    } finally {
      setIsUploadingStandardPhoto(false);
    }
  };

  // Subir foto de evidencia del hallazgo o reconocimiento en la caminata
  const handleUploadFindingEvidence = async (file?: File) => {
    if (!file) return;
    setIsUploadingFindingPhoto(true);
    const toastId = toast.loading('Procesando foto de evidencia...');
    try {
      const companyId = activeCompanyId || user?.companyId || walk.company_id;
      const url = await uploadGembaImage(file, companyId);
      if (url) {
        setImageUrl(url);
        toast.success('¡Foto de evidencia lista!', { id: toastId });
      } else {
        toast.error('No se pudo cargar la foto', { id: toastId });
      }
    } catch (err) {
      console.error('Error uploading evidence photo:', err);
      toast.error('Error al subir foto de evidencia', { id: toastId });
    } finally {
      setIsUploadingFindingPhoto(false);
    }
  };

  // Generar preguntas socráticas con IA para la estación actual (Enfoque Humilde + Causa Raíz + Compromiso)
  const handleAskAiCoach = async () => {
    setIsGeneratingAi(true);
    try {
      const geminiKey =
        (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null) ||
        import.meta.env.VITE_GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const prompt = `Actúa como un maestro Sensei de Toyota Kata y Liderazgo Gemba.
El líder está conversando con el operador en la estación "${activeStation.name}" (Área: ${walk.area}, Foco: ${walk.focus_theme || 'General'}).
Regla de oro filosófica del usuario: Jamás culpar al operador ni decirle "esto está mal o no cumples el estándar".
Paso 1: Invitar a mejorar ("Mira, veo que esto podría mejorar, ¿crees que exista una manera de mejorar esto?").
Paso 2: Buscar qué origina el problema para eliminar la causa raíz.
Paso 3: Cuando el operador propone algo, preguntarle "¿En cuánto crees que se puede resolver?" y reconfirmar "¿Crees que lo puedas hacer en X días?" estrechándole la mano para sellar el compromiso.
Genera exactamente 3 preguntas cercanas y empáticas siguiendo estos 3 pasos para esta estación.
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

      setAiQuestions(defaultCollaborativeQuestions);
    } catch (err) {
      console.error('Error generando preguntas:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Guardar Hallazgo + Pacto de Compromiso
  const handleSaveFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Ingresa la descripción de la oportunidad de mejora o reconocimiento');
      return;
    }

    setIsSavingFinding(true);
    const toastId = toast.loading('Registrando en piso...');
    try {
      const shouldSaveHandshake =
        findingType !== 'reconocimiento_positivo' && isHandshakeCommitment;

      const commitmentPayload: GembaCommitmentMeta | null = shouldSaveHandshake
        ? {
            isHandshake: true,
            daysAgreed: commitmentDays,
            dueDate: commitmentDueDate || addDaysToIsoDate(commitmentDays),
            leaderSupport: leaderSupport.trim() || undefined,
            completedAt: null,
            afterImageUrl: null,
          }
        : null;

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
        audio_note_url: commitmentPayload ? serializeCommitmentMeta(commitmentPayload) : null,
        status: 'abierto',
      };

      const { error } = await supabase.from('gemba_findings').insert([payload]);
      if (error) throw error;

      toast.success(
        shouldSaveHandshake
          ? `🤝 ¡Compromiso de mano estrechada registrado para el ${formatDate(
              commitmentPayload!.dueDate
            )}!`
          : '¡Registro guardado en esta estación!',
        { id: toastId }
      );
      setDescription('');
      setImmediateAction('');
      setLeaderSupport('');
      setImageUrl('');
      await loadWalkFindings();
      if (onRoutesUpdated) onRoutesUpdated();
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
      'Ingresa un breve resumen de cierre o acuerdos de mejora conversados con los operadores:',
      'Ronda completada con éxito. Se conversó en terreno con los operadores, se identificaron causas raíz y se sellaron compromisos de mejora.'
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
    <div className="fixed inset-0 !mt-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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
                  Modo Piso de Planta (Genchi Genbutsu)
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
              {activeStation.name} ({currentStationIdx + 1} de {localStations.length})
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
              disabled={currentStationIdx >= localStations.length - 1}
              onClick={() =>
                setCurrentStationIdx((prev) => Math.min(localStations.length - 1, prev + 1))
              }
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Runner Body */}
        <div className="p-6 overflow-y-auto space-y-5 grow">
          {/* Banner de Seguimiento Automático: Compromisos Pactados en esta Estación */}
          {stationPendingCommitments.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake size={18} className="text-amber-700" />
                  <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                    🔔 Seguimiento de Compromisos en {activeStation.name} (
                    {stationPendingCommitments.length})
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  Verifica con el operador si logró su meta
                </span>
              </div>

              <div className="space-y-2">
                {stationPendingCommitments.map((item) => {
                  const meta = parseCommitmentMeta(item)!;
                  const statusInfo = getCommitmentStatusInfo(meta, item.status);
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">
                            👤 {item.operator_name || 'Operador de la Estación'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">
                          Compromiso:{' '}
                          <span className="italic">
                            "{item.immediate_action || item.description}"
                          </span>
                        </p>
                        {meta.leaderSupport && (
                          <p className="text-[11px] text-indigo-700">
                            Tu apoyo comprometido: "{meta.leaderSupport}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await onFulfillCommitment(item);
                            await loadWalkFindings();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-xs transition-all"
                        >
                          <Check size={13} />
                          <span>¡Cumplió! Reconocer</span>
                        </button>
                        <label className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer transition-all">
                          <Camera size={13} />
                          <span>
                            {uploadingRunnerFulfillId === item.id
                              ? 'Subiendo...'
                              : '+ Foto Después'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={uploadingRunnerFulfillId === item.id}
                            onChange={(e) =>
                              handleRunnerFulfillWithPhoto(item, e.target.files?.[0])
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tarjeta de Estándar Visual de la Estación (Para Comparar Realidad vs Estándar) */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                  Estándar Visual de Referencia: {activeStation.name}
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                {activeStation.standardNotes
                  ? `Criterio esperado: "${activeStation.standardNotes}"`
                  : 'Observa junto al operador si las condiciones actuales coinciden con el estándar acordado o si existe algún obstáculo en el proceso.'}
              </p>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer pt-1">
                <Camera size={13} />
                <span>
                  {isUploadingStandardPhoto
                    ? 'Subiendo foto del estándar...'
                    : activeStation.standardImageUrl
                    ? 'Actualizar foto de referencia del estándar'
                    : '+ Subir foto de cómo debe cumplir el estándar esta estación'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingStandardPhoto}
                  onChange={(e) => handleQuickUploadStationStandard(e.target.files?.[0])}
                />
              </label>
            </div>

            {activeStation.standardImageUrl ? (
              <div
                onClick={() => setZoomStandardImg(activeStation.standardImageUrl || null)}
                className="relative group shrink-0 w-full sm:w-44 h-28 rounded-xl overflow-hidden border-2 border-emerald-300 bg-white shadow-sm cursor-pointer"
                title="Haz clic para ampliar el estándar visual"
              >
                <img
                  src={activeStation.standardImageUrl}
                  alt={`Estándar ${activeStation.name}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-1.5 right-1.5 bg-emerald-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  🔍 Ver Estándar
                </span>
              </div>
            ) : (
              <div className="shrink-0 w-full sm:w-44 h-24 rounded-xl border border-dashed border-emerald-300 bg-white/70 flex flex-col items-center justify-center text-center p-2 text-emerald-700">
                <Camera size={20} className="mb-1 opacity-60" />
                <span className="text-[10px] font-semibold">
                  Sin foto del estándar aún en esta parada
                </span>
              </div>
            )}
          </div>

          {/* Box de Diálogo Co-Creativo y Causa Raíz (Toyota Kata) */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-4 rounded-2xl border border-indigo-100 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    Guía de Diálogo Empático, Causa Raíz y Compromiso
                  </span>
                  <span className="text-[10px] text-indigo-700">
                    1° Invita a mejorar sin culpar • 2° Descubre la causa raíz • 3° Pregunta en cuánto tiempo cree resolverlo y estrecha su mano:
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAskAiCoach}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Sparkles size={13} className={isGeneratingAi ? 'animate-spin' : ''} />
                <span>{isGeneratingAi ? 'Consultando IA...' : 'Nuevas Preguntas IA'}</span>
              </button>
            </div>

            <div className="space-y-1.5 mt-2.5">
              {aiQuestions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-white/95 p-2.5 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de Captura de Hallazgo / Oportunidad en esta Estación */}
          <form
            onSubmit={handleSaveFinding}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Camera size={16} className="text-rose-500" />
                <span>Registrar Conversación y Compromiso en: {activeStation.name}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFindingType('desperdicio_muda')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    findingType === 'desperdicio_muda'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  💡 Oportunidad de Mejora / Muda
                </button>
                <button
                  type="button"
                  onClick={() => setFindingType('reconocimiento_positivo')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    findingType === 'reconocimiento_positivo'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  👏 Reconocimiento al Operador
                </button>
              </div>
            </div>

            {findingType === 'desperdicio_muda' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  ¿Qué tipo de fricción o desperdicio (Muda) afecta al operador?
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Operador con quien conversaste
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ej: Juan Pérez / Operador de Línea"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fotografía de Evidencia en Terreno (Cámara o Galería)
                </label>
                {imageUrl ? (
                  <div className="flex items-center justify-between gap-3 p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={imageUrl}
                        alt="Previsualización Gemba"
                        onClick={() => setZoomStandardImg(imageUrl)}
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-300 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-emerald-800 block">
                          ✓ Foto capturada en terreno
                        </span>
                        <span className="text-[10px] text-emerald-600 block">
                          Haz clic en la miniatura para ampliar
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-dashed border-rose-300 rounded-xl cursor-pointer font-bold transition-all">
                      <Camera size={15} />
                      <span>
                        {isUploadingFindingPhoto
                          ? 'Subiendo foto...'
                          : 'Subir / Tomar Foto del Hallazgo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={isUploadingFindingPhoto}
                        onChange={(e) => handleUploadFindingEvidence(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {findingType === 'reconocimiento_positivo'
                  ? 'Descripción del Reconocimiento / Buena Práctica *'
                  : '¿Qué observaste y qué opina el operador sobre qué origina el problema (Causa Raíz)? *'}
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  findingType === 'reconocimiento_positivo'
                    ? 'Ej: El operador mantiene el puesto impecable acorde a la foto del estándar y propuso una guía para evitar atascos...'
                    : 'Ej: Conversando con el operador, vimos que las bandejas se acumulan porque el rollo de etiquetas queda lejos. Su idea es acercar el soporte...'
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>

            {findingType !== 'reconocimiento_positivo' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Idea de Mejora Propuesta por el Operador
                  </label>
                  <input
                    type="text"
                    value={immediateAction}
                    onChange={(e) => setImmediateAction(e.target.value)}
                    placeholder="Ej: Reubicar soporte de etiquetas junto al operador para eliminar el desplazamiento innecesario"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>

                {/* Bloque de Pacto de Compromiso (Mano Estrechada) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isHandshakeCommitment
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                          isHandshakeCommitment
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Handshake size={17} />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block text-xs">
                          🤝 Pacto de Compromiso en Terreno (Apretón de Manos)
                        </span>
                        <span className="text-[11px] text-slate-600 block">
                          Pregúntale: «¿En cuánto crees que se puede resolver? ¿Crees que lo puedas hacer en{' '}
                          {commitmentDays === 0
                            ? 'el día de hoy'
                            : commitmentDays === 1
                            ? '1 día'
                            : `${commitmentDays} días`}
                          ?» y tiéndele la mano.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsHandshakeCommitment((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1.5 ${
                        isHandshakeCommitment
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Handshake size={14} />
                      <span>
                        {isHandshakeCommitment
                          ? '🤝 Compromiso Activado'
                          : 'Activar Compromiso'}
                      </span>
                    </button>
                  </div>

                  {isHandshakeCommitment && (
                    <div className="mt-3 pt-3 border-t border-indigo-200/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-indigo-950">
                            Plazo propuesto por el operador (¿En cuántos días?):
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { days: 0, label: 'Hoy mismo' },
                              { days: 1, label: '1 día' },
                              { days: 2, label: '2 días' },
                              { days: 3, label: '3 días' },
                              { days: 5, label: '5 días' },
                              { days: 7, label: '1 semana' },
                            ].map((opt) => (
                              <button
                                key={opt.days}
                                type="button"
                                onClick={() => handleSelectCommitmentDays(opt.days)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                  commitmentDays === opt.days
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                            Fecha acordada:
                          </label>
                          <input
                            type="date"
                            value={commitmentDueDate}
                            onChange={(e) => setCommitmentDueDate(e.target.value)}
                            className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-950"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                          ¿A qué te comprometes tú como líder para apoyarlo? (Opcional: herramientas, permisos, mantención)
                        </label>
                        <input
                          type="text"
                          value={leaderSupport}
                          onChange={(e) => setLeaderSupport(e.target.value)}
                          placeholder="Ej: Facilitar soporte metálico con taller / Autorizar 20 min al final del turno"
                          className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-slate-800 text-xs"
                        />
                      </div>

                      <div className="bg-white/90 px-3 py-2 rounded-xl border border-indigo-200 flex items-center justify-between text-[11px] text-indigo-950">
                        <span className="font-bold flex items-center gap-1.5">
                          <span>🤝</span>
                          <span>
                            Pacto sellado con{' '}
                            <strong className="text-indigo-700">
                              {operatorName.trim() || 'el operador'}
                            </strong>{' '}
                            para el <strong>{formatDate(commitmentDueDate)}</strong>
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Mano Estrechada
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingFinding || isUploadingFindingPhoto}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>
                  {isSavingFinding
                    ? 'Guardando...'
                    : findingType !== 'reconocimiento_positivo' && isHandshakeCommitment
                    ? '🤝 Guardar Oportunidad y Sellar Compromiso'
                    : 'Guardar Registro en Estación'}
                </span>
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
                {walkFindings.map((f) => {
                  const meta = parseCommitmentMeta(f);
                  return (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {f.image_url && (
                          <img
                            src={f.image_url}
                            alt="Evidencia"
                            onClick={() => setZoomStandardImg(f.image_url || null)}
                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {f.station_name} •{' '}
                              <span className="text-slate-500 font-normal">
                                {f.finding_type === 'reconocimiento_positivo'
                                  ? '👏 Reconocimiento'
                                  : `💡 Oportunidad (${f.muda_category || 'Muda'})`}
                              </span>
                            </span>
                            {meta?.isHandshake && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                🤝 Compromiso {meta.daysAgreed}d ({formatDate(meta.dueDate)})
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 line-clamp-1 mt-0.5">{f.description}</p>
                        </div>
                      </div>
                      {f.operator_name && (
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {f.operator_name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox interno dentro del Runner */}
        {zoomStandardImg && (
          <div
            onClick={() => setZoomStandardImg(null)}
            className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800">
                <span className="text-xs font-bold">Referencia Visual / Evidencia Gemba</span>
                <button
                  onClick={() => setZoomStandardImg(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
                <img
                  src={zoomStandardImg}
                  alt="Zoom Gemba"
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GembaPage;
