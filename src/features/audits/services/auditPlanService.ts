import { supabase } from '../../../lib/supabase';
import type { AuditPlanItem, AuditPlanCompanyGuide } from '../../../types';

const STORAGE_PLAN_KEY = 'nexus_audit_5s_plans';
const STORAGE_GUIDE_KEY = 'nexus_audit_5s_company_guide';

// Auditorías modelo iniciales en caso de no existir datos aún
const INITIAL_DEMO_PLANS: Omit<AuditPlanItem, 'id' | 'company_id' | 'created_at'>[] = [
  {
    area: 'Línea de Ensamble y Mecanizado',
    auditor: 'Carlos Navarrete',
    planned_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    frequency: 'Mensual',
    status: 'pending',
    notes: 'Verificar delimitación visual de pasillos, puestos de trabajo (2S) y herramientas sin uso (1S).',
  },
  {
    area: 'Bodega de Repuestos & Insumos',
    auditor: 'Mariana Soto',
    planned_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    frequency: 'Quincenal',
    status: 'pending',
    notes: 'Revisar control de inventario visual, rotulación de estanterías y orden de materiales pesados.',
  },
  {
    area: 'Taller Central de Mantenimiento',
    auditor: 'Felipe Alarcón',
    planned_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    frequency: 'Mensual',
    status: 'completed',
    completed_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    score: 88,
    notes: 'Auditoría mensual estándar completada con éxito. Excelente orden en tableros de sombra.',
  },
  {
    area: 'Zona de Embarque & Logística',
    auditor: 'Claudia Riquelme',
    planned_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    frequency: 'Trimestral',
    status: 'pending',
    notes: 'Auditoría enfocada en 3S (Limpieza de pisos) y 4S (Estandarización de señalética de seguridad).',
  },
];

