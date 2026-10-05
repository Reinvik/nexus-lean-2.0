import React from 'react';
import type { QuickWin } from '../../../types';
import { getCategoryStyles, CATEGORIES } from '../utils/quickWinsHelpers';

interface MatrixViewProps {
  wins: QuickWin[];
  onSelectWin: (win: QuickWin) => void;
  onUpdateScores: (id: string, impact: number, effort: number) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  wins,
  onSelectWin,
  onUpdateScores,
}) => {
  const pendingWins = wins.filter((w) => w.status !== 'done');

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const winId = e.dataTransfer.getData('winId');
    if (!winId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate effort (X axis: 1 to 10) and impact (Y axis: 10 at top to 1 at bottom)
    const effort = Math.min(10, Math.max(1, Math.round((x / rect.width) * 9) + 1));
    const impact = Math.min(10, Math.max(1, Math.round((1 - y / rect.height) * 9) + 1));

    onUpdateScores(winId, impact, effort);
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200 min-h-[750px] flex flex-col relative overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Matriz de Priorización (Impacto vs Esfuerzo)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Arrastra las fichas para ajustar su posición en el cuadrante o haz clic para ver detalles.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 uppercase">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Quick Wins
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Proyectos A3
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div> Descartar
          </span>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-grow flex flex-col relative select-none">
        {/* Y Axis Label */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-slate-400 font-black text-xs md:text-sm tracking-[0.3em] z-10 uppercase pointer-events-none">
          Impacto
        </div>

        {/* X Axis Label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-slate-400 font-black text-xs md:text-sm tracking-[0.3em] z-10 uppercase pointer-events-none">
          Esfuerzo
        </div>

        {/* Droppable Board */}
        <div
          className="flex-grow relative ml-10 mb-10 mr-2 bg-slate-50 rounded-xl border-2 border-slate-200 overflow-visible"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px)`,
            backgroundSize: '11.111% 11.111%',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Central cross axes */}
          <div className="absolute left-0 right-0 top-1/2 border-t-2 border-slate-300 z-10 pointer-events-none"></div>
          <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-slate-300 z-10 pointer-events-none"></div>

          {/* Quadrant Overlays */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
            {/* Top-Left: Quick Wins (Low Effort / High Impact) */}
            <div className="bg-emerald-50/25 flex flex-col items-center justify-center border-r border-b border-slate-200/60 rounded-tl-[10px]">
              <span className="text-emerald-700/10 font-black text-4xl md:text-6xl uppercase tracking-[0.2em] -rotate-12">
                Quick Wins
              </span>
              <span className="text-emerald-700/50 text-[10px] md:text-xs font-black uppercase mt-1">
                Bajo Esfuerzo / Alto Impacto
              </span>
            </div>

            {/* Top-Right: Macro / A3 (High Effort / High Impact) */}
            <div className="bg-blue-50/25 flex flex-col items-center justify-center border-b border-slate-200/60 rounded-tr-[10px]">
              <span className="text-blue-700/10 font-black text-4xl md:text-6xl uppercase tracking-[0.2em] rotate-12">
                Macro / A3
              </span>
              <span className="text-blue-700/50 text-[10px] md:text-xs font-black uppercase mt-1">
                Alto Esfuerzo / Alto Impacto
              </span>
            </div>

            {/* Bottom-Left: Relleno (Low Effort / Low Impact) */}
            <div className="bg-amber-50/25 flex flex-col items-center justify-center border-r border-slate-200/60 rounded-bl-[10px]">
              <span className="text-amber-700/10 font-black text-4xl md:text-6xl uppercase tracking-[0.2em] rotate-12">
                Relleno
              </span>
              <span className="text-amber-700/50 text-[10px] md:text-xs font-black uppercase mt-1">
                Bajo Esfuerzo / Bajo Impacto
              </span>
            </div>

            {/* Bottom-Right: Descartar (High Effort / Low Impact) */}
            <div className="bg-rose-50/25 flex flex-col items-center justify-center rounded-br-[10px]">
              <span className="text-rose-700/10 font-black text-4xl md:text-6xl uppercase tracking-[0.2em] -rotate-12">
                Descartar
              </span>
              <span className="text-rose-700/50 text-[10px] md:text-xs font-black uppercase mt-1">
                Alto Esfuerzo / Bajo Impacto
              </span>
            </div>
          </div>

          {/* Interactive Draggable Dots */}
          {pendingWins.map((win) => {
            const effort = win.effort_score ?? 5;
            const impact = win.impact_score ?? 5;
            const left = ((effort - 1) / 9) * 100;
            const bottom = ((impact - 1) / 9) * 100;
            const style = getCategoryStyles(win.category);

            return (
              <div
                key={win.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('winId', win.id)}
                className={`absolute w-12 h-12 ${style.bg} border-4 border-white rounded-full flex flex-col items-center justify-center font-black text-xs shadow-xl transform -translate-x-1/2 translate-y-1/2 transition-transform cursor-grab active:cursor-grabbing hover:scale-125 z-20 group text-white p-1`}
                style={{ left: `${left}%`, bottom: `${bottom}%` }}
                onClick={() => onSelectWin(win)}
              >
                <span className="relative z-10 leading-tight truncate w-full text-center text-[10px]">
                  {win.title.split(' ')[0]}
                </span>
                <span className="relative z-10 text-[8px] opacity-90 truncate max-w-full">
                  {win.responsible?.split(' ')[0] || 'Idea'}
                </span>
                <div className="absolute inset-0 rounded-full animate-pulse bg-white/20 group-hover:animate-ping"></div>

                {/* Floating Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-14 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-2xl whitespace-nowrap transition-opacity pointer-events-none border border-slate-700 min-w-[170px] z-50">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold border-b border-slate-700 pb-1 text-white">
                      {win.title}
                    </span>
                    <div className="flex justify-between font-medium text-slate-300">
                      <span>
                        Esfuerzo: <b className="text-blue-400">{effort} / 10</b>
                      </span>
                      <span>
                        Impacto: <b className="text-emerald-400">{impact} / 10</b>
                      </span>
                    </div>
                    {win.responsible && (
                      <span className="text-[10px] text-slate-400">Resp: {win.responsible}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs select-none">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          Categoría de la Idea
        </span>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-slate-600">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <span key={key} className="flex items-center gap-2 hover:scale-105 transition-transform">
              <div
                className={`w-3.5 h-3.5 ${cat.bg} rounded-full border-2 border-white shadow-md shrink-0`}
              ></div>
              {cat.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
