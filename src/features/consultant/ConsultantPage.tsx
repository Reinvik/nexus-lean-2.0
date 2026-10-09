import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import HeaderWithFilter from '../../components/common/HeaderWithFilter';
import AIConsultant from './components/AIConsultant';
import { Brain, Lock } from 'lucide-react';

export const ConsultantPage: React.FC = () => {
  const { user, globalFilterCompanyId, companies } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    fiveS: any[];
    quickWins: any[];
    vsms: any[];
    a3: any[];
    auditLogs: any[];
  }>({
    fiveS: [],
    quickWins: [],
    vsms: [],
    a3: [],
    auditLogs: [],
  });

  useEffect(() => {
    async function loadAllData() {
      if (!user) return;
      setLoading(true);

      try {
        const isAdmin = user.isGlobalAdmin;

        const applyFilter = (query: any) => {
          if (
            isAdmin &&
            globalFilterCompanyId &&
            globalFilterCompanyId !== 'all' &&
            globalFilterCompanyId !== 'null'
          ) {
            return query.eq('company_id', globalFilterCompanyId);
          }
          if (!isAdmin && user.companyId) {
            return query.eq('company_id', user.companyId);
          }
          return query;
        };

        const [fiveSRes, qwRes, vsmRes, a3Res, auditRes] = await Promise.all([
          applyFilter(
            supabase
              .from('five_s_cards')
              .select(
                'id, status, company_id, created_at, close_date, updated_at, area, description, findings, assigned_to'
              )
          ),
          applyFilter(
            supabase
              .from('quick_wins')
              .select(
                'id, status, impact, company_id, title, responsible, description, date, created_at, effort_score'
              )
          ),
          applyFilter(
            supabase
              .from('vsm_projects')
              .select(
                'id, name, status, responsible, company_id, created_at, description, lead_time, process_time, efficiency, takt_time'
              )
          ),
          applyFilter(
            supabase
              .from('a3_projects')
              .select(
                'id, title, status, responsible, created_at, action_plan, follow_up_data, company_id, background, current_condition, goal, root_cause, countermeasures, ishikawas, five_whys'
              )
          ),
          applyFilter(
            supabase
              .from('audit_5s')
              .select('id, total_score, audit_date, company_id, area, auditor')
              .neq('status', 'programada')
              .neq('status', 'scheduled')
              .order('audit_date', { ascending: false })
          ),
        ]);

        setData({
          fiveS: fiveSRes.data || [],
          quickWins: qwRes.data || [],
          vsms: vsmRes.data || [],
          a3: a3Res.data || [],
          auditLogs: auditRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching data for AI Consultant:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, [user, globalFilterCompanyId]);

  const companyName = useMemo(() => {
    if (!globalFilterCompanyId || globalFilterCompanyId === 'all') {
      return 'Todas las Empresas';
    }
    const found = companies.find((c) => c.id === globalFilterCompanyId);
    return found?.name || 'Mi Empresa';
  }, [globalFilterCompanyId, companies]);

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
          subtitle="Análisis inteligente y asistencia en tiempo real"
          compact={true}
        />
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
        <AIConsultant
          data={data}
          companyName={companyName}
          apiKey={import.meta.env.VITE_GEMINI_API_KEY}
          fullScreen={true}
          isSyncing={loading}
        />
      </div>
    </div>
  );
};

export default ConsultantPage;