export const auditPlanService = {
  /**
   * Obtiene todos los ítems planificados para la empresa
   */
  async getPlanItems(companyId?: string | null): Promise<AuditPlanItem[]> {
    let items: AuditPlanItem[] = [];

    // 1. Intentar consultar desde Supabase
    if (navigator.onLine) {
      try {
        let query = supabase
          .from('audit_5s_plans')
          .select('*')
          .order('planned_date', { ascending: true });

        if (companyId && companyId !== 'all') {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          items = data.map((d: any) => ({
            id: d.id,
            company_id: d.company_id,
            area: d.area,
            auditor: d.auditor || 'Sin auditor',
            planned_date: d.planned_date,
            frequency: d.frequency || 'Mensual',
            status: d.status === 'completed' ? 'completed' : 'pending',
            completed_date: d.completed_date || null,
            score: d.score !== undefined && d.score !== null ? Number(d.score) : null,
            completed_audit_id: d.completed_audit_id || null,
            guide_url: d.guide_url || null,
            guide_name: d.guide_name || null,
            notes: d.notes || '',
            created_at: d.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        // Tabla posiblemente no creada aún en supabase, fallback suave
        console.warn('Supabase audit_5s_plans table check:', err);
      }
    }

    // 2. Si no hubo datos remotos o offline, cargar desde localStorage
    if (items.length === 0) {
      try {
        const stored = localStorage.getItem(STORAGE_PLAN_KEY);
        if (stored) {
          const parsed: AuditPlanItem[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            items = parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading audit plan from local storage:', e);
      }
    }

    // 3. Si aún no hay datos para esta empresa, inicializar con plantilla modelo amigable
    if (items.length === 0) {
      const targetCompany = companyId && companyId !== 'all' ? companyId : 'global';
      items = INITIAL_DEMO_PLANS.map((demo, idx) => ({
        ...demo,
        id: `plan_seed_${Date.now()}_${idx}`,
        company_id: targetCompany,
        created_at: new Date().toISOString(),
      }));

      try {
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Error saving seed audit plans:', err);
      }
    }

    // Filtrar por companyId si aplica
    if (companyId && companyId !== 'all') {
      const filtered = items.filter((item) => item.company_id === companyId || item.company_id === 'global');
      if (filtered.length > 0) return filtered;
    }

    return items;
  },

  /**
   * Guarda o actualiza un ítem del plan de auditoría
   */
  async savePlanItem(item: AuditPlanItem): Promise<{ success: boolean; data?: AuditPlanItem; error?: string }> {
    try {
      // 1. Intentar guardar en Supabase
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('audit_5s_plans')
            .upsert([
              {
                id: item.id.startsWith('plan_') ? undefined : item.id,
                company_id: item.company_id,
                area: item.area,
                auditor: item.auditor,
                planned_date: item.planned_date,
                frequency: item.frequency,
                status: item.status,
                completed_date: item.completed_date,
                score: item.score,
                completed_audit_id: item.completed_audit_id,
                guide_url: item.guide_url,
                guide_name: item.guide_name,
                notes: item.notes,
                created_at: item.created_at || new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (!error && data) {
            item = { ...item, id: data.id };
          }
        } catch (supabaseErr) {
          console.warn('Supabase upsert failed, continuing with local storage:', supabaseErr);
        }
      }

      // 2. Guardar en localStorage
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      let list: AuditPlanItem[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((i) => i.id === item.id);

      if (index >= 0) {
        list[index] = item;
      } else {
        list.unshift(item);
      }

      localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
      return { success: true, data: item };
    } catch (err: any) {
      console.error('Error saving audit plan item:', err);
      return { success: false, error: err.message || 'Error guardando auditoría planificada' };
    }
  },

  /**
   * Cambia con 1 solo clic el estado entre 'pending' y 'completed'
   */
  async togglePlanItemStatus(
    id: string,
    newStatus: 'pending' | 'completed',
    score?: number | null,
    auditId?: string | null
  ): Promise<{ success: boolean; updated?: AuditPlanItem; error?: string }> {
    try {
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      let list: AuditPlanItem[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((i) => i.id === id);

      if (index >= 0) {
        const item = list[index];
        const updated: AuditPlanItem = {
          ...item,
          status: newStatus,
          completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
          score: score !== undefined ? score : item.score,
          completed_audit_id: auditId !== undefined ? auditId : item.completed_audit_id,
        };
        list[index] = updated;
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));

        // Actualizar en Supabase si está online
        if (navigator.onLine && !id.startsWith('plan_seed_')) {
          try {
            await supabase
              .from('audit_5s_plans')
              .update({
                status: updated.status,
                completed_date: updated.completed_date,
                score: updated.score,
                completed_audit_id: updated.completed_audit_id,
              })
              .eq('id', id);
          } catch (e) {
            console.warn('Could not sync status toggle to Supabase:', e);
          }
        }

        return { success: true, updated };
      }

      return { success: false, error: 'Ítem no encontrado' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al cambiar estado' };
    }
  },

  /**
   * Elimina un ítem del plan
   */
  async deletePlanItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      if (stored) {
        let list: AuditPlanItem[] = JSON.parse(stored);
        list = list.filter((i) => i.id !== id);
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
      }

      if (navigator.onLine && !id.startsWith('plan_seed_')) {
        try {
          await supabase.from('audit_5s_plans').delete().eq('id', id);
        } catch (e) {
          console.warn('Could not delete from Supabase:', e);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar ítem del plan' };
    }
  },

  /**
   * Obtiene la guía oficial de auditoría de la empresa
   */
  async getCompanyGuide(companyId?: string | null): Promise<AuditPlanCompanyGuide | null> {
    try {
      const key = `${STORAGE_GUIDE_KEY}_${companyId || 'global'}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error fetching company guide:', e);
    }
    return null;
  },

  /**
   * Guarda o actualiza la guía oficial de auditoría de la empresa
   */
  async saveCompanyGuide(guide: AuditPlanCompanyGuide): Promise<{ success: boolean; error?: string }> {
    try {
      const key = `${STORAGE_GUIDE_KEY}_${guide.company_id || 'global'}`;
      localStorage.setItem(key, JSON.stringify(guide));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error guardando la guía' };
    }
  },

  /**
   * Elimina la guía oficial de auditoría
   */
  async deleteCompanyGuide(companyId?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      const key = `${STORAGE_GUIDE_KEY}_${companyId || 'global'}`;
      localStorage.removeItem(key);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};
