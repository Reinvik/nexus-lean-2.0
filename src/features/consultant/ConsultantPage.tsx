import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import HeaderWithFilter from '../../components/common/HeaderWithFilter';
import AIConsultant from './components/AIConsultant';
import { Lock } from 'lucide-react';

export const ConsultantPage: React.FC = () => {
  const { user, globalFilterCompanyId, activeCompanyId, companies } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    fiveS: any[];
    quickWins: any[];
    vsms: any[];
    a3: any[];
    auditLogs: any[];
    gembaWalks: any[];
    gembaFindings: any[];
    profiles: any[];
  }>({
    fiveS: [],
    quickWins: [],
    vsms: [],
    a3: [],
    auditLogs: [],
    gembaWalks: [],
    gembaFindings: [],
    profiles: [],
  });

  const effectiveCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.isGlobalAdmin) {
      if (
        globalFilterCompanyId &&
        globalFilterCompanyId !== 'all' &&
        globalFilterCompanyId !== 'null'
      ) {
        return globalFilterCompanyId;
      }
      return null;
    }
    return user.companyId || user.company_id || activeCompanyId || null;
  }, [user, globalFilterCompanyId, activeCompanyId]);

  useEffect(() => {
    let isMounted = true;

    async function loadAllData() {
      if (!user) return;
      setLoading(true);

      try {
        const applyFilter = (query: any) => {
          if (effectiveCompanyId) {
            return query.eq('company_id', effectiveCompanyId);
          }
          return query;
        };

        const [
          fiveSRes,
          qwRes,
          vsmRes,
          a3Res,
          auditRes,
          gembaWalksRes,
          gembaFindingsRes,
          profilesRes,
        ] = await Promise.all([
          applyFilter(
            supabase
              .from('five_s_cards')
              .select(
                'id, status, company_id, created_at, close_date, updated_at, area, description, findings, assigned_to, responsible, priority, category, due_date, card_date, date'
              )
              .order('created_at', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('quick_wins')
              .select(
                'id, status, impact, company_id, title, responsible, description, proposed_solution, completion_comment, date, deadline, created_at, effort_score, category, cause'
              )
              .order('created_at', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('vsm_projects')
              .select(
                'id, name, status, responsible, company_id, created_at, description, lead_time, process_time, efficiency, takt_time'
              )
              .order('created_at', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('a3_projects')
              .select(
                'id, title, status, responsible, created_at, action_plan, follow_up_data, company_id, background, current_condition, goal, root_cause, countermeasures, ishikawas, five_whys, pareto_data'
              )
              .order('created_at', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('audit_5s')
              .select(
                'id, total_score, audit_date, date, created_at, company_id, area, title, auditor, status, entries:audit_5s_entries(section, question, score, comment)'
              )
              .neq('status', 'programada')
              .neq('status', 'scheduled')
              .order('audit_date', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('gemba_walks')
              .select(
                'id, title, area, status, walker_name, scheduled_date, focus_theme, summary_notes, company_id, created_at'
              )
              .order('created_at', { ascending: false })
          ),
          applyFilter(
            supabase
              .from('gemba_findings')
              .select(
                'id, walk_id, company_id, station_name, operator_name, finding_type, muda_category, description, immediate_action, audio_note_url, status, created_at'
              )
              .order('created_at', { ascending: false })
          ),
          supabase.from('profiles').select('id, full_name, email'),
        ]);

        if (!isMounted) return;

        setData({
          fiveS: fiveSRes.data || [],
          quickWins: qwRes.data || [],
          vsms: vsmRes.data || [],
          a3: a3Res.data || [],
          auditLogs: auditRes.data || [],
          gembaWalks: gembaWalksRes.data || [],
          gembaFindings: gembaFindingsRes.data || [],
          profiles: profilesRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching data for AI Consultant:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, effectiveCompanyId]);

  const companyName = useMemo(() => {
    if (!effectiveCompanyId) {
      return 'Todas las Empresas';
    }
    const found = companies.find((c) => c.id === effectiveCompanyId);
    return found?.name || 'Mi Empresa';
  }, [effectiveCompanyId, companies]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 font-sans">
        Cargando usuario...
      </div>
    );
  }

  // Permission check
  const hasAIAccess = Boolean(
    user.isGlobalAdmin || user.canAccessAdmin || user.hasAiAccess
  );

  if (!hasAIAccess) {
    return (
      <div className="w-full mx-auto p-8 flex flex-col items-center justify-center h-[60vh] text-center font-sans">
        <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-500">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
        <p className="text-slate-500 max-w-md text-sm leading-relaxed">
          No tienes permisos para acceder al Consultor IA. Contacta al administrador
          de tu organización para habilitar el módulo.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto flex flex-col h-[calc(100vh-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.24))]">
      <div className="shrink-0 mb-2">
        <HeaderWithFilter
          title="Consultor IA"
          subtitle="Diagnóstico 360° de los 6 módulos Lean y asistencia en tiempo real"
          compact={true}
        />
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
        <AIConsultant
          data={data}
          companyName={companyName}
          companyId={effectiveCompanyId}
          apiKey={import.meta.env.VITE_GEMINI_API_KEY}
          fullScreen={true}
          isSyncing={loading}
        />
      </div>
    </div>
  );
};

export default ConsultantPage;
