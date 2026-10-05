import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Edit,
  Trash2,
  Check,
  User,
  Calendar,
  Zap,
  Target,
  Upload,
  CheckCircle,
  Search,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { QuickWin, Profile } from '../../../types';
import {
  ensureArray,
  getCategoryStyles,
  CAUSES_COLUMNS,
} from '../utils/quickWinsHelpers';

interface DetailEditModalProps {
  win: QuickWin | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedWin: QuickWin) => Promise<void>;
  onDelete: (winId: string) => Promise<void>;
  onOpenCompleteModal?: (winId: string) => void;
  users: Profile[];
  onUploadImage: (file: File) => Promise<string | null>;
  onZoomImage: (url: string) => void;
}

export const DetailEditModal: React.FC<DetailEditModalProps> = ({
  win,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenCompleteModal,
  users,
  onUploadImage,
  onZoomImage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<QuickWin | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editBeforeFileRef = useRef<HTMLInputElement>(null);
  const editAfterFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (win) {
      setDraft({ ...win });
      setIsEditing(false);
    } else {
      setDraft(null);
      setIsEditing(false);
    }
  }, [win]);

  if (!isOpen || !win || !draft) return null;

  const isDone = win.status === 'done';
  const causeInfo = CAUSES_COLUMNS.find((c) => c.id === (isEditing ? draft.cause : win.cause));

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error('El título no puede estar vacío');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving win:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este Quick Win de forma permanente?')) {
      await onDelete(win.id);
      onClose();
    }
  };

  const handleUploadBeforeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onUploadImage(file);
    if (url) {
      const current = ensureArray(draft.image_urls || (draft.image_url ? [draft.image_url] : []));
      setDraft({
        ...draft,
        image_urls: [...current, url],
        image_url: url,
      });
      toast.success('Foto antes agregada');
    }
    if (editBeforeFileRef.current) editBeforeFileRef.current.value = '';
  };

  const handleUploadAfterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onUploadImage(file);
    if (url) {
      const current = ensureArray(
        draft.completion_image_urls || (draft.completion_image_url ? [draft.completion_image_url] : [])
      );
      setDraft({
        ...draft,
        completion_image_urls: [...current, url],
        completion_image_url: url,
      });
      toast.success('Foto después agregada');
    }
    if (editAfterFileRef.current) editAfterFileRef.current.value = '';
  };

  const beforeUrls = isEditing
    ? ensureArray(draft.image_urls || (draft.image_url ? [draft.image_url] : []))
    : ensureArray(win.image_urls || (win.image_url ? [win.image_url] : []));

  const afterUrls = isEditing
    ? ensureArray(draft.completion_image_urls || (draft.completion_image_url ? [draft.completion_image_url] : []))
    : ensureArray(win.completion_image_urls || (win.completion_image_url ? [win.completion_image_url] : []));

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-start bg-slate-50">
          <div className="flex-grow mr-4">
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                isDone
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}
            >
              {isDone ? 'COMPLETADO' : 'EN PROCESO'}
            </span>

            {isEditing ? (
              <input
                className="w-full font-bold text-xl md:text-2xl text-slate-900 mt-2 bg-white border border-blue-300 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Título del Quick Win"
              />
            ) : (
              <h3 className="font-black text-xl md:text-2xl text-slate-800 mt-2 tracking-tight">
                {win.title}
              </h3>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-grow">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsable */}
            <div
              className={`${
                isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-slate-50 border-slate-100'
              } p-3.5 rounded-xl border`}
            >
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">
                Responsable
              </label>
              {isEditing ? (
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-xs appearance-none font-bold cursor-pointer"
                    value={draft.responsible || ''}
                    onChange={(e) => setDraft({ ...draft, responsible: e.target.value })}
                  >
                    <option value="">Sin asignar</option>
                    {users.map((u) => {
                      const name = (u as any).name || u.full_name || u.email || '';
                      return (
                        <option key={u.id} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                    {win.responsible ? win.responsible.charAt(0).toUpperCase() : <User size={12} />}
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    {win.responsible || 'Sin asignar'}
                  </span>
                </div>
              )}
            </div>

            {/* Fecha Límite */}
            <div
              className={`${
                isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-slate-50 border-slate-100'
              } p-3.5 rounded-xl border`}
            >
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">
                Fecha Límite
              </label>
              {isEditing ? (
                <input
                  type="date"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-xs font-bold"
                  value={draft.deadline || ''}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-800">
                    {win.deadline ? new Date(win.deadline).toLocaleDateString() : 'Sin fecha límite'}
                  </span>
                </div>
              )}
            </div>

            {/* Categoría */}
            <div
              className={`${
                isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-slate-50 border-slate-100'
              } p-3.5 rounded-xl border`}
            >
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">
                Categoría
              </label>
              {isEditing ? (
                <select
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-xs font-bold"
                  value={draft.category || 'operacional'}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  <option value="operacional">Operacional</option>
                  <option value="almacen">Almacén</option>
                  <option value="proceso">Proceso</option>
                  <option value="sistemico">Sistémico</option>
                  <option value="fisica">Física</option>
                </select>
              ) : (
                <span
                  className={`text-[11px] font-black px-2.5 py-1 rounded-md text-white ${
                    getCategoryStyles(win.category).bg
                  }`}
                >
                  {getCategoryStyles(win.category).label.toUpperCase()}
                </span>
              )}
            </div>

            {/* Causa Raíz */}
            <div
              className={`${
                isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-slate-50 border-slate-100'
              } p-3.5 rounded-xl border`}
            >
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">
                Clasificación / Causa Raíz
              </label>
              {isEditing ? (
                <select
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-xs font-bold"
                  value={draft.cause || 'infra'}
                  onChange={(e) => setDraft({ ...draft, cause: e.target.value })}
                >
                  {CAUSES_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-bold text-slate-800">
                  {causeInfo?.title || 'Infraestructura'}
                </span>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div
            className={`${
              isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-slate-50 border-slate-100'
            } p-4 rounded-xl border`}
          >
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">
              Descripción del Problema
            </h4>
            {isEditing ? (
              <textarea
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium text-sm"
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            ) : (
              <p className="text-slate-800 leading-relaxed font-medium text-sm">
                {win.description || 'Sin descripción'}
              </p>
            )}
          </div>

          {/* Solution */}
          {(win.proposed_solution || isEditing) && (
            <div
              className={`${
                isEditing ? 'bg-white border-blue-200 ring-1 ring-blue-50' : 'bg-blue-50/50 border-blue-100'
              } p-4 rounded-xl border`}
            >
              <h4 className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-wider flex items-center gap-1.5">
                <Zap size={14} /> Solución Implementada / Propuesta
              </h4>
              {isEditing ? (
                <textarea
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold text-sm"
                  value={draft.proposed_solution || ''}
                  onChange={(e) => setDraft({ ...draft, proposed_solution: e.target.value })}
                />
              ) : (
                <p className="text-slate-800 leading-relaxed font-bold text-sm">
                  {win.proposed_solution}
                </p>
              )}
            </div>
          )}

          {/* Coordinates in Matrix (Impact vs Effort) */}
          <div
            className={`${
              isEditing ? 'bg-white border-amber-200 ring-2 ring-amber-50' : 'bg-slate-50 border-slate-100'
            } p-4 rounded-xl border`}
          >
            <h4 className="text-[10px] font-black text-amber-600 uppercase mb-3 tracking-wider flex items-center gap-1.5">
              <Target size={14} /> Posicionamiento en Matriz (1 a 10)
            </h4>

            <div className="space-y-4">
              {/* Impact */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-600">
                  <span>Magnitud de Impacto</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-black">
                    {isEditing ? draft.impact_score : win.impact_score ?? 5} / 10
                  </span>
                </div>
                {isEditing ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDraft({ ...draft, impact_score: n })}
                        className={`h-7 flex-grow rounded text-xs font-black transition-all ${
                          draft.impact_score === n
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-100 hover:bg-emerald-100 text-slate-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${((win.impact_score ?? 5) / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Effort */}
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-600">
                  <span>Nivel de Esfuerzo Requerido</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-black">
                    {isEditing ? draft.effort_score : win.effort_score ?? 5} / 10
                  </span>
                </div>
                {isEditing ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDraft({ ...draft, effort_score: n })}
                        className={`h-7 flex-grow rounded text-xs font-black transition-all ${
                          draft.effort_score === n
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-100 hover:bg-blue-100 text-slate-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${((win.effort_score ?? 5) / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completion Comment */}
          {(win.completion_comment || (isEditing && draft.status === 'done')) && (
            <div
              className={`${
                isEditing ? 'bg-white border-emerald-200 ring-1 ring-emerald-50' : 'bg-emerald-50/50 border-emerald-100'
              } p-4 rounded-xl border`}
            >
              <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-wider">
                Resultado Final Kaizen
              </h4>
              {isEditing ? (
                <textarea
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 text-sm"
                  value={draft.completion_comment || ''}
                  onChange={(e) => setDraft({ ...draft, completion_comment: e.target.value })}
                />
              ) : (
                <p className="text-slate-800 leading-relaxed italic font-medium text-sm">
                  "{win.completion_comment}"
                </p>
              )}
            </div>
          )}

          {/* Photos Comparison */}
          <div className="space-y-6 pt-2">
            {/* Before Photos */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Evidencia "Antes"
                </h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => editBeforeFileRef.current?.click()}
                    className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                  >
                    + AGREGAR FOTO
                  </button>
                )}
              </div>

              {beforeUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {beforeUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm"
                    >
                      <img src={url} className="w-full h-full object-cover" alt={`Antes ${i + 1}`} />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => onZoomImage(url)}
                          className="p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"
                          title="Ampliar"
                        >
                          <Search size={14} />
                        </button>
                        {isEditing && (
                          <button
                            onClick={() =>
                              setDraft({
                                ...draft,
                                image_urls: (draft.image_urls || []).filter((_, idx) => idx !== i),
                              })
                            }
                            className="p-2 bg-rose-500 rounded-full text-white hover:scale-110 transition-transform"
                            title="Eliminar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                  <Upload size={22} className="opacity-30 mb-1" />
                  <span className="text-[11px] font-bold uppercase">Sin foto inicial</span>
                </div>
              )}

              <input
                ref={editBeforeFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadBeforeImage}
              />
            </div>

            {/* After Photos */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                  Evidencia "Después"
                </h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => editAfterFileRef.current?.click()}
                    className="text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors"
                  >
                    + AGREGAR FOTO
                  </button>
                )}
              </div>

              {afterUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {afterUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm"
                    >
                      <img src={url} className="w-full h-full object-cover" alt={`Después ${i + 1}`} />
                      <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => onZoomImage(url)}
                          className="p-2 bg-white rounded-full text-emerald-900 hover:scale-110 transition-transform"
                          title="Ampliar"
                        >
                          <Search size={14} />
                        </button>
                        {isEditing && (
                          <button
                            onClick={() =>
                              setDraft({
                                ...draft,
                                completion_image_urls: (draft.completion_image_urls || []).filter(
                                  (_, idx) => idx !== i
                                ),
                              })
                            }
                            className="p-2 bg-rose-500 rounded-full text-white hover:scale-110 transition-transform"
                            title="Eliminar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                  <CheckCircle size={22} className="opacity-30 mb-1" />
                  <span className="text-[11px] font-bold uppercase">Sin fotos de cierre</span>
                </div>
              )}

              <input
                ref={editAfterFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadAfterImage}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
          <div>
            {!isEditing && !isDone && onOpenCompleteModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCompleteModal(win.id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                <Check size={14} />
                <span>Completar Quick Win</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-1.5 text-xs uppercase tracking-wider disabled:opacity-50 transition-all"
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-colors text-xs uppercase tracking-wider"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
