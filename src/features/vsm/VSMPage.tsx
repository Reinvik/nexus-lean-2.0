import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Activity,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Profile } from '../../types';
import { HeaderWithFilter } from '../../components/common/HeaderWithFilter';
import type { VSMProject } from './types';
import { VSMProjectCard } from './components/VSMProjectCard';
import { VSMDetailModal } from './components/VSMDetailModal';
import { DEFAULT_VSM_STEPS, serializeVSMDescription } from './utils/vsmHelpers';

export const VSMPage: React.FC = () => {
  const { user, globalFilterCompanyId, activeCompanyId } = useAuth();

  const [vsms, setVsms] = useState<VSMProject[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'current' | 'future' | 'completed'>('all');
  const [selectedVsm, setSelectedVsm] = useState<VSMProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Target company calculation for multitenancy
  const targetCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.isGlobalAdmin) {
      return globalFilterCompanyId && globalFilterCompanyId !== 'all'
        ? globalFilterCompanyId
        : activeCompanyId || null;
    }
    return user.company_id || user.companyId || null;
  }, [user, globalFilterCompanyId, activeCompanyId]);

  // Fetch VSM projects
  const fetchVsms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('vsm_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!user.isGlobalAdmin) {
        const compId = user.company_id || user.companyId;
        if (compId) {
          query = query.eq('company_id', compId);
        } else {
          setVsms([]);
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

      setVsms((data as VSMProject[]) || []);
    } catch (error: any) {
      console.error('Error fetching VSMs:', error);
      toast.error('Error al cargar mapas VSM: ' + (error?.message || ''));
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
    fetchVsms();
    fetchUsers();
  }, [fetchVsms, fetchUsers]);

  // Filtered VSM projects
  const filteredVsms = useMemo(() => {
    return vsms.filter((vsm) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (vsm.name || '').toLowerCase().includes(term) ||
        (vsm.description || '').toLowerCase().includes(term) ||
        (vsm.responsible || '').toLowerCase().includes(term);

      const matchesStatus = filterStatus === 'all' || vsm.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [vsms, searchTerm, filterStatus]);

  // KPIs
  const kpiData = useMemo(() => {
    const total = vsms.length;
    const current = vsms.filter((v) => v.status === 'current').length;
    const future = vsms.filter((v) => v.status === 'future').length;
    const completed = vsms.filter((v) => v.status === 'completed').length;
    return { total, current, future, completed };
  }, [vsms]);

  // Handle new VSM initialization
  const handleNewVsm = () => {
    if (!targetCompanyId) {
      toast.error('Selecciona una empresa en el menú primero.');
      return;
    }

    const newEmptyVsm: VSMProject = {
      id: '',
      name: '',
      responsible: user?.fullName || user?.name || user?.email || '',
      date: new Date().toISOString().split('T')[0],
      status: 'current',
      lead_time: '3.8 días',
      process_time: '235s',
      efficiency: '1.2%',
      takt_time: '60s',
      image_url: null,
      miro_link: '',
      description: serializeVSMDescription(
        'Mapeo de flujo de valor inicial.',
        DEFAULT_VSM_STEPS,
        8,
        480
      ),
      company_id: targetCompanyId,
    };

    setSelectedVsm(newEmptyVsm);
    setIsModalOpen(true);
  };

  // Upload image to Supabase Storage
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const companyPath =
        globalFilterCompanyId && globalFilterCompanyId !== 'all'
          ? globalFilterCompanyId
          : 'global';
      const filePath = `${companyPath}/vsm/${fileName}`;

      // Upload to storage bucket (try five-s-images which is universally configured)
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

  // Save VSM Project (Create or Update)
  const handleSaveVsm = async (payload: Partial<VSMProject>) => {
    if (!targetCompanyId) {
      toast.error('No hay empresa activa seleccionada.');
      return;
    }

    try {
      const dataToSave = {
        name: payload.name,
        responsible: payload.responsible,
        date: payload.date,
        status: payload.status,
        lead_time: payload.lead_time,
        process_time: payload.process_time,
        efficiency: payload.efficiency,
        takt_time: payload.takt_time,
        image_url: payload.image_url,
        miro_link: payload.miro_link,
        description: payload.description,
        company_id: targetCompanyId,
      };

      if (payload.id) {
        // Update existing
        const { error } = await supabase
          .from('vsm_projects')
          .update(dataToSave)
          .eq('id', payload.id);

        if (error) throw error;
        toast.success('Mapa VSM actualizado exitosamente');
      } else {
        // Insert new
        const { error } = await supabase.from('vsm_projects').insert({
          ...dataToSave,
          created_at: new Date().toISOString(),
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success('Nuevo mapa VSM creado exitosamente');
      }

      await fetchVsms();
    } catch (error: any) {
      console.error('Error saving VSM:', error);
      toast.error('Error al guardar el mapa: ' + (error?.message || ''));
      throw error;
    }
  };

  // Delete VSM Project
  const handleDeleteVsm = async (id: string) => {
    try {
      const { error } = await supabase.from('vsm_projects').delete().eq('id', id);
      if (error) throw error;

      toast.success('Mapa VSM eliminado');
      await fetchVsms();
    } catch (error: any) {
      console.error('Error deleting VSM:', error);
      toast.error('Error al eliminar: ' + (error?.message || ''));
    }
  };

  // Quick toggle status on card
  const handleToggleStatus = async (vsm: VSMProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = vsm.status === 'completed' ? 'current' : 'completed';

    // Optimistic UI update
    setVsms((prev) =>
      prev.map((item) => (item.id === vsm.id ? { ...item, status: nextStatus } : item))
    );

    try {
      const { error } = await supabase
        .from('vsm_projects')
        .update({ status: nextStatus })
        .eq('id', vsm.id);

      if (error) throw error;
      toast.success(
        nextStatus === 'completed' ? 'Mapa marcado como Finalizado' : 'Mapa reabierto (Estado Actual)'
      );
    } catch (err: any) {
      console.error('Error toggling status:', err);
      toast.error('Error al actualizar estado');
      await fetchVsms(); // Revert
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header */}
      <HeaderWithFilter
        title="VSM (Value Stream Mapping)"
        subtitle="Mapeo y análisis de flujos de valor, cálculo de Lead Time y balanceo de líneas"
      >
        <button
          onClick={handleNewVsm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg h-[38px]"
        >
          <Plus size={16} />
          <span>Nuevo Mapa VSM</span>
        </button>
      </HeaderWithFilter>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50/80 rounded-2xl p-5 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Layers className="h-7 w-7 text-blue-600" />
            <span className="text-3xl font-black text-blue-900">{kpiData.total}</span>
          </div>
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Total Mapas VSM
          </p>
        </div>

        <div className="bg-cyan-50/80 rounded-2xl p-5 border border-cyan-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-7 w-7 text-cyan-600" />
            <span className="text-3xl font-black text-cyan-900">{kpiData.current}</span>
          </div>
          <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
            Estado Actual
          </p>
        </div>

        <div className="bg-purple-50/80 rounded-2xl p-5 border border-purple-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-7 w-7 text-purple-600" />
            <span className="text-3xl font-black text-purple-900">{kpiData.future}</span>
          </div>
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            Estado Futuro
          </p>
        </div>

        <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <span className="text-3xl font-black text-emerald-900">{kpiData.completed}</span>
          </div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Finalizados
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, familia de producto o responsable..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm text-slate-900 font-semibold placeholder-slate-400 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({vsms.length})
          </button>
          <button
            onClick={() => setFilterStatus('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === 'current'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Actual ({kpiData.current})
          </button>
          <button
            onClick={() => setFilterStatus('future')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === 'future'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Futuro ({kpiData.future})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === 'completed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Finalizados ({kpiData.completed})
          </button>
        </div>
      </div>

      {/* VSM Projects Grid */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center min-h-72">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVsms.map((vsm) => (
              <VSMProjectCard
                key={vsm.id}
                vsm={vsm}
                onSelect={(selected) => {
                  setSelectedVsm(selected);
                  setIsModalOpen(true);
                }}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDeleteVsm}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVsms.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Activity size={32} />
            </div>
            <h3 className="text-slate-900 font-black text-lg mb-1">
              No se encontraron mapas de flujo de valor
            </h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mb-6 leading-relaxed">
              Crea tu primer VSM para registrar las operaciones, calcular el Lead Time, vincular tu tablero de Miro y detectar oportunidades Kaizen.
            </p>
            <button
              onClick={handleNewVsm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-200 transition-all hover:scale-105"
            >
              <Plus size={16} />
              <span>Crear Primer Mapa VSM</span>
            </button>
          </div>
        )}
      </div>

      {/* Full VSM Workspace Detail Modal */}
      <VSMDetailModal
        vsm={selectedVsm}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVsm(null);
        }}
        onSave={handleSaveVsm}
        onDelete={handleDeleteVsm}
        users={users}
        onUploadImage={handleImageUpload}
      />
    </div>
  );
};

export default VSMPage;
