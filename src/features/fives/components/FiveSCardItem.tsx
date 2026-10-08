import React from 'react';
import type { FiveSCard } from '../../../types';
import { Badge } from '../../../components/common/Badge';
import { formatDate } from '../../../lib/utils';
import {
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  WifiOff,
} from 'lucide-react';

interface FiveSCardItemProps {
  card: FiveSCard;
  onEdit: (card: FiveSCard) => void;
  onDelete: (cardId: string) => void;
}

const CATEGORY_COLORS: Record<string, 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate'> = {
  Seiri: 'cyan',
  Seiton: 'indigo',
  Seiso: 'emerald',
  Seiketsu: 'amber',
  Shitsuke: 'rose',
  Seguridad: 'rose',
  Otro: 'slate',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' }
> = {
  Abierto: { label: 'Abierto', variant: 'rose' },
  'En Progreso': { label: 'En Progreso', variant: 'amber' },
  Cerrado: { label: 'Cerrado', variant: 'emerald' },
  'Pendiente de subir': { label: 'Offline', variant: 'slate' },
};

export const FiveSCardItem: React.FC<FiveSCardItemProps> = ({ card, onEdit, onDelete }) => {
  const statusInfo = STATUS_CONFIG[card.status] || {
    label: card.status,
    variant: 'slate',
  };
  const categoryVariant = CATEGORY_COLORS[card.category] || 'cyan';

  const beforeImage = card.image_url || card.image_urls?.[0];
  const afterImage = card.after_image_url || card.after_image_urls?.[0];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-xl shadow-lg hover:shadow-[0_10px_30px_rgba(6,182,212,0.12)]">
      {/* Top Banner / Image Section */}
      <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
        {beforeImage ? (
          <div className="relative w-full h-full">
            <img
              src={beforeImage}
              alt={card.description}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* If resolved with after photo */}
            {afterImage && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold flex items-center gap-1 backdrop-blur-sm">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Antes / Después</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 text-slate-400 border-b border-slate-800/80">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-[11px] font-medium">Sin foto adjunta</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Badge variant={categoryVariant}>{card.category}</Badge>
          {card.isOffline && (
            <Badge variant="amber" className="flex items-center gap-1">
              <WifiOff size={10} />
              <span>Offline</span>
            </Badge>
          )}
        </div>

        {/* Priority Indicator */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
              card.priority === 'Alta'
                ? 'bg-rose-500/30 text-rose-300 border-rose-500/50'
                : card.priority === 'Media'
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {card.priority}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Card Number & Area */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono text-cyan-400 font-semibold">
              #{card.cardNumber || card.id?.substring(0, 6)}
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-medium truncate max-w-[160px]">
              <MapPin size={12} className="text-cyan-400 shrink-0" />
              <span className="truncate">{card.area}</span>
            </span>
          </div>

          {/* Description */}
          <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
            {card.description}
          </h4>

          {/* Findings */}
          {card.findings && (
            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {card.findings}
            </p>
          )}
        </div>

        {/* Footer Meta & Actions */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 truncate max-w-[130px]">
              <User size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{card.responsible || card.assigned_to || 'Sin asignar'}</span>
            </span>

            <span className="flex items-center gap-1 shrink-0">
              <Calendar size={12} className="text-slate-400 shrink-0" />
              <span>{formatDate(card.due_date || card.created_at)}</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onEdit(card)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-cyan-300 text-xs font-semibold border border-slate-700 hover:border-cyan-500/40 transition-colors"
            >
              <Edit3 size={13} />
              <span>{card.status === 'Cerrado' ? 'Ver Detalle' : 'Gestionar'}</span>
            </button>

            <button
              onClick={() => onDelete(card.id)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
              title="Eliminar tarjeta"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiveSCardItem;
