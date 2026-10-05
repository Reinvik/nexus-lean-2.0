import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Company } from '../../types';
import {
  Users,
  Building2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Edit,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Settings,
  Shield,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserItem {
  id: string;
  email?: string;
  full_name?: string;
  role: string;
  company_id?: string | null;
  is_authorized?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();

  // Data States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newIsAuthorized, setNewIsAuthorized] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editIsAuthorized, setEditIsAuthorized] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Quick Create Company Modal State
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('companies').select('*').order('name'),
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data);
      }
      if (companiesRes.data) {
        setCompanies(companiesRes.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle user activation status
  const handleToggleAuth = async (userId: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_authorized: nextStatus,
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success(nextStatus ? 'Usuario activado' : 'Usuario desactivado');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_authorized: nextStatus, is_active: nextStatus }
            : u
        )
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar estado');
    }
  };

  // Open Edit User Modal
  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditCompanyId(user.company_id || '');
    setEditRole(user.role || 'user');
    setEditIsAuthorized(user.is_authorized !== false && user.is_active !== false);
    setIsEditModalOpen(true);
  };

  // Save Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    const toastId = toast.loading('Actualizando usuario...');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          company_id: editCompanyId || null,
          role: editRole,
          is_authorized: editIsAuthorized,
          is_active: editIsAuthorized,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('Usuario actualizado correctamente', { id: toastId });
      setIsEditModalOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      console.error('Error saving user edit:', err);
      toast.error(err?.message || 'Error al actualizar usuario', { id: toastId });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error('El correo electrónico es requerido');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsCreatingUser(true);
    const toastId = toast.loading('Creando usuario...');

    try {
      const cleanMail = newEmail.toLowerCase().trim();
      let createdUserId: string | null = null;

      // 1. Try RPC admin_create_user
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_user', {
          new_email: cleanMail,
          new_password: newPassword,
          new_role: newRole,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          createdUserId = rpcRes.user_id;
        }
      } catch (rpcEx) {
        console.warn('RPC admin_create_user failed, trying fallback:', rpcEx);
      }

      // 2. Fallback to auth.signUp if RPC didn't set ID
      if (!createdUserId) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanMail,
          password: newPassword,
          options: {
            data: {
              full_name: newFullName.trim() || cleanMail.split('@')[0],
              role: newRole,
              company_id: newCompanyId || null,
            },
          },
        });

        if (signUpErr && !signUpErr.message.includes('already registered')) {
          throw signUpErr;
        }
        if (signUpData?.user) {
          createdUserId = signUpData.user.id;
        }
      }

      // 3. Upsert / update profile
      const profileData: any = {
        email: cleanMail,
        full_name: newFullName.trim() || cleanMail.split('@')[0],
        role: newRole,
        company_id: newCompanyId || null,
        is_authorized: newIsAuthorized,
        is_active: newIsAuthorized,
        updated_at: new Date().toISOString(),
      };
      if (createdUserId) {
        profileData.id = createdUserId;
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'email' });

      if (profErr) {
        // Fallback to update by email
        await supabase.from('profiles').update(profileData).eq('email', cleanMail);
      }

      toast.success('¡Usuario creado y asignado con éxito!', { id: toastId });
      setIsCreateUserModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewCompanyId('');
      setNewRole('user');
      setNewIsAuthorized(true);
      await loadData();
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast.error(err?.message || 'Error al crear usuario', { id: toastId });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Quick Create Company
  const handleQuickCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast.error('Ingresa el nombre de la empresa');
      return;
    }
    setIsCreatingCompany(true);
    const toastId = toast.loading('Creando empresa...');

    try {
      const slug = newCompanyName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const schemaName = `client_${slug}`;
      const payload = {
        name: newCompanyName.trim(),
        slug: slug,
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
      setIsCreateCompanyModalOpen(false);
      setNewCompanyName('');
      await loadData();
      if (data?.id) {
        setNewCompanyId(data.id);
      }
    } catch (err: any) {
      console.error('Error creating company:', err);
      toast.error(err?.message || 'Error al crear empresa', { id: toastId });
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchTerm === '' ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCompany =
        companyFilter === 'ALL' ||
        (companyFilter === 'UNASSIGNED' && !u.company_id) ||
        u.company_id === companyFilter;

      const isAuth = u.is_authorized !== false && u.is_active !== false;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isAuth) ||
        (statusFilter === 'BLOCKED' && !isAuth);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchesSearch && matchesCompany && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, companyFilter, statusFilter, roleFilter]);

  // Statistics
  const totalUsers = users.length;
  const activeUsersCount = users.filter(
    (u) => u.is_authorized !== false && u.is_active !== false
  ).length;
  const blockedUsersCount = totalUsers - activeUsersCount;
  const assignedUsersCount = users.filter((u) => Boolean(u.company_id)).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
          >
            <Users size={16} />
            <span>Usuarios</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
              {totalUsers}
            </span>
          </Link>

          <Link
            to="/admin/companies"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <Building2 size={16} />
            <span>Empresas</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold">
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
            onClick={() => setIsCreateCompanyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Building2 size={15} className="text-blue-600" />
            <span>+ Nueva Empresa</span>
          </button>

          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>+ Nuevo Usuario</span>
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
              <Users size={22} />
            </div>
            <span>Administración de Usuarios</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de cuentas, asignación de empresas, roles y permisos de acceso al sistema Lean.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Usuarios</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Usuarios Activos</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">
              {activeUsersCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Bloqueados</p>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-700">
              {blockedUsersCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Con Empresa</p>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-700">
              {assignedUsersCount} <span className="text-xs text-slate-400 font-normal">/ {totalUsers}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter by Company */}
          <div className="w-full md:w-56">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Todas las Empresas ({companies.length})</option>
              <option value="UNASSIGNED">Sin Asignar</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="BLOCKED">Solo Bloqueados</option>
            </select>
          </div>

          {/* Filter by Role */}
          <div className="w-full md:w-44">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="user">User (Colaborador)</option>
              <option value="admin">Admin</option>
              <option value="superuser">Superuser</option>
              <option value="NexusOwner">NexusOwner</option>
            </select>
          </div>
        </div>

        {/* Results summary & active filters */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Mostrando <b>{filteredUsers.length}</b> de <b>{totalUsers}</b> usuarios
          </span>
          {(searchTerm || companyFilter !== 'ALL' || statusFilter !== 'ALL' || roleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCompanyFilter('ALL');
                setStatusFilter('ALL');
                setRoleFilter('ALL');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Empresa Asignada</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No se encontraron usuarios</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta ajustar los filtros de búsqueda o registra un nuevo usuario.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const comp = companies.find((c) => c.id === u.company_id);
                  const isAuth = u.is_authorized !== false && u.is_active !== false;
                  const initials = (u.full_name || u.email || 'U')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Usuario */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {u.full_name || 'Sin nombre'}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{u.id.substring(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        {u.email || '-'}
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            u.role === 'NexusOwner' || u.role === 'superadmin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.role === 'superuser' || u.role === 'admin'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Empresa */}
                      <td className="py-3 px-4">
                        {comp ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 size={13} className="text-blue-500 shrink-0" />
                            <span>{comp.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle size={12} className="text-amber-500 shrink-0" />
                            <span>Sin asignar</span>
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isAuth
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isAuth ? <CheckCircle size={13} /> : <XCircle size={13} />}
                          <span>{isAuth ? 'Activo' : 'Bloqueado'}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Usuario y Empresa"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleToggleAuth(u.id, isAuth)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                              isAuth
                                ? 'bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                            }`}
                          >
                            {isAuth ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      {isCreateUserModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateUserModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500">Registra un colaborador y asígnale su empresa</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    placeholder="juan.perez@cial.cl"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Contraseña Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña Inicial *
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Empresa Asignada & Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Empresa Asignada</label>
                    <button
                      type="button"
                      onClick={() => setIsCreateCompanyModalOpen(true)}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      + Nueva
                    </button>
                  </div>
                  <select
                    value={newCompanyId}
                    onChange={(e) => setNewCompanyId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                  >
                    <option value="">Global / Sin Asignar</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol de Acceso
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                  >
                    <option value="user">User (Colaborador)</option>
                    <option value="superuser">Superuser (Admin de Empresa)</option>
                    <option value="admin">Admin</option>
                    {currentUser?.isNexusOwner && (
                      <option value="NexusOwner">NexusOwner (Propietario)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Estado Inicial Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newIsAuthorized"
                  checked={newIsAuthorized}
                  onChange={(e) => setNewIsAuthorized(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="newIsAuthorized"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Activar y autorizar acceso inmediatamente
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isCreatingUser ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditModalOpen && editingUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Usuario</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingUser.email}</p>
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
            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Empresa Asignada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Empresa Asignada</label>
                  <button
                    type="button"
                    onClick={() => setIsCreateCompanyModalOpen(true)}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    + Nueva Empresa
                  </button>
                </div>
                <select
                  value={editCompanyId}
                  onChange={(e) => setEditCompanyId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  <option value="">Global / Sin Asignar</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol de Acceso
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  <option value="user">User (Colaborador)</option>
                  <option value="superuser">Superuser (Admin de Empresa)</option>
                  <option value="admin">Admin</option>
                  {currentUser?.isNexusOwner && (
                    <option value="NexusOwner">NexusOwner (Propietario)</option>
                  )}
                </select>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsAuthorized"
                  checked={editIsAuthorized}
                  onChange={(e) => setEditIsAuthorized(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="editIsAuthorized"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Usuario Activo y Autorizado
                </label>
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
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isSavingUser ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva Empresa */}
      {isCreateCompanyModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateCompanyModalOpen(false);
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
                  <p className="text-xs text-slate-500">Añade una organización para asociar usuarios</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateCompanyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleQuickCreateCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: CIAL Alimentos, AgroIndustrial Sur"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateCompanyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCompany}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isCreatingCompany ? 'Registrando...' : 'Registrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
