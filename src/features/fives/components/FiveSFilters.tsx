import React from 'react';
import type { FiveSFilters } from '../hooks/useFiveSCards';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { FiveSCategory, FiveSPriority } from '../../../types';

interface FiveSFiltersProps {
  filters: FiveSFilters;
  onChange: (newFilters: FiveSFilters) => void;
  counts: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    pendingOffline: number;
  };
}

const CATEGORIES: { label: string; value: 'all' | FiveSCategory }[] = [
  { label: 'Todas las 5S', value: 'all' },
  { label: '1S - Seiri (Clasificar)', value: 'Seiri' },
  { label: '2S - Seiton (Ordenar)', value: 'Seiton' },
  { label: '3S - Seiso (Limpiar)', value: 'Seiso' },
  { label: '4S - Seiketsu (Estandarizar)', value: 'Seiketsu' },
  { label: '5S - Shitsuke (Disciplina)', value: 'Shitsuke' },
  { label: 'Seguridad', value: 'Seguridad' },
  { label: 'Otro', value: 'Otro' },
];

const PRIORITIES: { label: string; value: 'all' | FiveSPriority }[] = [
  { label: 'Todas las prioridades', value: 'all' },
  { label: 'Alta', value: 'Alta' },
  { label: 'Media', value: 'Media' },
  { label: 'Baja', value: 'Baja' },
];

export const FiveSFiltersComponent: React.FC<FiveSFiltersProps> = ({
  filters,
  onChange,
  counts,
}) => {
  const statusTabs: {
    label: string;
    value: FiveSFilters['status'];
    count: number;
  }[] = [
    { label: 'Todas', value: 'all', count: counts.total },
    { label: 'Abiertas', value: 'Abierto', count: counts.open },
    { label: 'En Progreso', value: 'En Progreso', count: counts.inProgress },
    { label: 'Cerradas', value: 'Cerrado', count: counts.closed },
  ];

  if (counts.pendingOffline > 0) {
    statusTabs.push({
      label: 'Offline',
      value: 'Pendiente de subir',
      count: counts.pendingOffline,
    });
  }

  return (
    <div className="space-y-4">
      {/* Status Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange({ ...filters, status: tab.value })}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
              filters.status === tab.value
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                filters.status === tab.value
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Secondary Dropdowns */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Buscar por descripción, área, responsable o número..."
            className="w-full pl-10 pr-9 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <select
          value={filters.category}
          onChange={(e) =>
            onChange({ ...filters, category: e.target.value as any })
          }
          className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-slate-900 text-white">
              {c.label}
            </option>
          ))}
        </select>

        {/* Priority Dropdown */}
        <select
          value={filters.priority}
          onChange={(e) =>
            onChange({ ...filters, priority: e.target.value as any })
          }
          className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value} className="bg-slate-900 text-white">
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FiveSFiltersComponent;
