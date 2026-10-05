import React from 'react';
import { CheckCircle, Clock, Calendar, User, Check, Eye } from 'lucide-react';
import type { QuickWin } from '../../../types';
import { getCategoryStyles, getImpactColor, ensureArray } from '../utils/quickWinsHelpers';

interface QuickWinCardProps {
  win: QuickWin;
  onSelect: (win: QuickWin) => void;
  onComplete?: (winId: string) => void;
  onZoomImage?: (url: string) => void;
}

export const QuickWinCard: React.FC<QuickWinCardProps> = ({
  win,
  onSelect,
  onComplete,
  onZoomImage,
}) => {
  const isDone = win.status === 'done';
  const catStyle = getCategoryStyles(win.category);
  const beforeUrls = ensureArray(win.image_urls || (win.image_url ? [win.image_url] : []));
  const afterUrls = ensureArray(
    win.completion_image_urls || (win.completion_image_url ? [win.completion_image_url] : [])
  );

  if (isDone) {
    return (
      <div
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer opacity-90 hover:opacity-100 group"
        onClick={() => onSelect(win)}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold uppercase px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-600" /> COMPLETADO
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {win.completed_at
              ? new Date(win.completed_at).toLocaleDateString()
              : win.date
              ? new Date(win.date).toLocaleDateString()
              : 'Finalizado'}
          </span>
        </div>

        <h4 className="font-bold text-gray-900 text-base mb-1.5 line-through decoration-slate-400 group-hover:text-blue-600 transition-colors">
          {win.title}
        </h4>

        {/* Before / After Photo Comparison */}
        {(beforeUrls.length > 0 || afterUrls.length > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {beforeUrls[0] && (
              <div
                className="relative rounded-lg overflow-hidden border border-gray-200 aspect-[4/3] group/img"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomImage?.(beforeUrls[0]);
                }}
              >
                <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                  ANTES
                </span>
                <img
                  src={beforeUrls[0]}
                  alt="Antes"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Eye size={16} />
                </div>
              </div>
            )}
            {afterUrls[0] && (
              <div
                className="relative rounded-lg overflow-hidden border border-gray-200 aspect-[4/3] group/img"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomImage?.(afterUrls[0]);
                }}
              >
                <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                  DESPUÉS
                </span>
                <img
                  src={afterUrls[0]}
                  alt="Después"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Eye size={16} />
                </div>
              </div>
            )}
          </div>
        )}

        {win.completion_comment && (
          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 mt-2">
            <p className="text-xs text-slate-700 italic leading-snug">
              "{win.completion_comment}"
            </p>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
              {win.responsible ? win.responsible.charAt(0).toUpperCase() : <User size={10} />}
            </div>
            <span className="truncate max-w-[130px] font-medium text-slate-600">
              {win.responsible || 'Sin asignar'}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">
            {win.category || 'Varios'}
          </span>
        </div>
      </div>
    );
  }

  // Pending Idea Card
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('winId', win.id)}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-l-[6px] ${catStyle.borderLeft} hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group`}
      onClick={() => onSelect(win)}
    >
      {/* Badges row */}
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getImpactColor(
              win.impact
            )}`}
          >
            {win.impact}
          </span>
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${catStyle.bg} text-white`}
          >
            {win.category || 'Operacional'}
          </span>
        </div>

        {/* Matrix coordinate preview */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <span title="Score Impacto" className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            I:{win.impact_score ?? 5}
          </span>
          <span title="Score Esfuerzo" className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            E:{win.effort_score ?? 5}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-bold text-gray-900 text-base mb-1.5 group-hover:text-blue-600 transition-colors">
        {win.title}
      </h4>

      {/* Description */}
      {win.description && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
          {win.description}
        </p>
      )}

      {/* Photo evidence previews (if any) */}
      {beforeUrls.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {beforeUrls.slice(0, 3).map((url, i) => (
            <div
              key={i}
              className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 group/img"
              onClick={(e) => {
                e.stopPropagation();
                onZoomImage?.(url);
              }}
            >
              <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye size={12} />
              </div>
            </div>
          ))}
          {beforeUrls.length > 3 && (
            <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{beforeUrls.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Footer Info & Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
            {win.responsible ? win.responsible.charAt(0).toUpperCase() : <User size={12} />}
          </div>
          <span className="truncate font-medium text-slate-700">
            {win.responsible || 'Sin asignar'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {win.deadline && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Calendar size={12} />
              <span>{new Date(win.deadline).toLocaleDateString()}</span>
            </div>
          )}

          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(win.id);
              }}
              title="Marcar como Completado"
              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-emerald-200 hover:border-emerald-600 shadow-sm"
            >
              <Check size={12} />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
