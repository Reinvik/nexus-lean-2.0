import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Zap,
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  ChevronDown,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { QuickWin, Profile } from '../../types';
import { HeaderWithFilter } from '../../components/common/HeaderWithFilter';

// Subcomponents
import { QuickWinCard } from './components/QuickWinCard';
import { MatrixView } from './components/MatrixView';
import { RootCausesView } from './components/RootCausesView';
import { NewIdeaModal, type NewIdeaFormData } from './components/NewIdeaModal';
import { CompletionModal } from './components/CompletionModal';
import { DetailEditModal } from './components/DetailEditModal';
import { ZoomLightbox } from './components/ZoomLightbox';

// Services
import { exportQuickWinsToExcel } from './services/quickWinsExportService';

export const QuickWinsPage: React.FC = () => {
  const { globalFilterCompanyId, user, activeCompanyId } = useAuth();

  // Local filters & active tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'idea' | 'done'>('all');
  const [filterImpact, setFilterImpact] = useState<'all' | 'Alto' | 'Medio' | 'Bajo'>('all');
  const [activeTab, setActiveTab] = useState<'resumen' | 'matriz' | 'causas'>('resumen');

  // Modals state
  const [selectedWin, setSelectedWin] = useState<QuickWin | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [completionModalWinId, setCompletionModalWinId] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Data & loading state
  const [allWins, setAllWins] = useState<QuickWin[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Target company resolution
  const targetCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.isGlobalAdmin) {
      return globalFilterCompanyId && globalFilterCompanyId !== 'all'
        ? globalFilterCompanyId
        : activeCompanyId || null;
    }
    return user.company_id || user.companyId || null;
  }, [user, globalFilterCompanyId, activeCompanyId]);

  // Fetch Quick Wins
  const fetchWins = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('quick_wins')
        .select('*')
        .order('created_at', { ascending: false });

      if (!user.isGlobalAdmin) {
        const compId = user.company_id || user.companyId;
        if (compId) {
          query = query.eq('company_id', compId);
        } else {
          setAllWins([]);
          setLoading(false);
          return;
        }
      } else {
        if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
          query = query.eq('company_id', globalFilterCompanyId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      setAllWins((data as QuickWin[]) || []);
    } catch (error: any) {
      console.error('Error fetching Quick Wins:', error);
      toast.error('Error al cargar Quick Wins: ' + (error?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [user, globalFilterCompanyId]);

  // Fetch users for responsible assignment
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('profiles').select('*');

      if (!user.isGlobalAdmin) {
        const compId = user.company_id || user.companyId;
        if (compId) {
          query = query.eq('company_id', compId);
        }
      } else {
        if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
          query = query.eq('company_id', globalFilterCompanyId);
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers((data as Profile[]) || []);
    } catch (err) {
      console.error('Unexpected error fetching users:', err);
    }
  }, [user, globalFilterCompanyId]);

  useEffect(() => {
    fetchWins();
    fetchUsers();
  }, [fetchWins, fetchUsers]);

  // Filtered wins
  const filteredWins = useMemo(() => {
    return allWins.filter((win) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (win.title || '').toLowerCase().includes(term) ||
        (win.description || '').toLowerCase().includes(term) ||
        (win.responsible || '').toLowerCase().includes(term);

      const matchesStatus = filterStatus === 'all' || win.status === filterStatus;
      const matchesImpact = filterImpact === 'all' || win.impact === filterImpact;

      return matchesSearch && matchesStatus && matchesImpact;
    });
  }, [allWins, searchTerm, filterStatus, filterImpact]);

  // KPIs
  const kpiData = useMemo(() => {
    const total = filteredWins.length;
    const done = filteredWins.filter((w) => w.status === 'done').length;
    const ideas = filteredWins.filter((w) => w.status !== 'done').length;
    const highImpact = filteredWins.filter((w) => w.impact === 'Alto').length;

    return { total, done, ideas, highImpact };
  }, [filteredWins]);

  // Storage Image Upload Handler
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const companyPath =
        globalFilterCompanyId && globalFilterCompanyId !== 'all'
          ? globalFilterCompanyId
          : 'global';
      const filePath = `${companyPath}/quickwins/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('five-s-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen: ' + (error?.message || ''));
      return null;
    }
  };

  // Create New Quick Win Idea
  const handleCreateIdea = async (formData: NewIdeaFormData) => {
    if (!user) {
      toast.error('Usuario no autenticado.');
      return;
    }

    if (!targetCompanyId) {
      toast.error('No se pudo determinar la empresa para el registro.');
      return;
    }

    try {
      const { error } = await supabase.from('quick_wins').insert({
        title: formData.title,
        description: formData.description,
        proposed_solution: formData.proposed_solution || null,
        impact: formData.impact,
        responsible: formData.responsible || null,
        deadline: formData.deadline || null,
        status: 'idea',
        image_url: formData.image_urls[0] || null,
        image_urls: formData.image_urls || [],
        company_id: targetCompanyId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        category: formData.category,
        cause: formData.cause,
        impact_score: formData.impact_score,
        effort_score: formData.effort_score,
      });

      if (error) throw error;

      toast.success('¡Idea registrada exitosamente!');
      await fetchWins();
    } catch (error: any) {
      console.error('Error al crear la idea:', error);
      toast.error('Error al crear la idea: ' + (error?.message || ''));
      throw error;
    }
  };

  // Save changes to existing Quick Win
  const handleSaveUpdate = async (updatedWin: QuickWin) => {
    try {
      const { error } = await supabase
        .from('quick_wins')
        .update({
          title: updatedWin.title,
          description: updatedWin.description,
          proposed_solution: updatedWin.proposed_solution,
          image_url: updatedWin.image_url,
          image_urls: updatedWin.image_urls || [],
          completion_image_url: updatedWin.completion_image_url,
          completion_image_urls: updatedWin.completion_image_urls || [],
          completion_comment: updatedWin.completion_comment,
          responsible: updatedWin.responsible,
          impact: updatedWin.impact,
          deadline: updatedWin.deadline,
          category: updatedWin.category,
          cause: updatedWin.cause,
          impact_score: updatedWin.impact_score,
          effort_score: updatedWin.effort_score,
        })
        .eq('id', updatedWin.id);

      if (error) throw error;

      toast.success('Quick Win actualizado correctamente');
      await fetchWins();
      setSelectedWin(updatedWin);
    } catch (error: any) {
      console.error('Error updating Quick Win:', error);
      toast.error('Error al actualizar: ' + (error?.message || ''));
      throw error;
    }
  };

  // Confirm Completion of Quick Win
  const handleConfirmCompletion = async (
    winId: string,
    comment: string,
    images: string[]
  ) => {
    try {
      const { error } = await supabase
        .from('quick_wins')
        .update({
          status: 'done',
          completion_image_url: images[0] || null,
          completion_image_urls: images || [],
          completion_comment: comment,
          completed_at: new Date().toISOString(),
        })
        .eq('id', winId);

      if (error) throw error;

      toast.success('¡Quick Win completado exitosamente!');
      await fetchWins();
      if (selectedWin && selectedWin.id === winId) {
        setSelectedWin((prev) =>
          prev
            ? {
                ...prev,
                status: 'done',
                completion_comment: comment,
                completion_image_urls: images,
                completion_image_url: images[0] || null,
                completed_at: new Date().toISOString(),
              }
            : null
        );
      }
    } catch (error: any) {
      console.error('Error al completar:', error);
      toast.error('Error al completar: ' + (error?.message || ''));
      throw error;
    }
  };

  // Delete Quick Win
  const handleDeleteWin = async (id: string) => {
    try {
      const { error } = await supabase.from('quick_wins').delete().eq('id', id);
      if (error) throw error;

      toast.success('Quick Win eliminado');
      await fetchWins();
      setSelectedWin(null);
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar: ' + (error?.message || ''));
    }
  };

  // Drag-and-drop Matrix Scores Update
  const handleUpdateScores = async (id: string, impact: number, effort: number) => {
    try {
      const { error } = await supabase
        .from('quick_wins')
        .update({
          impact_score: impact,
          effort_score: effort,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Priorización actualizada');
      await fetchWins();
    } catch (error: any) {
      console.error('Error updating scores:', error);
      toast.error('Error al actualizar prioridad');
    }
  };

  // Drag-and-drop Root Cause Update
  const handleUpdateCause = async (winId: string, newCause: string) => {
    try {
      const { error } = await supabase
        .from('quick_wins')
        .update({ cause: newCause })
        .eq('id', winId);

      if (error) throw error;

      toast.success('Causa raíz actualizada');
      await fetchWins();
    } catch (error: any) {
      console.error('Error updating cause:', error);
      toast.error('Error al actualizar causa');
    }
  };

  // Export to Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportQuickWinsToExcel(filteredWins);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && allWins.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`${
        activeTab === 'causas' ? 'max-w-[96vw] xl:max-w-[1600px]' : 'max-w-7xl'
      } mx-auto space-y-6 pb-20 transition-all duration-300 animate-in fade-in`}
    >
      {/* Top Header with Tab Switcher & Action Buttons */}
      <HeaderWithFilter
        title="Quick Wins"
        subtitle="Registro y seguimiento de mejoras rápidas de alto impacto"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Export to Excel */}
          <button
            onClick={handleExport}
            disabled={isExporting || allWins.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 h-[38px]"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            <span>{isExporting ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>

          <div className="w-px h-6 bg-slate-700 hidden md:block" />

          {/* Dark Pill Tab Selector */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 shadow-inner">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                activeTab === 'resumen'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus size={14} />
              <span>Resumen</span>
            </button>
            <button
              onClick={() => setActiveTab('matriz')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                activeTab === 'matriz'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target size={14} />
              <span>Priorización</span>
            </button>
            <button
              onClick={() => setActiveTab('causas')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${
                activeTab === 'causas'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter size={14} />
              <span>Causas Raíz</span>
            </button>
          </div>

          {/* Nueva Idea Button */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg font-black text-xs uppercase tracking-wider h-[38px]"
          >
            <Plus size={16} />
            <span>Nueva Idea</span>
          </button>
        </div>
      </HeaderWithFilter>

      {/* Tab 1: Resumen (Kanban View) */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/80 rounded-2xl p-5 border border-blue-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="h-7 w-7 text-blue-600" />
                <span className="text-3xl font-black text-blue-900">{kpiData.total}</span>
              </div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Total Ideas
              </p>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
                <span className="text-3xl font-black text-emerald-900">{kpiData.done}</span>
              </div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Completadas
              </p>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-7 w-7 text-amber-600" />
                <span className="text-3xl font-black text-amber-900">{kpiData.ideas}</span>
              </div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Pendientes
              </p>
            </div>

            <div className="bg-rose-50/80 rounded-2xl p-5 border border-rose-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-7 w-7 text-rose-600" />
                <span className="text-3xl font-black text-rose-900">{kpiData.highImpact}</span>
              </div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Alto Impacto
              </p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por título, problema o responsable..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900 font-semibold placeholder-slate-400 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Status filter */}
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-800 font-bold cursor-pointer appearance-none uppercase tracking-wide"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <option value="all">TODOS LOS ESTADOS</option>
                  <option value="idea">IDEAS PENDIENTES</option>
                  <option value="done">COMPLETADAS</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              {/* Impact filter */}
              <div className="relative">
                <Target
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs text-slate-800 font-bold cursor-pointer appearance-none uppercase tracking-wide"
                  value={filterImpact}
                  onChange={(e) => setFilterImpact(e.target.value as any)}
                >
                  <option value="all">CUALQUIER IMPACTO</option>
                  <option value="Alto">ALTO IMPACTO</option>
                  <option value="Medio">IMPACTO MEDIO</option>
                  <option value="Bajo">IMPACTO BAJO</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Ideas Pendientes Column (Spans 2 cols on lg) */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-sm">
                <h3 className="font-black text-amber-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Lightbulb size={18} className="text-amber-600" />
                  Ideas Pendientes
                </h3>
                <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-amber-800 border border-amber-200 shadow-sm">
                  {filteredWins.filter((w) => w.status !== 'done').length}
                </span>
              </div>

              <div className="space-y-4">
                {filteredWins
                  .filter((w) => w.status !== 'done')
                  .map((win) => (
                    <QuickWinCard
                      key={win.id}
                      win={win}
                      onSelect={(w) => setSelectedWin(w)}
                      onComplete={(id) => setCompletionModalWinId(id)}
                      onZoomImage={(url) => setZoomImageUrl(url)}
                    />
                  ))}

                {filteredWins.filter((w) => w.status !== 'done').length === 0 && (
                  <div className="py-14 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white">
                    <Lightbulb size={36} className="opacity-30 mb-2" />
                    <p className="text-sm font-bold text-slate-500">No hay ideas pendientes</p>
                    <button
                      onClick={() => setIsNewModalOpen(true)}
                      className="mt-3 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      + Proponer nueva idea
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Completadas Column (Spans 2 cols on lg) */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                <h3 className="font-black text-emerald-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <CheckCircle size={18} className="text-emerald-600" />
                  Completadas
                </h3>
                <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-emerald-800 border border-emerald-200 shadow-sm">
                  {filteredWins.filter((w) => w.status === 'done').length}
                </span>
              </div>

              <div className="space-y-4">
                {filteredWins
                  .filter((w) => w.status === 'done')
                  .map((win) => (
                    <QuickWinCard
                      key={win.id}
                      win={win}
                      onSelect={(w) => setSelectedWin(w)}
                      onZoomImage={(url) => setZoomImageUrl(url)}
                    />
                  ))}

                {filteredWins.filter((w) => w.status === 'done').length === 0 && (
                  <div className="py-14 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white">
                    <CheckCircle size={36} className="opacity-30 mb-2" />
                    <p className="text-sm font-bold text-slate-500">
                      No hay tareas completadas registradas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Matriz de Priorización */}
      {activeTab === 'matriz' && (
        <MatrixView
          wins={allWins}
          onSelectWin={(win) => setSelectedWin(win)}
          onUpdateScores={handleUpdateScores}
        />
      )}

      {/* Tab 3: Causas Raíz */}
      {activeTab === 'causas' && (
        <RootCausesView
          wins={allWins}
          onSelectWin={(win) => setSelectedWin(win)}
          onUpdateCause={handleUpdateCause}
        />
      )}

      {/* New Idea Modal */}
      <NewIdeaModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateIdea}
        users={users}
        onUploadImage={handleImageUpload}
      />

      {/* Completion Modal */}
      <CompletionModal
        isOpen={!!completionModalWinId}
        winId={completionModalWinId}
        onClose={() => setCompletionModalWinId(null)}
        onConfirm={handleConfirmCompletion}
        onUploadImage={handleImageUpload}
      />

      {/* Detail / Inline Edit Modal */}
      <DetailEditModal
        win={selectedWin}
        isOpen={!!selectedWin}
        onClose={() => setSelectedWin(null)}
        onSave={handleSaveUpdate}
        onDelete={handleDeleteWin}
        onOpenCompleteModal={(id) => setCompletionModalWinId(id)}
        users={users}
        onUploadImage={handleImageUpload}
        onZoomImage={(url) => setZoomImageUrl(url)}
      />

      {/* Photo Zoom Lightbox */}
      <ZoomLightbox
        imageUrl={zoomImageUrl}
        onClose={() => setZoomImageUrl(null)}
      />
    </div>
  );
};

export default QuickWinsPage;
