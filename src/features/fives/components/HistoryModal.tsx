import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { Clock, X } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_type', '5S_CARD')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.warn('Could not load audit logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-slate-500" />
            Historial de Cambios
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-medium">
              Cargando historial...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium">
              No hay registros de cambios recientes.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`font-bold text-xs px-2 py-0.5 rounded ${
                      log.action === 'DELETE'
                        ? 'bg-red-100 text-red-700'
                        : log.action === 'CREATE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {log.action === 'DELETE'
                      ? 'ELIMINADO'
                      : log.action === 'CREATE'
                      ? 'CREADO'
                      : 'MODIFICADO'}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-600 text-xs">
                  {log.user_email && (
                    <div className="text-xs text-slate-400 mb-1">
                      Por: {log.user_email}
                    </div>
                  )}
                  {log.details?.deletedData && (
                    <div className="mt-1 p-2 bg-white rounded border border-slate-100">
                      <div>
                        <strong>Ubicación:</strong> {log.details.deletedData.location}
                      </div>
                      <div>
                        <strong>Nº Tarjeta:</strong> {log.details.deletedData.cardNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HistoryModal;
