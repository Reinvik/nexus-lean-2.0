import React from 'react';
import {
  Activity,
  Calendar,
  User,
  CheckCircle,
  ExternalLink,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react';
import type { VSMProject } from '../types';

interface VSMProjectCardProps {
  vsm: VSMProject;
  onSelect: (vsm: VSMProject) => void;
  onToggleStatus: (vsm: VSMProject, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const VSMProjectCard: React.FC<VSMProjectCardProps> = ({
  vsm,
  onSelect,
  onToggleStatus,
  onDelete,
}) => {
  const isCompleted = vsm.status === 'completed';
  const isFuture = vsm.status === 'future';

  return (
    <div
      onClick={() => onSelect(vsm)}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-blue-400 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden"
    >
      {/* Visual Header / Banner */}
      <div className="h-44 bg-slate-900 relative overflow-hidden">
        {vsm.image_url ? (
          <img
            src={vsm.image_url}
            alt={vsm.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-center">
            <Activity size={40} className="mb-2 text-cyan-400 opacity-60 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {vsm.name}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Status Badge */}
          <span
            className={`px-3 py-1 text-[11px] font-black uppercase rounded-full shadow-md backdrop-blur-md border ${
              isCompleted
                ? 'bg-emerald-500 text-white border-emerald-400'
                : isFuture
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-blue-600 text-white border-blue-400'
            }`}
          >
            {isCompleted ? 'Finalizado' : isFuture ? 'Estado Futuro' : 'Estado Actual'}
          </span>

          {/* Miro Badge if exists */}
          {vsm.miro_link && (
            <span
              title="Lienzo Miro vinculado"
              className="bg-amber-400 text-slate-900 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-300 pointer-events-auto"
            >
              <ExternalLink size={11} /> Miro
            </span>
          )}
        </div>

        {/* Quick Complete / In-Progress Toggle Button */}
        <button
          onClick={(e) => onToggleStatus(vsm, e)}
          className={`absolute bottom-3 right-3 p-2 rounded-xl shadow-md transition-all transform hover:scale-110 active:scale-95 z-10 ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
              : 'bg-white/90 text-slate-500 hover:text-emerald-600 hover:bg-white'
          }`}
          title={isCompleted ? 'Marcar como En Proceso' : 'Marcar como Finalizado'}
        >
          <CheckCircle size={18} className={isCompleted ? 'fill-emerald-600 text-white' : ''} />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors leading-snug">
              {vsm.name}
            </h3>
            <button
              onClick={(e) => onDelete(vsm.id, e)}
              className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
              title="Eliminar Mapa"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {vsm.description && !vsm.description.startsWith('{')
              ? vsm.description
              : 'Mapeo de flujo de valor con cálculo de tiempos, balanceo y visualizador.'}
          </p>
        </div>

        {/* Lean Metrics Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-center">
            <span className="block text-[9px] text-slate-400 uppercase font-black tracking-tight mb-0.5">
              Lead Time
            </span>
            <span className="text-xs font-black text-slate-800 truncate block">
              {vsm.lead_time || '-'}
            </span>
          </div>
          <div className="text-center border-l border-slate-200">
            <span className="block text-[9px] text-slate-400 uppercase font-black tracking-tight mb-0.5">
              Proceso
            </span>
            <span className="text-xs font-black text-slate-800 truncate block">
              {vsm.process_time || '-'}
            </span>
          </div>
          <div className="text-center border-l border-slate-200">
            <span className="block text-[9px] text-slate-400 uppercase font-black tracking-tight mb-0.5">
              Eficiencia
            </span>
            <span className="text-xs font-black text-emerald-600 truncate block">
              {vsm.efficiency || '-'}
            </span>
          </div>
          <div className="text-center border-l border-slate-200">
            <span className="block text-[9px] text-slate-400 uppercase font-black tracking-tight mb-0.5">
              Takt Time
            </span>
            <span className="text-xs font-black text-blue-600 truncate block">
              {vsm.takt_time || '-'}
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {vsm.responsible ? vsm.responsible.charAt(0).toUpperCase() : <User size={10} />}
            </div>
            <span className="truncate font-semibold text-slate-700">
              {vsm.responsible || 'Sin asignar'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
            <Calendar size={12} />
            <span>{vsm.date ? new Date(vsm.date).toLocaleDateString() : 'Sin fecha'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
