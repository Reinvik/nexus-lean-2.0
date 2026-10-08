import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import type { A3Project, A3ActionPlanItem, Profile } from '../../../types';

interface A3ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: A3Project | null;
  actions?: A3ActionPlanItem[];
  companyId?: string | null;
  companyName?: string;
}

export const A3ShareModal: React.FC<A3ShareModalProps> = ({
  isOpen,
  onClose,
  project,
  actions = [],
  companyId,
  companyName: propCompanyName,
}) => {
  const { user, companies } = useAuth();

  // Resolved Company ID
  const resolvedCompanyId = useMemo(() => {
    return (
      companyId ||
      project?.company_id ||
      project?.companyId ||
      user?.company_id ||
      user?.companyId ||
      null
    );
  }, [companyId, project, user]);

  // Resolved Company Name
  const resolvedCompanyName = useMemo(() => {
    if (propCompanyName) return propCompanyName;
    if (resolvedCompanyId) {
      const match = companies.find((c) => c.id === resolvedCompanyId);
      if (match?.name) return match.name;
    }
    return 'la Empresa';
  }, [propCompanyName, resolvedCompanyId, companies]);

  // Pending Actions
  const pendingActions = useMemo(() => {
    const list =
      actions && actions.length > 0
        ? actions
        : ((project?.actionPlan || project?.action_plan || []) as A3ActionPlanItem[]);

    return list.filter((a) => a.status !== 'completed');
  }, [actions, project]);

  // State
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [companyProfiles, setCompanyProfiles] = useState<Profile[]>([]);
  const [toInput, setToInput] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [includeAllCompany, setIncludeAllCompany] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [showTasksPreview, setShowTasksPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customCcInput, setCustomCcInput] = useState('');

  // Fetch company users for CC list
  useEffect(() => {
    if (!isOpen) return;

    const fetchCompanyUsers = async () => {
      setLoadingProfiles(true);
      try {
        let q = supabase
          .from('profiles')
          .select('id, full_name, email, company_id, is_authorized')
          .not('email', 'is', null);

        if (resolvedCompanyId) {
          q = q.eq('company_id', resolvedCompanyId);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (data) {
          const valid = (data as Profile[]).filter(
            (p) => p.email && p.email.includes('@') && p.email.includes('.')
          );
          setCompanyProfiles(valid);

          // By default, pre-populate CC with ALL company account emails
          const allEmails = Array.from(new Set(valid.map((p) => p.email!.trim().toLowerCase())));
          setCcEmails(allEmails);

          // Find default TO: either the A3 responsible's email or the current user's email
          const respName = (project?.responsible || '').trim().toLowerCase();
          const matchUser = valid.find(
            (p) =>
              (p.full_name && p.full_name.toLowerCase() === respName) ||
              (p.email && p.email.toLowerCase() === respName)
          );

          if (matchUser && matchUser.email) {
            setToInput(matchUser.email);
          } else if (user?.email) {
            setToInput(user.email);
          }
        }
      } catch (err) {
        console.error('Error fetching company profiles for CC:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchCompanyUsers();
  }, [isOpen, resolvedCompanyId, project?.responsible, user?.email]);

  // Toggle "Include all company users"
  const handleToggleAllCompany = (checked: boolean) => {
    setIncludeAllCompany(checked);
    if (checked) {
      const allEmails = Array.from(
        new Set(companyProfiles.map((p) => p.email!.trim().toLowerCase()))
      );
      setCcEmails(allEmails);
    } else {
      setCcEmails([]);
    }
  };

  // Remove individual email from CC
  const handleRemoveCc = (emailToRemove: string) => {
    setCcEmails((prev) => prev.filter((e) => e !== emailToRemove));
    setIncludeAllCompany(false);
  };

  // Add individual email to CC
  const handleAddCustomCc = () => {
    const trimmed = customCcInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      toast.error('Ingrese un correo válido');
      return;
    }
    if (!ccEmails.includes(trimmed)) {
      setCcEmails((prev) => [...prev, trimmed]);
    }
    setCustomCcInput('');
  };

  // Send Email Handler
  const handleSendEmail = async () => {
    if (!project) return;

    if (pendingActions.length === 0) {
      toast.error('No hay tareas pendientes en este proyecto A3 para compartir.');
      return;
    }

    // Parse TO emails
    const rawTo = toInput
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (rawTo.length === 0 && ccEmails.length === 0) {
      toast.error('Debe especificar al menos un destinatario (Para o Copia).');
      return;
    }

    setIsSending(true);
    const loadingToastId = toast.loading('Enviando tareas pendientes por correo...');

    try {
      const payload = {
        to: rawTo,
        cc: ccEmails,
        a3Title: project.title || 'Proyecto A3',
        a3Id: project.id,
        companyName: resolvedCompanyName,
        responsible: project.responsible || user?.name || '',
        date: project.date || new Date().toISOString().split('T')[0],
        pendingTasks: pendingActions.map((a) => ({
          what: a.what || a.activity || '',
          who: a.who || a.responsible || 'Sin asignar',
          when: a.when || a.date || '',
          status: a.status || 'pending',
          why: a.why || '',
          planName: a.planName || '',
          subtasks: a.subtasks || [],
        })),
        customMessage: customMessage.trim(),
        senderName: user?.name || user?.fullName || 'Equipo Nexus Lean',
      };

      const response = await fetch('/api/send-a3-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar el envío del correo');
      }

      toast.success(
        `¡Tareas pendientes enviadas! ${result.tasksSent} tareas compartidas con copia a ${result.ccCount} cuentas de ${resolvedCompanyName}.`,
        { id: loadingToastId, duration: 6000 }
      );
      onClose();
    } catch (err: any) {
      console.error('Error sending A3 tasks email:', err);
      toast.error('Error al enviar correo: ' + (err.message || ''), { id: loadingToastId });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight flex items-center gap-2">
                <span>Compartir Tareas Pendientes por Correo</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                Proyecto: <span className="text-cyan-300 font-semibold">{project.title}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-sm">
                  {pendingActions.length}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {pendingActions.length === 1
                      ? '1 tarea pendiente en este A3'
                      : `${pendingActions.length} tareas pendientes en este A3`}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Se enviará el detalle de cada acción 5W2H con su responsable y fecha límite.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTasksPreview(!showTasksPreview)}
                className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
              >
                <span>{showTasksPreview ? 'Ocultar detalle' : 'Ver tareas'}</span>
                {showTasksPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Collapsible Tasks List Preview */}
            {showTasksPreview && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 max-h-48 overflow-y-auto pr-1">
                {pendingActions.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold text-slate-800">{act.what || act.activity}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>👤 {act.who || act.responsible || 'Sin responsable'}</span>
                        <span>•</span>
                        <span>📅 {act.when || act.date || 'Sin fecha'}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        act.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {act.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destinatario Principal (Para / TO) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Para (Destinatario Principal):</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Separa múltiples correos con coma
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="ejemplo@cial.cl, responsable@empresa.com..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Con Copia (CC): Cuentas de la Empresa (CIAL) */}
          <div className="space-y-2.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building size={16} className="text-indigo-600 shrink-0" />
                <span className="text-xs font-extrabold text-slate-800">
                  Con Copia (CC) a Cuentas de {resolvedCompanyName}
                </span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 select-none">
                <input
                  type="checkbox"
                  checked={includeAllCompany}
                  onChange={(e) => handleToggleAllCompany(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Todas las cuentas ({companyProfiles.length})</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Se enviará copia informativa a los usuarios registrados de{' '}
              <strong className="text-indigo-900">{resolvedCompanyName}</strong> en la aplicación.
            </p>

            {/* CC Chips List */}
            <div className="bg-white border border-indigo-200/60 rounded-xl p-2.5 max-h-36 overflow-y-auto">
              {loadingProfiles ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Cargando cuentas de {resolvedCompanyName}...
                </div>
              ) : ccEmails.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  No hay cuentas en copia seleccionadas.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ccEmails.map((email) => {
                    const prof = companyProfiles.find((p) => p.email?.toLowerCase() === email);
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-medium"
                      >
                        <span title={prof?.full_name || email}>
                          {prof?.full_name ? `${prof.full_name} (${email})` : email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCc(email)}
                          className="text-indigo-400 hover:text-rose-600 transition-colors ml-0.5"
                          title="Remover de copia"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Custom CC */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="email"
                value={customCcInput}
                onChange={(e) => setCustomCcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCc();
                  }
                }}
                placeholder="Añadir otro email a CC..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomCc}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Mensaje Personalizado Opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Mensaje o Instrucciones Adicionales (Opcional):
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ej: Estimado equipo CIAL, comparto las tareas pendientes del A3 para revisión en la reunión de mañana..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info size={13} className="text-slate-400 shrink-0" />
            <span>
              Total destinatarios: <strong>{(toInput ? 1 : 0) + ccEmails.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending || pendingActions.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all"
            >
              <Send size={14} className={isSending ? 'animate-pulse' : ''} />
              <span>{isSending ? 'Enviando Correo...' : 'Enviar Reporte por Correo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default A3ShareModal;
