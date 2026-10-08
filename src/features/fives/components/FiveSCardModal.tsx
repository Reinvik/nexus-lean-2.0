import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FiveSCard, Profile, Company } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { formatDateForInput } from '../../../lib/utils';
import {
  Calendar,
  Activity,
  MapPin,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Camera,
  Plus,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FiveSCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FiveSCard | null;
  users: Profile[];
  companies: Company[];
  currentUser: any;
  targetCompanyId: string | null;
  onSave: (cardData: Partial<FiveSCard>) => Promise<boolean>;
  onDelete?: (cardId: string) => Promise<boolean>;
  onZoomImage: (url: string) => void;
}

export const FiveSCardModal: React.FC<FiveSCardModalProps> = ({
  isOpen,
  onClose,
  card,
  users,
  companies,
  currentUser,
  targetCompanyId,
  onSave,
  onDelete,
  onZoomImage,
}) => {
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<FiveSCard>>({});
  const [imageBeforeFiles, setImageBeforeFiles] = useState<File[]>([]);
  const [imageAfterFiles, setImageAfterFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (card) {
      let initialResponsible = card.responsible || '';
      if (!initialResponsible && card.assigned_to) {
        const found = users.find((u) => u.id === card.assigned_to);
        if (found) {
          initialResponsible = found.full_name || (found as any).name || found.email || '';
        }
      }

      setFormData({
        ...card,
        date: card.date || card.card_date || card.created_at,
        cardNumber: card.cardNumber || card.card_number || '',
        location: card.location || card.area || '',
        article: card.article || card.description || '',
        reason: card.reason || card.findings || '',
        proposedAction: card.proposedAction || card.closure_comment || '',
        category: card.category || 'Seiri',
        status: card.status || 'Abierto',
        responsible: initialResponsible,
        assigned_to: card.assigned_to || null,
        targetDate: card.targetDate || card.due_date || '',
        solutionDate: card.solutionDate || card.close_date || '',
        image_urls: card.image_urls || (card.image_url ? [card.image_url] : []),
        after_image_urls:
          card.after_image_urls || (card.after_image_url ? [card.after_image_url] : []),
      });
    } else {
      // New card defaults
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        date: today,
        cardNumber: '',
        location: '',
        article: '',
        reason: '',
        proposedAction: '',
        category: 'Seiri',
        status: 'Abierto',
        responsible: '',
        assigned_to: null,
        targetDate: '',
        solutionDate: '',
        image_urls: [],
        after_image_urls: [],
      });
    }
    setImageBeforeFiles([]);
    setImageAfterFiles([]);
  }, [card, isOpen, users]);

  // Lista de usuarios ordenada alfabéticamente
  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = (a.full_name || (a as any).name || a.email || '').trim().toLowerCase();
      const nameB = (b.full_name || (b as any).name || b.email || '').trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  }, [users]);

  const handleResponsibleChange = (selectedName: string) => {
    const matched = users.find(
      (u) =>
        ((u as any).name || u.full_name || u.email || '').trim().toLowerCase() ===
        selectedName.trim().toLowerCase()
    );
    setFormData((prev) => ({
      ...prev,
      responsible: selectedName,
      assigned_to: matched ? matched.id : (selectedName ? prev.assigned_to : null),
    }));
  };

  if (!isOpen) return null;

  const updateField = (field: keyof FiveSCard | string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Upload an image to Supabase Storage
  const uploadFileToSupabase = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const companyPath = targetCompanyId || 'default';
      const filePath = `${companyPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('five-s-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        // Fallback to 'images' bucket
        const { error: fallbackErr } = await supabase.storage
          .from('images')
          .upload(`5s/${filePath}`, file, { cacheControl: '3600', upsert: true });

        if (!fallbackErr) {
          const { data } = supabase.storage.from('images').getPublicUrl(`5s/${filePath}`);
          return data.publicUrl;
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.warn('Upload failed, creating data URL fallback:', err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddImage = (type: 'before' | 'after', file: File) => {
    const previewUrl = URL.createObjectURL(file);
    if (type === 'before') {
      if ((formData.image_urls?.length || 0) >= 5) {
        toast.error('Máximo 5 imágenes de Antes');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), previewUrl],
      }));
      setImageBeforeFiles((prev) => [...prev, file]);
    } else {
      if ((formData.after_image_urls?.length || 0) >= 5) {
        toast.error('Máximo 5 imágenes de Después');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        after_image_urls: [...(prev.after_image_urls || []), previewUrl],
      }));
      setImageAfterFiles((prev) => [...prev, file]);
    }
  };

  const handleRemoveImage = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      const urls = [...(formData.image_urls || [])];
      urls.splice(index, 1);
      setFormData((prev) => ({ ...prev, image_urls: urls }));
      setImageBeforeFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      const urls = [...(formData.after_image_urls || [])];
      urls.splice(index, 1);
      setFormData((prev) => ({ ...prev, after_image_urls: urls }));
      setImageAfterFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!formData.location?.trim() && !formData.area?.trim()) {
      toast.error('Por favor ingresa la ubicación');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando tarjeta 5S...');

    try {
      // Upload new before images
      let finalBeforeUrls = (formData.image_urls || []).filter(
        (url) => !url.startsWith('blob:')
      );
      if (imageBeforeFiles.length > 0) {
        const uploaded = await Promise.all(
          imageBeforeFiles.map((file) => uploadFileToSupabase(file))
        );
        finalBeforeUrls = [...finalBeforeUrls, ...uploaded.filter(Boolean) as string[]];
      }

      // Upload new after images
      let finalAfterUrls = (formData.after_image_urls || []).filter(
        (url) => !url.startsWith('blob:')
      );
      if (imageAfterFiles.length > 0) {
        const uploaded = await Promise.all(
          imageAfterFiles.map((file) => uploadFileToSupabase(file))
        );
        finalAfterUrls = [...finalAfterUrls, ...uploaded.filter(Boolean) as string[]];
      }

      // If status is closed and no close date, set today
      let finalSolutionDate = formData.solutionDate || formData.close_date || null;
      if (formData.status === 'Cerrado' && !finalSolutionDate) {
        finalSolutionDate = new Date().toISOString().split('T')[0];
      }

      // Status color
      let color = '#ef4444';
      if (formData.status === 'En Proceso' || formData.status === 'En Progreso') color = '#f59e0b';
      if (formData.status === 'Cerrado') color = '#10b981';

      // Auto-sequence card number if empty
      let finalCardNumber = formData.cardNumber || formData.card_number || '';
      if (!finalCardNumber || finalCardNumber === 'OFF' || finalCardNumber === '?') {
        const currentYear = new Date(formData.date || new Date()).getFullYear();
        const suffix = 'CIAL';
        try {
          const { data: lastCards } = await supabase
            .from('five_s_cards')
            .select('card_number')
            .ilike('card_number', `%/${currentYear}%`)
            .limit(500);

          let maxSeq = 0;
          if (lastCards && lastCards.length > 0) {
            lastCards.forEach((c) => {
              const match = c.card_number?.match(/^(\d+)\//);
              if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
              }
            });
          }
          finalCardNumber = `${maxSeq + 1}/${currentYear} ${suffix}`;
        } catch {
          finalCardNumber = `${Date.now().toString().slice(-4)}/${currentYear} ${suffix}`;
        }
      }

      const payload: Partial<FiveSCard> = {
        ...formData,
        cardNumber: finalCardNumber,
        card_number: finalCardNumber,
        area: formData.location || formData.area || 'General',
        location: formData.location || formData.area || 'General',
        description: formData.article || formData.description || '',
        article: formData.article || formData.description || '',
        findings: formData.reason || formData.findings || '',
        reason: formData.reason || formData.findings || '',
        status: formData.status || 'Abierto',
        statusColor: color,
        category: (formData.category || 'Seiri') as any,
        due_date: formData.targetDate || formData.due_date || null,
        targetDate: formData.targetDate || formData.due_date || null,
        close_date: finalSolutionDate,
        solutionDate: finalSolutionDate,
        closure_comment: formData.proposedAction || formData.closure_comment || null,
        proposedAction: formData.proposedAction || formData.closure_comment || null,
        image_urls: finalBeforeUrls,
        image_url: finalBeforeUrls[0] || null,
        after_image_urls: finalAfterUrls,
        after_image_url: finalAfterUrls[0] || null,
        date: formData.date || new Date().toISOString().split('T')[0],
        card_date: formData.date || new Date().toISOString().split('T')[0],
        responsible: formData.responsible || null,
        assigned_to: formData.assigned_to || null,
      };

      const success = await onSave(payload);
      if (success) {
        toast.success('¡Tarjeta 5S guardada correctamente!', { id: toastId });
        onClose();
      } else {
        toast.error('Error al guardar la tarjeta', { id: toastId });
      }
    } catch (err: any) {
      console.error('Error in handleSave:', err);
      toast.error('Error: ' + (err.message || 'Desconocido'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!card?.id || !onDelete) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
      const toastId = toast.loading('Eliminando tarjeta...');
      const ok = await onDelete(card.id);
      if (ok) {
        toast.success('Tarjeta eliminada correctamente', { id: toastId });
        onClose();
      } else {
        toast.error('Error al eliminar la tarjeta', { id: toastId });
      }
    }
  };

  const cardCompanyName =
    companies.find((c) => c.id === (card?.company_id || card?.companyId))?.name || '';

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-3 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden my-auto ${
          isModalMaximized
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-6xl xl:max-w-7xl max-h-[96vh] md:rounded-2xl border border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className="px-4 md:px-6 py-2.5 md:py-3 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                card?.id ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {card?.id ? <FileText size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-800">
                  {card?.id ? (
                    <>
                      Tarjeta {cardCompanyName} {formData.cardNumber || card.cardNumber || '...'}
                    </>
                  ) : (
                    'Nueva Tarjeta 5S'
                  )}
                </h2>
                {formData.status && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      formData.status === 'Cerrado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : formData.status === 'En Proceso' || formData.status === 'En Progreso'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {formData.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Complete la información del hallazgo y las evidencias fotográficas
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            {/* Delete Button */}
            {card?.id && (currentUser?.isGlobalAdmin || currentUser?.canAccessAdmin) && (
              <button
                onClick={handleDelete}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar Tarjeta"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              title="Guardar Tarjeta"
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
            </button>

            {/* Maximize Button */}
            <button
              onClick={() => setIsModalMaximized(!isModalMaximized)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={isModalMaximized ? 'Minimizar' : 'Pantalla Completa'}
            >
              {isModalMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left form, Right images */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-y-auto custom-scrollbar">
          {/* Left Column: Main Form */}
          <div className="flex-1 p-4 md:p-5 space-y-2.5 sm:space-y-3">
            {/* Row 1: General Info (4 columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Calendar size={13} className="text-slate-400" /> Fecha Tarjeta
                </label>
                <input
                  type="date"
                  className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 shadow-sm"
                  value={formatDateForInput(formData.date) || ''}
                  onChange={(e) => updateField('date', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Activity size={13} className="text-slate-400" /> Nº Tarjeta
                </label>
                <input
                  type="text"
                  className={`w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm ${
                    !currentUser?.isGlobalAdmin
                      ? 'bg-slate-50 text-slate-600 cursor-not-allowed font-medium'
                      : 'bg-white text-slate-900 font-bold'
                  }`}
                  value={formData.cardNumber || ''}
                  onChange={(e) => updateField('cardNumber', e.target.value)}
                  placeholder="Ej: 1/2026 CIAL"
                  readOnly={!currentUser?.isGlobalAdmin}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Activity size={13} className="text-indigo-500" /> Categoría 5S
                </label>
                <select
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 font-medium cursor-pointer shadow-sm"
                  value={formData.category || 'Seiri'}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  <option value="Seiri">Seiri (Clasificar)</option>
                  <option value="Seiton">Seiton (Ordenar)</option>
                  <option value="Seiso">Seiso (Limpiar)</option>
                  <option value="Seiketsu">Seiketsu (Estandarizar)</option>
                  <option value="Shitsuke">Shitsuke (Disciplina)</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Calidad">Calidad</option>
                  <option value="Medio Ambiente">Medio Ambiente</option>
                  <option value="Otro">Otro / Mejora</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Activity size={13} className="text-slate-400" /> Estado
                </label>
                <select
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 cursor-pointer shadow-sm"
                  value={formData.status || 'Abierto'}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <option value="Abierto">Abierto</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>
            </div>

            {/* Row 2: Location and Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <MapPin size={13} className="text-slate-500" /> Ubicación
                </label>
                <input
                  type="text"
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400 shadow-sm"
                  value={formData.location || ''}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Ej: Pasillo 4, Línea 2, Almacén"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <FileText size={13} className="text-slate-500" /> Artículo / Equipo
                </label>
                <input
                  type="text"
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400 shadow-sm"
                  value={formData.article || ''}
                  onChange={(e) => updateField('article', e.target.value)}
                  placeholder="Ej: Estantería B, Motor 3, Mesa de empaque"
                />
              </div>
            </div>

            {/* Row 3: Razón de Tarjeta */}
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <AlertCircle size={13} className="text-amber-500" /> Razón de Tarjeta (Hallazgo)
              </label>
              <textarea
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-sm font-medium text-slate-900 placeholder-slate-400 leading-relaxed"
                rows={2}
                value={formData.reason || ''}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="Describe detalladamente la anomalía o desperdicio detectado..."
              />
            </div>

            {/* Row 4: Acción Propuesta */}
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                <CheckCircle size={13} className="text-emerald-600" /> Acción Propuesta
              </label>
              <textarea
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-sm font-medium text-slate-900 placeholder-slate-400 leading-relaxed"
                rows={2}
                value={formData.proposedAction || ''}
                onChange={(e) => updateField('proposedAction', e.target.value)}
                placeholder="Describe la acción correctiva sugerida..."
              />
            </div>

            {/* Row 5: Responsible & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <User size={13} className="text-slate-500" /> Responsable
                </label>
                <select
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm text-slate-900 font-medium cursor-pointer"
                  value={formData.responsible || ''}
                  onChange={(e) => handleResponsibleChange(e.target.value)}
                >
                  <option value="">Selecciona Responsable...</option>
                  {formData.responsible &&
                    !sortedUsers.some(
                      (u) =>
                        ((u as any).name || u.full_name || u.email || '').trim().toLowerCase() ===
                        formData.responsible?.trim().toLowerCase()
                    ) && (
                      <option value={formData.responsible}>{formData.responsible}</option>
                    )}
                  {sortedUsers.map((u) => {
                    const name = (u as any).name || u.full_name || u.email || '';
                    if (!name) return null;
                    return (
                      <option key={u.id} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Clock size={13} className="text-slate-500" /> Fecha Propuesta
                </label>
                <input
                  type="date"
                  className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm text-slate-900 font-medium"
                  value={formatDateForInput(formData.targetDate) || ''}
                  onChange={(e) => updateField('targetDate', e.target.value)}
                />
              </div>

              <div>
                <label
                  className={`text-xs font-semibold flex items-center gap-1.5 mb-1 ${
                    formData.status === 'Cerrado' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle size={13} /> Fecha Solución (Cierre)
                </label>
                <input
                  type="date"
                  className={`w-full py-1.5 px-2.5 text-xs border rounded-lg focus:ring-2 outline-none transition-all shadow-sm font-medium ${
                    formData.status === 'Cerrado'
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  value={formatDateForInput(formData.solutionDate) || ''}
                  onChange={(e) => updateField('solutionDate', e.target.value)}
                  disabled={formData.status !== 'Cerrado'}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Evidencia Fotográfica */}
          <div className="w-full lg:w-[360px] xl:w-[400px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera size={15} className="text-blue-600" /> Evidencia Fotográfica
              </label>
              <span className="text-[10px] font-medium text-slate-400">Antes y Después</span>
            </div>

            {/* Fotos Antes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  1. El Problema (Antes)
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {formData.image_urls?.length || 0} / 5
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(formData.image_urls || []).map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group shadow-sm bg-white"
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => onZoomImage(url)}
                      alt={`Antes ${idx + 1}`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomImage(url);
                        }}
                        className="p-1 bg-white/20 backdrop-blur-md text-white rounded hover:bg-white/40 transition-colors"
                        title="Ampliar"
                      >
                        <Maximize2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage('before', idx);
                        }}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {(formData.image_urls?.length || 0) < 5 && (
                  <label className="aspect-square bg-white rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
                    <Plus
                      size={18}
                      className="text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all"
                    />
                    <span className="text-[10px] font-semibold text-slate-500 group-hover:text-blue-500 mt-0.5">
                      Añadir
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleAddImage('before', e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Fotos Después */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  2. La Solución (Después)
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {formData.after_image_urls?.length || 0} / 5
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(formData.after_image_urls || []).map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group shadow-sm bg-white"
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => onZoomImage(url)}
                      alt={`Después ${idx + 1}`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomImage(url);
                        }}
                        className="p-1 bg-white/20 backdrop-blur-md text-white rounded hover:bg-white/40 transition-colors"
                        title="Ampliar"
                      >
                        <Maximize2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage('after', idx);
                        }}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {(formData.after_image_urls?.length || 0) < 5 && (
                  <label className="aspect-square bg-white rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group">
                    <Plus
                      size={18}
                      className="text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all"
                    />
                    <span className="text-[10px] font-semibold text-slate-500 group-hover:text-emerald-500 mt-0.5">
                      Añadir
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleAddImage('after', e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Botón de Guardar en Móvil */}
            <div className="lg:hidden pt-2 pb-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all text-xs"
              >
                <Save size={16} />
                <span>Guardar Tarjeta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FiveSCardModal;
