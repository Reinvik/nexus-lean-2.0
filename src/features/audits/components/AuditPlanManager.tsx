import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AuditPlanItem, AuditPlanCompanyGuide } from '../../../types';
import { auditPlanService } from '../services/auditPlanService';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Upload,
  FileText,
  Download,
  Trash2,
  Edit2,
  Play,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  Eye,
  Check,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../../lib/utils';

interface AuditPlanManagerProps {
  companyId?: string | null;
  onExecuteAudit: (planItem: AuditPlanItem) => void;
}

export const AuditPlanManager: React.FC<AuditPlanManagerProps> = ({
  companyId,
  onExecuteAudit,
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<AuditPlanItem[]>([]);
  const [guide, setGuide] = useState<AuditPlanCompanyGuide | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AuditPlanItem | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Form State para programar auditoría
  const [formArea, setFormArea] = useState('');
  const [formAuditor, setFormAuditor] = useState(user?.name || '');
  const [formPlannedDate, setFormPlannedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [formFrequency, setFormFrequency] = useState<AuditPlanItem['frequency']>('Mensual');
  const [formNotes, setFormNotes] = useState('');
  const [formGuideUrl, setFormGuideUrl] = useState('');
  const [formGuideName, setFormGuideName] = useState('');
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);

  // File Inputs
  const guideFileInputRef = useRef<HTMLInputElement>(null);
  const itemGuideFileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos
  const loadPlanData = async () => {
    setLoading(true);
    try {
      const [planData, companyGuide] = await Promise.all([
        auditPlanService.getPlanItems(companyId),
        auditPlanService.getCompanyGuide(companyId),
      ]);
      setItems(planData);
      setGuide(companyGuide);
    } catch (err) {
      console.error('Error loading audit plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanData();
  }, [companyId]);

  // Años disponibles en el plan
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    items.forEach((item) => {
      if (item.planned_date) {
        const y = item.planned_date.substring(0, 4);
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Detección de auditorías atrasadas
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtrado de ítems
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de estado
      const isOverdue = item.status === 'pending' && item.planned_date < todayStr;
      if (statusFilter === 'pending' && item.status !== 'pending') return false;
      if (statusFilter === 'completed' && item.status !== 'completed') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      // Filtro de año
      if (yearFilter !== 'all') {
        const itemYear = item.planned_date ? item.planned_date.substring(0, 4) : '';
        if (itemYear !== yearFilter) return false;
      }

      // Filtro de mes
      if (monthFilter !== 'all') {
        const itemMonth = item.planned_date ? String(new Date(item.planned_date + 'T00:00:00').getMonth()) : '';
        if (itemMonth !== monthFilter) return false;
      }

      // Búsqueda por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const areaMatch = (item.area || '').toLowerCase().includes(q);
        const auditorMatch = (item.auditor || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        return areaMatch || auditorMatch || notesMatch;
      }

      return true;
    });
  }, [items, statusFilter, yearFilter, monthFilter, searchTerm, todayStr]);

  // Estadísticas del Plan
  const planStats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === 'completed').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const overdue = items.filter((i) => i.status === 'pending' && i.planned_date < todayStr).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Próxima auditoría pendiente
    const upcoming = [...items]
      .filter((i) => i.status === 'pending' && i.planned_date >= todayStr)
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date))[0];

    return { total, completed, pending, overdue, rate, upcoming };
  }, [items, todayStr]);

  // Toggle rápido de estado con 1 Clic
  const handleToggleStatus = async (item: AuditPlanItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    const actionText = nextStatus === 'completed' ? 'marcada como realizada' : 'revertida a pendiente';

    const res = await auditPlanService.togglePlanItemStatus(item.id, nextStatus);
    if (res.success && res.updated) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.updated! : i)));
      toast.success(`Auditoría en "${item.area}" ${actionText}`, {
        icon: nextStatus === 'completed' ? '✅' : '⏳',
      });
    } else {
      toast.error(res.error || 'No se pudo actualizar el estado');
    }
  };

  // Abrir modal de creación o edición
  const handleOpenCreateModal = (itemToEdit?: AuditPlanItem) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormArea(itemToEdit.area);
      setFormAuditor(itemToEdit.auditor);
      setFormPlannedDate(itemToEdit.planned_date);
      setFormFrequency(itemToEdit.frequency || 'Mensual');
      setFormNotes(itemToEdit.notes || '');
      setFormGuideUrl(itemToEdit.guide_url || '');
      setFormGuideName(itemToEdit.guide_name || '');
    } else {
      setEditingItem(null);
      setFormArea('');
      setFormAuditor(user?.name || '');
      setFormPlannedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setFormFrequency('Mensual');
      setFormNotes('');
      setFormGuideUrl('');
      setFormGuideName('');
    }
    setIsCreateModalOpen(true);
  };

  // Guardar ítem del plan
  const handleSavePlanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArea.trim()) {
      toast.error('Especifica el área o puesto a auditar');
      return;
    }

    setFormIsSubmitting(true);
    try {
      const newItem: AuditPlanItem = {
        id: editingItem ? editingItem.id : `plan_${Date.now()}`,
        company_id: companyId && companyId !== 'all' ? companyId : 'global',
        area: formArea.trim(),
        auditor: formAuditor.trim() || 'Sin asignar',
        planned_date: formPlannedDate,
        frequency: formFrequency,
        status: editingItem ? editingItem.status : 'pending',
        completed_date: editingItem?.completed_date,
        score: editingItem?.score,
        notes: formNotes.trim(),
        guide_url: formGuideUrl || null,
        guide_name: formGuideName || null,
        created_at: editingItem ? editingItem.created_at : new Date().toISOString(),
      };

      const res = await auditPlanService.savePlanItem(newItem);
      if (res.success && res.data) {
        toast.success(editingItem ? 'Auditoría actualizada en el plan' : 'Auditoría programada con éxito');
        setIsCreateModalOpen(false);
        loadPlanData();
      } else {
        toast.error(res.error || 'Error al guardar');
      }
    } finally {
      setFormIsSubmitting(false);
    }
  };

  // Eliminar ítem
  const handleDeleteItem = async (item: AuditPlanItem) => {
    if (window.confirm(`¿Seguro que deseas eliminar la programación de auditoría en "${item.area}"?`)) {
      const res = await auditPlanService.deletePlanItem(item.id);
      if (res.success) {
        toast.success('Auditoría retirada del plan');
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        toast.error(res.error || 'Error al eliminar');
      }
    }
  };

  // Subir guía oficial de la empresa
  const handleUploadCompanyGuide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newGuide: AuditPlanCompanyGuide = {
        id: `guide_${Date.now()}`,
        company_id: companyId && companyId !== 'all' ? companyId : 'global',
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url: dataUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || 'Administrador',
      };

      const res = await auditPlanService.saveCompanyGuide(newGuide);
      if (res.success) {
        setGuide(newGuide);
        toast.success('Guía oficial de auditoría subida exitosamente');
        setIsGuideModalOpen(false);
      } else {
        toast.error(res.error || 'Error al guardar guía');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Subir guía específica para un ítem
  const handleUploadItemGuide = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormGuideUrl(reader.result as string);
      setFormGuideName(file.name);
      toast.success(`Documento "${file.name}" adjuntado a la auditoría`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Descargar plantilla de plan en formato CSV para Excel
  const handleDownloadTemplate = () => {
    const headers = ['Area', 'Auditor', 'Fecha_Planificada_AAAA_MM_DD', 'Frecuencia', 'Alcance_Guia'];
    const sampleRows = [
      ['Linea 1 Ensamble', 'Carlos Navarrete', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], 'Mensual', 'Verificar 1S y 2S en bancos de trabajo'],
      ['Bodega General', 'Mariana Soto', new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], 'Quincenal', 'Etiquetado de estanterías y orden de pallets'],
      ['Taller Mecanico', 'Felipe Alarcon', new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0], 'Mensual', 'Limpieza e inspección de maquinaria 3S'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Plantilla_Plan_Auditorias_5S_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Plantilla descargada. Puedes abrirla en Excel.');
  };

  return (
    <div className="space-y-6">
      {/* Banner / Guía Oficial de Auditoría */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold tracking-wide">
              <CalendarCheck size={14} className="text-cyan-400" />
              <span>Programa & Estándar de Auditorías 5S</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Planificación Anual de Auditorías en Planta
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Sube la guía técnica o checklist rector como referencia para los auditores. Revisa el programa,
              monitorea fechas planificadas y marca con un solo clic las auditorías completadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {guide ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-cyan-500/40 rounded-xl p-2.5 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="text-left min-w-0 pr-2">
                  <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
                    Guía Oficial Activa
                  </span>
                  <span className="text-xs font-bold text-white truncate block max-w-[150px] sm:max-w-[200px]" title={guide.file_name}>
                    {guide.file_name}
                  </span>
                </div>
                <a
                  href={guide.file_url}
                  download={guide.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title="Descargar guía oficial"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => setIsGuideModalOpen(true)}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  title="Reemplazar o gestionar guía"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
              >
                <Upload size={16} />
                <span>Subir Guía de Auditoría</span>
              </button>
            )}

            <button
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition-all shadow-md active:scale-95"
            >
              <Plus size={16} className="text-cyan-600" />
              <span>Programar Auditoría</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards del Plan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Total Programadas</span>
            <CalendarCheck size={16} className="text-cyan-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {planStats.total}
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Auditorías en el plan
          </span>
        </div>

        {/* Pendientes */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Pendientes</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
              {planStats.pending}
            </span>
            {planStats.overdue > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                {planStats.overdue} atrasadas
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Por ejecutar en planta
          </span>
        </div>

        {/* Realizadas */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Completadas</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {planStats.completed}
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              ({planStats.rate}%)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Avance del programa anual
          </span>
        </div>

        {/* Próxima */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Próxima Auditoría</span>
            <Calendar size={16} className="text-indigo-600" />
          </div>
          {planStats.upcoming ? (
            <div>
              <div className="text-xs font-black text-slate-900 truncate" title={planStats.upcoming.area}>
                {planStats.upcoming.area}
              </div>
              <span className="text-[11px] font-bold text-indigo-700 block">
                {formatDate(planStats.upcoming.planned_date)} • {planStats.upcoming.auditor}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold text-slate-400 block">Sin pendientes próximas</span>
              <span className="text-[11px] text-slate-400">Todo al día</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar de Filtros & Acciones */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs rápidas de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Pendientes ({planStats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Realizadas ({planStats.completed})
            </button>
            {planStats.overdue > 0 && (
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Atrasadas ({planStats.overdue})
              </button>
            )}
          </div>

          {/* Opciones de Plantilla y Carga */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Descargar plantilla de auditorías en Excel/CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Plantilla CSV</span>
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros de Año/Mes */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por área, auditor o alcance..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-600"
            >
              <option value="all">Año: Todos</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Año: {y}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-600"
            >
              <option value="all">Mes: Todos</option>
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla del Plan de Auditoría */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="text-cyan-600" size={18} />
              <span>Cronograma & Checklist de Auditorías</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Haz clic en el estado para cambiar entre Realizada y Pendiente al instante, o ejecuta la evaluación 5S completa.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {filteredItems.length} de {items.length} programadas
          </span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Estado (Clic para alternar)</th>
                  <th className="py-3 px-4">Área / Proceso</th>
                  <th className="py-3 px-4">Auditor Asignado</th>
                  <th className="py-3 px-4">Fecha Planificada</th>
                  <th className="py-3 px-4">Frecuencia</th>
                  <th className="py-3 px-4">Guía / Alcance</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const isOverdue = !isCompleted && item.planned_date < todayStr;
                  const isToday = !isCompleted && item.planned_date === todayStr;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isCompleted ? 'bg-emerald-50/20' : isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Toggle interactivo de 1 clic */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer select-none border active:scale-95 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-950 border-rose-300 hover:bg-rose-200 animate-pulse'
                                : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
                            }`}
                            title="Haz clic para cambiar el estado al instante"
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 size={14} className="text-emerald-700" />
                                <span>Realizada</span>
                                {item.score !== undefined && item.score !== null && (
                                  <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[10px] font-black">
                                    {item.score}%
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <Clock size={14} className={isOverdue ? 'text-rose-700' : 'text-amber-700'} />
                                <span>{isOverdue ? 'Atrasada' : 'Pendiente'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Área */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px] sm:max-w-[260px]">{item.area}</span>
                        </div>
                      </td>

                      {/* Auditor */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        <span className="truncate block max-w-[150px]">{item.auditor}</span>
                      </td>

                      {/* Fecha Planificada */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span
                            className={`font-semibold ${
                              isOverdue
                                ? 'text-rose-700 font-bold'
                                : isToday
                                ? 'text-amber-700 font-bold'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatDate(item.planned_date)}
                          </span>
                        </div>
                        {isCompleted && item.completed_date && (
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            Realizada el {formatDate(item.completed_date)}
                          </span>
                        )}
                      </td>

                      {/* Frecuencia */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {item.frequency || 'Mensual'}
                        </span>
                      </td>

                      {/* Guía o Alcance */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        {item.guide_url ? (
                          <a
                            href={item.guide_url}
                            target="_blank"
                            rel="noreferrer"
                            download={item.guide_name || 'Guia_Auditoria'}
                            className="inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-800 font-bold hover:underline"
                            title={`Descargar guía específica: ${item.guide_name}`}
                          >
                            <FileText size={13} />
                            <span className="truncate">{item.guide_name || 'Ver Guía'}</span>
                            <Download size={11} />
                          </a>
                        ) : item.notes ? (
                          <span className="text-slate-500 truncate block text-[11px]" title={item.notes}>
                            {item.notes}
                          </span>
                        ) : guide ? (
                          <a
                            href={guide.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-cyan-600 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <span>Guía general</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Estándar 5S</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón directo para ejecutar auditoría */}
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => onExecuteAudit(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-2xs transition-all active:scale-95"
                              title="Ejecutar evaluación 5S ahora"
                            >
                              <Play size={11} fill="currentColor" />
                              <span>Evaluar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar programación"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar del plan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <CalendarCheck size={40} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No hay auditorías con los filtros seleccionados</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Ajusta los filtros o programa una nueva auditoría en el plan para dar seguimiento al estándar 5S en tu empresa.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateModal()}
              leftIcon={<Plus size={14} />}
            >
              Programar Auditoría
            </Button>
          </div>
        )}
      </div>

      {/* Modal: Programar / Editar Auditoría */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingItem ? 'Editar Auditoría Programada' : 'Programar Nueva Auditoría 5S'}
        subtitle="Define el puesto a auditar, responsable, fecha y documento guía de verificación"
        maxWidth="xl"
      >
        <form onSubmit={handleSavePlanItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Área, Puesto o Estación <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formArea}
              onChange={(e) => setFormArea(e.target.value)}
              placeholder="Ej: Línea 1 Ensamble, Bodega Central, Taller..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Auditor Responsable
              </label>
              <input
                type="text"
                value={formAuditor}
                onChange={(e) => setFormAuditor(e.target.value)}
                placeholder="Nombre del auditor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha Programada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formPlannedDate}
                onChange={(e) => setFormPlannedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Frecuencia de Auditoría
            </label>
            <select
              value={formFrequency}
              onChange={(e) => setFormFrequency(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white"
            >
              <option value="Única">Única (Auditoría extraordinaria o inicial)</option>
              <option value="Semanal">Semanal</option>
              <option value="Quincenal">Quincenal</option>
              <option value="Mensual">Mensual</option>
              <option value="Bimestral">Bimestral</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alcance & Puntos Clave de Enfoque (Guía Rápida)
            </label>
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ej: Foco especial en delimitación de pasillos (2S), tableros de herramientas y control de derrames..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-cyan-600 focus:bg-white resize-none"
            />
          </div>

          {/* Adjuntar Guía Específica Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Documento Guía Específico (Opcional - PDF / Word / Excel / Imagen)
            </label>
            <input
              type="file"
              ref={itemGuideFileInputRef}
              onChange={handleUploadItemGuide}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
              className="hidden"
            />

            {formGuideName ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50 border border-cyan-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck size={16} className="text-cyan-700 shrink-0" />
                  <span className="text-xs font-bold text-cyan-900 truncate">
                    {formGuideName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormGuideUrl('');
                    setFormGuideName('');
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Quitar documento"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => itemGuideFileInputRef.current?.click()}
                className="w-full py-2.5 px-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Upload size={14} />
                <span>Adjuntar Guía o Checklist para esta Auditoría</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={formIsSubmitting}>
              {editingItem ? 'Guardar Cambios' : 'Programar en el Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Subir Guía Oficial de la Empresa */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="Guía Oficial de Auditoría 5S"
        subtitle="Manual de evaluación, checklist maestro o procedimiento estándar para toda la planta"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <input
            type="file"
            ref={guideFileInputRef}
            onChange={handleUploadCompanyGuide}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
            className="hidden"
          />

          {guide && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Guía Actual:</span>
                <span className="text-[11px] text-slate-500">
                  Subida el {formatDate(guide.uploaded_at)} por {guide.uploaded_by}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="text-cyan-600 shrink-0" size={20} />
                  <span className="text-xs font-bold text-slate-800 truncate" title={guide.file_name}>
                    {guide.file_name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={guide.file_url}
                    download={guide.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 transition-colors"
                    title="Descargar"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={async () => {
                      if (window.confirm('¿Seguro que deseas eliminar la guía oficial actual?')) {
                        await auditPlanService.deleteCompanyGuide(companyId);
                        setGuide(null);
                        toast.success('Guía eliminada');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            onClick={() => guideFileInputRef.current?.click()}
            className="border-2 border-dashed border-cyan-400 hover:border-cyan-600 bg-cyan-50/40 hover:bg-cyan-50 rounded-2xl p-6 text-center cursor-pointer transition-all"
          >
            <Upload size={32} className="mx-auto text-cyan-600 mb-2" />
            <h4 className="text-xs font-bold text-slate-800 mb-1">
              {guide ? 'Reemplazar por nuevo archivo' : 'Haz clic para seleccionar la Guía de Auditoría'}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Soporta PDF, Word (.docx), Excel (.xlsx), CSV o imágenes (hasta 15 MB)
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsGuideModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditPlanManager;
