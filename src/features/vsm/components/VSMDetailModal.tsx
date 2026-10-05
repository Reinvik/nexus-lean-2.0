import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Save,
  Activity,
  Image as ImageIcon,
  Clock,
  Sparkles,
  BarChart2,
  Upload,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Profile } from '../../../types';
import type { VSMProject, VSMStep } from '../types';
import {
  parseVSMDescription,
  serializeVSMDescription,
  calculateVSMMetrics,
  DEFAULT_VSM_STEPS,
} from '../utils/vsmHelpers';
import { VSMMiroViewer } from './VSMMiroViewer';
import { VSMSawtoothTimeline } from './VSMSawtoothTimeline';
import { VSMQuickWinA3BridgeModal } from './VSMQuickWinA3BridgeModal';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface VSMDetailModalProps {
  vsm: VSMProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<VSMProject>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  users: Profile[];
  onUploadImage: (file: File) => Promise<string | null>;
}

export const VSMDetailModal: React.FC<VSMDetailModalProps> = ({
  vsm,
  isOpen,
  onClose,
  onSave,
  onDelete,
  users,
  onUploadImage,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'sawtooth' | 'miro' | 'photo' | 'balance'>('sawtooth');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form draft state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'current' | 'future' | 'completed'>('current');
  const [miroLink, setMiroLink] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Dynamic Process steps & Demand parameters
  const [steps, setSteps] = useState<VSMStep[]>(DEFAULT_VSM_STEPS);
  const [availableTimeHours, setAvailableTimeHours] = useState(8);
  const [customerDemandUnits, setCustomerDemandUnits] = useState(480);

  // Kaizen Burst Bridge state
  const [bridgeStep, setBridgeStep] = useState<VSMStep | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vsm) {
      setName(vsm.name || '');
      setResponsible(vsm.responsible || '');
      setDate(vsm.date || new Date().toISOString().split('T')[0]);
      setStatus(vsm.status || 'current');
      setMiroLink(vsm.miro_link || '');
      setImageUrl(vsm.image_url || null);

      // Parse rich metadata from description
      const parsed = parseVSMDescription(vsm.description);
      setDescription(parsed.textDescription);
      setSteps(parsed.steps);
      setAvailableTimeHours(parsed.availableTimeHours);
      setCustomerDemandUnits(parsed.customerDemandUnits);
    }
  }, [vsm]);

  if (!isOpen || !vsm) return null;

  // Real-time calculated Lean metrics
  const metrics = calculateVSMMetrics(steps, availableTimeHours, customerDemandUnits);

  const handleStepUpdate = (index: number, updated: VSMStep) => {
    const newSteps = [...steps];
    newSteps[index] = updated;
    setSteps(newSteps);
  };

  const handleAddStep = () => {
    const newStep: VSMStep = {
      id: `step-${Date.now()}`,
      name: `Nueva Operación ${steps.length + 1}`,
      cycleTime: 40,
      changeoverTime: 10,
      operators: 1,
      uptime: 95,
      wipUnits: 50,
      waitTimeHours: 4,
      scrapRate: 1,
      hasKaizenBurst: false,
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('El flujo debe tener al menos una etapa');
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        setImageUrl(url);
        toast.success('Foto de pizarra Gemba cargada');
      }
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre del mapa VSM es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const serializedDesc = serializeVSMDescription(
        description,
        steps,
        availableTimeHours,
        customerDemandUnits
      );

      const payload: Partial<VSMProject> = {
        id: vsm.id,
        name: name.trim(),
        description: serializedDesc,
        responsible: responsible || null,
        date: date || null,
        status,
        lead_time: `${metrics.totalLeadTimeDays} días`,
        process_time: `${metrics.totalCycleTimeSeconds}s`,
        efficiency: `${metrics.pcePercentage}%`,
        takt_time: `${metrics.taktTimeSeconds}s`,
        image_url: imageUrl,
        miro_link: miroLink.trim() || null,
      };

      await onSave(payload);
      toast.success('Mapa VSM y flujo de valor guardados');
      onClose();
    } catch (error: any) {
      console.error('Error saving VSM:', error);
      toast.error('Error al guardar: ' + (error?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Deseas eliminar este mapa de flujo de valor definitivamente?')) {
      await onDelete(vsm.id);
      onClose();
    }
  };

  // Yamazumi Chart Data (Cycle Time vs Takt Time)
  const yamazumiData = steps.map((s) => ({
    name: s.name,
    cycleTime: s.cycleTime,
    taktTime: metrics.taktTimeSeconds,
    isBottleneck: s.cycleTime > metrics.taktTimeSeconds,
  }));

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-3 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-white shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-all ${
          isMaximized
            ? 'w-full h-full rounded-none'
            : 'w-full h-full md:w-[96vw] md:h-[94vh] rounded-none md:rounded-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 flex justify-between items-center border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Activity size={20} />
            </div>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del VSM..."
                className="font-black text-xl text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none transition-all w-[240px] sm:w-[380px]"
              />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">{vsm.id ? 'Edición de Mapa' : 'Nuevo Mapa'}</span>
                <span>•</span>
                <span>{metrics.totalLeadTimeDays} días de Lead Time</span>
                <span>•</span>
                <span className="text-emerald-600 font-bold">{metrics.pcePercentage}% PCE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {vsm.id && (
              <button
                onClick={handleDelete}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Eliminar Mapa"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              title={isMaximized ? 'Restaurar tamaño' : 'Pantalla completa'}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Body: Left Sidebar Form + Right Tabs Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-100/50">
          {/* Left Column: Form & Configuration Drawer (1/3 or 340px) */}
          <div className="w-full lg:w-80 xl:w-96 p-5 overflow-y-auto border-r border-slate-200 bg-white space-y-5 custom-scrollbar shrink-0">
            {/* General Info */}
            <div className="space-y-3">
              <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <User size={13} className="text-blue-600" />
                <span>Datos del Proyecto</span>
              </h4>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Responsable
                </label>
                <select
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="">Seleccionar Responsable...</option>
                  {users.map((u) => {
                    const userName = (u as any).name || u.full_name || u.email || '';
                    return (
                      <option key={u.id} value={userName}>
                        {userName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Estado VSM
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="current">Actual</option>
                    <option value="future">Futuro</option>
                    <option value="completed">Finalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Alcance / Descripción
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Familia de productos, cliente y límites del proceso..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Demanda y Ritmo de Cliente (Takt Time) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-600" />
                <span>Demanda y Takt Time</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Turno (Horas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={availableTimeHours}
                    onChange={(e) => setAvailableTimeHours(Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Demanda (Unid)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customerDemandUnits}
                    onChange={(e) => setCustomerDemandUnits(Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-900">Takt Time Requerido:</span>
                <span className="font-black font-mono text-cyan-700 text-sm">
                  {metrics.taktTimeSeconds} seg/unid
                </span>
              </div>
            </div>

            {/* Miro Integration Field */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink size={13} className="text-amber-500" />
                  <span>Enlace de Miro</span>
                </h4>
                {miroLink && (
                  <a
                    href={miroLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    Abrir ↗
                  </a>
                )}
              </div>
              <input
                type="text"
                value={miroLink}
                onChange={(e) => setMiroLink(e.target.value)}
                placeholder="https://miro.com/app/board/..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Gemba Photo Attachment */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-purple-600" />
                  <span>Foto Pizarra Gemba</span>
                </h4>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {isUploading ? 'Subiendo...' : imageUrl ? 'Cambiar Foto' : '+ Subir'}
                </button>
              </div>

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] group">
                  <img src={imageUrl} alt="Pizarra Gemba" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Quitar foto"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          {/* Right Main Area: Interactive Tabs & Visualizers */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* View Switcher Tabs Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('sawtooth')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'sawtooth'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock size={14} />
                  <span>Data Boxes & Escalera</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('balance')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'balance'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 size={14} />
                  <span>Balanceo Yamazumi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('miro')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'miro'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink size={14} />
                  <span>Lienzo Miro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('photo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'photo'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>Pizarra Gemba</span>
                </button>
              </div>

              {/* Status pill preview */}
              <div className="hidden sm:flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    metrics.isBalanced
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {metrics.isBalanced ? '✓ Flujo Balanceado' : '⚠ Cuello de Botella'}
                </span>
              </div>
            </div>

            {/* Tab Panels Container */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Tab 1: Sawtooth Timeline & Data Boxes */}
              {activeTab === 'sawtooth' && (
                <VSMSawtoothTimeline
                  steps={steps}
                  metrics={metrics}
                  isEditing={true}
                  onUpdateStep={handleStepUpdate}
                  onAddStep={handleAddStep}
                  onRemoveStep={handleRemoveStep}
                  onTriggerKaizenBurst={(step) => setBridgeStep(step)}
                />
              )}

              {/* Tab 2: Yamazumi Balance Chart */}
              {activeTab === 'balance' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-base text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <BarChart2 className="text-cyan-500" size={20} />
                        <span>Gráfico de Balanceo de Operaciones vs Takt Time</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Las barras que superan la línea roja punteada (Takt Time) representan sobrecarga y retrasos en la entrega.
                      </p>
                    </div>

                    <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-200">
                      Takt Time: {metrics.taktTimeSeconds}s
                    </span>
                  </div>

                  <div className="w-full h-80 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yamazumiData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#475569', fontSize: 11 }}
                          unit="s"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#ffffff',
                          }}
                        />
                        <ReferenceLine
                          y={metrics.taktTimeSeconds}
                          label={{
                            value: `Takt: ${metrics.taktTimeSeconds}s`,
                            fill: '#e11d48',
                            fontSize: 12,
                            fontWeight: 'bold',
                            position: 'top',
                          }}
                          stroke="#e11d48"
                          strokeWidth={2}
                          strokeDasharray="6 6"
                        />
                        <Bar
                          dataKey="cycleTime"
                          name="Tiempo de Ciclo (s)"
                          fill="#0284c7"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 3: Miro Board Embed */}
              {activeTab === 'miro' && <VSMMiroViewer miroLink={miroLink} />}

              {/* Tab 4: Physical Whiteboard Gemba Photo */}
              {activeTab === 'photo' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
                  {imageUrl ? (
                    <div className="w-full flex flex-col items-center">
                      <img
                        src={imageUrl}
                        alt="Pizarra Gemba"
                        className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg border border-slate-200 mb-4"
                      />
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} />
                        <span>Abrir imagen en resolución original</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <ImageIcon size={54} className="mx-auto mb-3 opacity-30" />
                      <h4 className="font-bold text-slate-700 text-base mb-1">
                        Sin foto de la pizarra Gemba
                      </h4>
                      <p className="text-xs max-w-sm mb-4">
                        Sube una foto del mapa físico con papel kraft y post-its realizado durante el taller de mapeo en planta.
                      </p>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                      >
                        Subir Foto de Pizarra
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Lead Time: <b className="text-slate-800">{metrics.totalLeadTimeDays} días</b> | VA: <b className="text-cyan-700">{metrics.totalCycleTimeSeconds}s</b> | PCE: <b className="text-emerald-700">{metrics.pcePercentage}%</b>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-xs uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Mapa VSM'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kaizen Burst Bridge Modal (Direct conversion to Quick Win or A3) */}
      <VSMQuickWinA3BridgeModal
        step={bridgeStep}
        vsmName={name}
        isOpen={!!bridgeStep}
        onClose={() => setBridgeStep(null)}
        onSuccess={() => {
          if (bridgeStep) {
            // Update the step with Kaizen Burst flag
            const stepIdx = steps.findIndex((s) => s.id === bridgeStep.id);
            if (stepIdx !== -1) {
              handleStepUpdate(stepIdx, { ...bridgeStep, hasKaizenBurst: true });
            }
          }
        }}
      />
    </div>,
    document.body
  );
};
