import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Database, HardDrive, ShieldCheck, RefreshCw, Users, Building2 } from 'lucide-react';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Caché local limpiada correctamente');
  };

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
          </Link>

          <Link
            to="/admin/companies"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <Building2 size={16} />
            <span>Empresas</span>
          </Link>

          <Link
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
          >
            <Settings size={16} />
            <span>Configuración</span>
          </Link>
        </div>
      </div>

      {/* Header Info */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Settings size={22} />
          </div>
          <span>Configuración del Sistema</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Parámetros técnicos de la plataforma Nexus Lean 2.0 y almacenamiento local.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Information Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Estado del Servidor y Base de Datos</h3>
              <p className="text-xs text-slate-500">Conexión activa a Supabase Cloud</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Versión del Sistema:</span>
              <span className="font-mono text-blue-600 font-bold">2.0.0 (Clean Architecture)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Motor Frontend:</span>
              <span className="font-mono text-slate-900 font-medium">Vite + React 18 + TypeScript</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Almacenamiento Offline:</span>
              <span className="font-mono text-slate-900 font-medium">Dexie.js (IndexedDB)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">PWA Service Worker:</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                Habilitado
              </span>
            </div>
          </div>
        </div>

        {/* Local Storage & Cache */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mantenimiento de Memoria y Caché</h3>
              <p className="text-xs text-slate-500">Limpieza de datos temporales del navegador</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Si experimentas lentitud o problemas con versiones antiguas en tu dispositivo o tablet, puedes purgar la memoria caché local.
          </p>

          <div className="pt-2">
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Limpiar Caché Local</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
