import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  FileText,
  Activity,
  Zap,
  Users,
  Brain,
  Settings,
  X,
  Camera,
  RefreshCcw,
  LogOut,
  Building,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, companies, activeCompanyId, setActiveCompanyId, logout } = useAuth();
  const navigate = useNavigate();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isUserAdmin = Boolean(
    user && (user.isGlobalAdmin || user.canAccessAdmin || user.isNexusOwner)
  );

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ...(isUserAdmin || user?.hasAiAccess
      ? [{ icon: Brain, label: 'Consultor IA', path: '/consultant' }]
      : []),
    { icon: ClipboardList, label: 'Tarjetas 5S', path: '/5s' },
    { icon: ShieldCheck, label: 'Auditoría 5S', path: '/auditorias-5s' },
    { icon: FileText, label: 'Proyectos A3', path: '/a3' },
    { icon: Activity, label: 'Mapeo de Procesos', path: '/vsm' },
    { icon: Zap, label: 'Quick Wins', path: '/quick-wins' },
    { icon: Users, label: 'Responsables', path: '/responsables' },
    ...(isUserAdmin ? [{ icon: Settings, label: 'Administración', path: '/admin' }] : []),
  ];

  const handleReiniciar = async () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {
        console.error('Error clearing caches:', e);
      }
    }
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      } catch (e) {
        console.error('Error unregistering SW:', e);
      }
    }
    window.location.href = '/';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    try {
      if (name.trim() && name !== user.name) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', user.id);
        if (error) throw error;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error('Las contraseñas no coinciden');
          setIsSavingProfile(false);
          return;
        }
        if (newPassword.length < 6) {
          toast.error('La contraseña debe tener al menos 6 caracteres');
          setIsSavingProfile(false);
          return;
        }
        const { error: passErr } = await supabase.auth.updateUser({ password: newPassword });
        if (passErr) throw passErr;
      }

      toast.success('Perfil actualizado correctamente');
      setIsAvatarModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#050B14] text-slate-300 flex flex-col h-screen md:h-full border-r border-[#1E293B] shadow-2xl transition-transform duration-300 ease-in-out md:relative ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-cyan-900/10 rounded-full blur-[60px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-900/10 rounded-full blur-[60px]" />
        </div>

        {/* Header / Logo */}
        <div className="h-24 flex items-center justify-between px-8 border-b border-[#1E293B] relative z-10 bg-[#050B14]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-md opacity-30 rounded-full" />
              <img
                src="/nexus-logo.svg"
                alt="Nexus Be Lean"
                className="h-9 w-auto relative drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight leading-none font-sans">
                Nexus{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Lean
                </span>
              </span>
              <span className="text-[10px] font-bold text-cyan-400/60 tracking-[0.2em] uppercase mt-1">
                by SmartLean
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Company Switcher if Global Admin */}
        {user?.isGlobalAdmin && companies.length > 0 && (
          <div className="px-4 pt-3 shrink-0 relative z-20">
            <button
              type="button"
              onClick={() => setShowCompanyMenu(!showCompanyMenu)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800/90 rounded-xl border border-slate-700/70 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <Building size={14} className="text-cyan-400 shrink-0" />
                <span className="truncate">{activeCompany?.name || 'Todas las Empresas'}</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {showCompanyMenu && (
              <div className="absolute left-4 right-4 z-30 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs">
                <button
                  onClick={() => {
                    setActiveCompanyId(null);
                    setShowCompanyMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${
                    !activeCompanyId ? 'text-cyan-400 font-semibold bg-cyan-950/30' : 'text-slate-300'
                  }`}
                >
                  🌐 Ver Todas (Global)
                </button>
                {companies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => {
                      setActiveCompanyId(comp.id);
                      setShowCompanyMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 truncate ${
                      activeCompanyId === comp.id
                        ? 'text-cyan-400 font-semibold bg-cyan-950/30'
                        : 'text-slate-300'
                    }`}
                  >
                    🏢 {comp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 relative z-10 scrollbar-none">
          <div className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Menu Principal
          </div>
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => onClose && window.innerWidth < 768 && onClose()}
                className={({ isActive }) => `
                  relative group flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/5 text-white shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                    )}
                    <item.icon
                      size={20}
                      className={`mr-3 transition-transform duration-300 ${
                        isActive
                          ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                          : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className={`tracking-wide ${isActive ? 'font-semibold text-white' : ''}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#020617]/50 relative z-10 backdrop-blur-sm shrink-0">
          <div
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-slate-800"
            onClick={() => setIsAvatarModalOpen(true)}
            title="Cambiar Foto de Perfil"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-slate-700 group-hover:border-cyan-500/50 shadow-lg transition-all">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.name ? user.name.charAt(0) : 'U'}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#0F172A] border border-slate-700 rounded-full p-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
                <Camera size={10} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                {user?.name || user?.fullName || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">
                {user?.email}
              </p>
              <p className="text-xs text-cyan-400/70 font-semibold truncate mt-0.5">
                {user?.isNexusOwner
                  ? 'Nexus Owner'
                  : isUserAdmin
                  ? 'Super Admin'
                  : user?.role === 'superuser'
                  ? 'Administrador'
                  : 'Colaborador'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-all duration-200 mb-1"
            >
              <ShieldCheck size={14} />
              <span>Cambiar Contraseña / Perfil</span>
            </button>
            <button
              onClick={handleReiniciar}
              className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 rounded-lg transition-all duration-200"
              title="Refrescar aplicación"
            >
              <RefreshCcw size={14} className="hover:rotate-180 transition-transform duration-500" />
              <span>Reiniciar</span>
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200"
            >
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Profile & Avatar Modal */}
        {isAvatarModalOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsAvatarModalOpen(false)}
          >
            <div
              className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all scale-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-bold text-lg text-white font-sans">Mi Perfil y Seguridad</h3>
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Cambiar Contraseña (Opcional)
                  </p>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar contraseña"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
