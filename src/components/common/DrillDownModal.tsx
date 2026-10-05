import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MaximizableModal from './MaximizableModal';
import { Activity, AlertCircle } from 'lucide-react';

export interface DrillDownItem {
  id?: string | number;
  cardNumber?: string;
  status?: string;
  area?: string;
  description?: string;
  title?: string;
  name?: string;
  responsible?: string | null;
  date?: string;
  solutionDate?: string;
  daysToClose?: number;
  impact?: string;
  [key: string]: any;
}

export interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: '5s' | 'quick_wins' | '5s_closed' | 'high_impact' | 'vsm' | string | null;
  data: DrillDownItem[];
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  data,
}) => {
  const navigate = useNavigate();

  const columns = useMemo(() => {
    switch (type) {
      case '5s':
      case '5s_closed':
        return [
          { header: 'ID', accessor: 'cardNumber', width: 'w-16' },
          { header: 'Estado', accessor: 'status', width: 'w-24' },
          { header: 'Área', accessor: 'area', width: 'w-32' },
          { header: 'Descripción', accessor: 'description', width: 'flex-1' },
          { header: 'Fecha', accessor: 'date', width: 'w-32' },
          ...(type === '5s_closed'
            ? [
                { header: 'Cierre', accessor: 'solutionDate', width: 'w-32' },
                { header: 'Días', accessor: 'daysToClose', width: 'w-20' },
              ]
            : []),
        ];
      case 'quick_wins':
      case 'high_impact':
        return [
          { header: 'ID', accessor: 'id', width: 'w-16' },
          { header: 'Estado', accessor: 'status', width: 'w-24' },
          { header: 'Impacto', accessor: 'impact', width: 'w-24' },
          { header: 'Título', accessor: 'title', width: 'flex-1' },
          { header: 'Responsable', accessor: 'responsible', width: 'w-48' },
        ];
      case 'vsm':
        return [
          { header: 'ID', accessor: 'id', width: 'w-16' },
          { header: 'Nombre del Mapa', accessor: 'name', width: 'flex-1' },
          { header: 'Estado', accessor: 'status', width: 'w-32' },
          { header: 'Responsable', accessor: 'responsible', width: 'w-48' },
        ];
      default:
        return [];
    }
  }, [type]);

  const formatValue = (item: DrillDownItem, col: { header: string; accessor: string }) => {
    const val = item[col.accessor];

    if (val === 0) {
      if (col.accessor === 'daysToClose') return '0.0';
      return '0';
    }

    if (val === undefined || val === null || val === '') return '-';

    if (
      col.accessor === 'date' ||
      col.accessor === 'solutionDate' ||
      col.accessor === 'createdAt'
    ) {
      return new Date(val).toLocaleDateString('es-ES');
    }

    if (col.accessor === 'status') {
      let displayValue = val;
      let styles = 'bg-slate-100 text-slate-700';
      const lowerVal = String(val).toLowerCase();

      if (['cerrado', 'done', 'completed', 'finalizado'].includes(lowerVal)) {
        displayValue = lowerVal === 'cerrado' ? 'Cerrado' : 'Completado';
        styles = 'bg-emerald-100 text-emerald-700';
      } else if (['en proceso', 'en progreso', 'in_progress', 'doing'].includes(lowerVal)) {
        displayValue = 'En Proceso';
        styles = 'bg-amber-100 text-amber-700';
      } else if (['pendiente', 'pending', 'todo'].includes(lowerVal)) {
        displayValue = 'Pendiente';
        styles = 'bg-red-100 text-red-700';
      } else if (lowerVal === 'current') {
        displayValue = 'Actual';
        styles = 'bg-blue-100 text-blue-700';
      } else if (lowerVal === 'future') {
        displayValue = 'Futuro';
        styles = 'bg-purple-100 text-purple-700';
      }

      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${styles}`}
        >
          {displayValue}
        </span>
      );
    }

    if (col.accessor === 'daysToClose') {
      return (
        <span className="font-mono font-bold text-slate-700">
          {typeof val === 'number' ? val.toFixed(1) : val}
        </span>
      );
    }

    if (col.accessor === 'impact') {
      const isHigh = val === 'Alto';
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            isHigh ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {val}
        </span>
      );
    }

    return val;
  };

  const handleRowClick = (item: DrillDownItem) => {
    onClose();
    let targetPath = '';
    if (type === '5s' || type === '5s_closed') {
      targetPath = `/5s?cardId=${item.id}`;
    } else if (type === 'quick_wins' || type === 'high_impact') {
      targetPath = `/quick-wins?winId=${item.id}`;
    } else if (type === 'vsm') {
      targetPath = `/vsm?vsmId=${item.id}`;
    }

    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <MaximizableModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleIcon={<Activity size={20} />}
      defaultMaxWidth="max-w-6xl"
    >
      <div className="p-4">
        {!data || data.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay datos para mostrar en esta selección.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`px-4 py-3 font-bold ${col.width}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, rowIndex) => (
                  <tr
                    key={item.id || rowIndex}
                    onClick={() => handleRowClick(item)}
                    className="bg-white border-b hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-4 py-3">
                        {formatValue(item, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 text-xs text-slate-400 text-right">
          Mostrando {data?.length || 0} registros
        </div>
      </div>
    </MaximizableModal>
  );
};

export default DrillDownModal;
