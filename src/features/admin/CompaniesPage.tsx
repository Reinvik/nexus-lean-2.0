import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  company_id?: string | null;
}

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Company Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Company Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
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

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ingresa el nombre de la empresa');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Registrando empresa...');

    try {
      const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const schemaName = `client_${cleanSlug}`;

      const payload = {
        name: name.trim(),
        slug: cleanSlug,
        schema_name: schemaName,
        database_schema: schemaName,
        allowed_modules: ['5s', 'audits', 'quick_wins', 'a3', 'vsm'],
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
    } catch (err: any) {
      console.error('Error creating company:', err);
      toast.error(err?.message || 'Error al crear empresa', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setEditName(comp.name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editName.trim()) return;

    setIsSavingEdit(true);
    const toastId = toast.loading('Actualizando empresa...');

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: editName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Empresa actualizada correctamente', { id: toastId });
      setCompanies((prev) =>
        prev.map((c) => (c.id === editingCompany.id ? { ...c, name: editName.trim() } : c))
      );
      setIsEditModalOpen(false);
      setEditingCompany(null);
    } catch (err: any) {
      console.error('Error updating company:', err);
      toast.error(err?.message || 'Error al actualizar empresa', { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  };

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
            onClick={() => setIsModalOpen(true)}
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
            <span>Empresas Registradas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organizaciones clientes y filiales con acceso a las herramientas del ecosistema Lean.
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
            <p className="text-xs text-slate-500 font-medium">Módulos Activos</p>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-700">
              5S, A3, VSM, Audits
            </p>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((comp) => {
          const compUsers = users.filter((u) => u.company_id === comp.id);

          return (
            <div
              key={comp.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <Building2 size={22} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(comp)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Editar Empresa"
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

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
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

              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] text-slate-400">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Nueva Empresa</h3>
                  <p className="text-xs text-slate-500">Crea una organización para habilitar módulos y usuarios</p>
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
            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
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
                  Identificador / Código de Esquema (automático)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="cial, agroindustria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Se generará el esquema interno: <code>client_{slug || 'empresa'}</code>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
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
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Empresa */}
      {isEditModalOpen && editingCompany && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Empresa</h3>
                  <p className="text-xs text-slate-500 font-mono">#{editingCompany.id.substring(0, 8)}</p>
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
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
