import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import type { QuickWin } from '../../../types';
import { CAUSES_COLUMNS, getCategoryStyles } from '../utils/quickWinsHelpers';

interface RootCausesViewProps {
  wins: QuickWin[];
  onSelectWin: (win: QuickWin) => void;
  onUpdateCause: (winId: string, newCause: string) => void;
}

export const RootCausesView: React.FC<RootCausesViewProps> = ({
  wins,
  onSelectWin,
  onUpdateCause,
}) => {
  return (
    <div className="flex gap-4 h-[700px] overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 animate-in fade-in duration-300">
      {CAUSES_COLUMNS.map((column) => {
        const columnWins = wins.filter((w) => (w.cause || 'infra') === column.id);

        return (
          <div
            key={column.id}
            className={`flex flex-col min-w-[270px] md:min-w-[290px] flex-1 ${column.bg} rounded-2xl border ${column.border} overflow-hidden shadow-sm transition-all`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('winId');
              if (id) onUpdateCause(id, column.id);
            }}
          >
            {/* Column Header */}
            <div
              className={`${column.headerBg} py-3.5 px-4 border-b ${column.border} flex justify-between items-center`}
            >
              <h3 className={`${column.text} font-black text-xs uppercase tracking-wider`}>
                {column.title}
              </h3>
              <span
                className={`bg-white/90 ${column.text} px-2.5 py-0.5 rounded-full text-[11px] font-black border ${column.border} shadow-sm`}
              >
                {columnWins.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="p-3 flex-grow overflow-y-auto space-y-3">
              {columnWins.map((win) => {
                const catStyle = getCategoryStyles(win.category);
                const isDone = win.status === 'done';

                return (
                  <div
                    key={win.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('winId', win.id)}
                    className={`bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 border-l-[5px] ${catStyle.borderLeft} hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing group`}
                    onClick={() => onSelectWin(win)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`${catStyle.bg} text-white rounded w-5 h-5 flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm`}
                        >
                          {(win.title || 'Q').charAt(0).toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">
                          {win.category || 'Operacional'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isDone ? 'Cerrado' : 'Abierto'}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors mb-2">
                      {win.title}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="truncate max-w-[140px] font-medium text-slate-600">
                        {win.responsible || 'Sin asignar'}
                      </span>
                      <div className="flex gap-1 font-bold">
                        <span className="text-emerald-600">I:{win.impact_score ?? 5}</span>
                        <span className="text-blue-600">E:{win.effort_score ?? 5}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnWins.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 py-12 text-slate-500">
                  <Target size={36} />
                  <span className="text-xs font-black uppercase tracking-wider mt-2">
                    Sin registros
                  </span>
                  <span className="text-[10px] text-center mt-1">
                    Arrastra aquí una ficha para clasificarla
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
