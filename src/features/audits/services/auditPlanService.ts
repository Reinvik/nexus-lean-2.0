import { supabase } from '../../../lib/supabase';
import type { AuditPlanItem, AuditPlanCompanyGuide } from '../../../types';

const STORAGE_PLAN_KEY = 'nexus_audit_5s_plans';
const STORAGE_GUIDE_KEY = 'nexus_audit_5s_company_guide';

/**
 * Normaliza nombres de áreas eliminando tildes, mayúsculas, espacios y palabras conectoras (de, del, la, el, cd, etc.)
 */
export function normalizeAreaName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(de|del|la|el|los|las|cd)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Verifica si dos nombres de área corresponden a la misma zona operativa
 */
export function isAreaMatch(planArea: string, auditArea: string): boolean {
  const norm1 = normalizeAreaName(planArea);
  const norm2 = normalizeAreaName(auditArea);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}

/**
 * Normaliza nombres de personas/auditores para comparación flexible:
 * - Convierte a minúsculas, quita tildes y caracteres no alfanuméricos.
 * - Trata como equivalentes 'ariel mella' y 'ariel mauricio' (Ariel Mauricio Mella).
 * - Elimina títulos como 'consultor', 'supervisor', 'supervisores', 'jefe', 'jefes de turno'.
 */
export function normalizeAuditorName(name: string): string {
  let clean = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(consultor|supervisor|supervisores|jefe|jefes|de|turno|todos)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();

  // Caso especial CIAL: Ariel Mauricio Mella aparece como "Ariel Mauricio" o "Ariel Mella"
  if (clean.includes('ariel') && (clean.includes('mella') || clean.includes('mauricio'))) {
    clean = clean.replace(/mauricio|mella/g, '').trim() + ' ariel_mella';
  }

  return clean;
}

/**
 * Comprueba si el auditor que ejecutó la auditoría coincide con el(los) auditor(es) asignado(s) en el plan
 */
export function isAuditorMatch(planAuditor: string, auditAuditor: string): boolean {
  if (!planAuditor || !auditAuditor) return false;

  const rawPlan = planAuditor.toLowerCase();
  // Si en el plan dice "todos", cualquier auditor vale
  if (rawPlan.includes('todos')) return true;

  const normAudit = normalizeAuditorName(auditAuditor);
  if (!normAudit) return false;

  // El plan puede tener múltiples auditores separados por '/', ',', ';', 'y'
  const plannedCandidates = planAuditor
    .split(/[/,;y\\]+/)
    .map((c) => normalizeAuditorName(c))
    .filter((c) => c.length > 0);

  return plannedCandidates.some((candidate) => {
    if (candidate === normAudit) return true;
    if (candidate.includes(normAudit) || normAudit.includes(candidate)) return true;

    // Comparar palabras significativas de al menos 4 caracteres (nombre o apellido)
    const candWords = candidate.split(/\s+/).filter((w) => w.length >= 4);
    const auditWords = normAudit.split(/\s+/).filter((w) => w.length >= 4);
    return candWords.some((cw) => auditWords.includes(cw));
  });
}

/**
 * Comprueba si dos fechas corresponden al mismo mes y año (YYYY-MM)
 */
export function isSameMonthAndYear(date1?: string | null, date2?: string | null): boolean {
  if (!date1 || !date2) return false;
  const ym1 = String(date1).trim().substring(0, 7);
  const ym2 = String(date2).trim().substring(0, 7);
  if (ym1.length < 7 || ym2.length < 7) return false;
  return ym1 === ym2;
}

/**
 * Regla de negocio estricta:
 * Una auditoría realizada solo valida una programación si coincide en:
 * 1. Mismo mes y año
 * 2. Misma zona/área
 * 3. Mismo auditor asignado
 * "si no, no vale."
 */
export function isAuditPlanMatch(
  plan: { area: string; planned_date: string; auditor: string },
  audit: { area: string; audit_date: string; auditor: string }
): boolean {
  // 1. Mismo mes y año (si no, no vale)
  if (!isSameMonthAndYear(plan.planned_date, audit.audit_date)) {
    return false;
  }
  // 2. Misma zona/área (si no, no vale)
  if (!isAreaMatch(plan.area, audit.area)) {
    return false;
  }
  // 3. Mismo auditor (si no, no vale)
  if (!isAuditorMatch(plan.auditor, audit.auditor)) {
    return false;
  }
  return true;
}

// Auditorías modelo iniciales basadas en el plan real de planta
const INITIAL_DEMO_PLANS: Omit<AuditPlanItem, 'id' | 'company_id' | 'created_at'>[] = [
  {
    item_number: 1,
    planner_responsible: 'Nataly Rubilar',
    area: 'Sala de Lavado',
    area_responsible: 'Claudio Muñoz',
    planned_date: '2026-09-15',
    auditor: 'Ariel Mella /Consultor',
    status: 'completed',
    completed_date: '2026-09-15',
    frequency: 'Mensual',
    notes: 'Auditoría inicial de Sala de Lavado',
  },
  {
    item_number: 2,
    planner_responsible: 'Nataly Rubilar',
    area: 'Picking',
    area_responsible: 'Cristian Hernandez',
    planned_date: '2026-09-22',
    auditor: 'Fernando Ramos/Ariel Mella',
    status: 'completed',
    completed_date: '2026-09-22',
    frequency: 'Mensual',
    notes: 'Auditoría realizada en área Picking',
  },
  {
    item_number: 3,
    planner_responsible: 'Nataly Rubilar',
    area: 'Encajado',
    area_responsible: 'Supervisor Picking',
    planned_date: '2026-09-23',
    auditor: 'Claudio Muñoz/ArielMella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Encajado',
  },
  {
    item_number: 4,
    planner_responsible: 'Nataly Rubilar',
    area: 'Oficinas',
    area_responsible: 'Todos',
    planned_date: '2026-09-24',
    auditor: 'Nataly Rubilar/Ariel Mella /Consultor',
    status: 'completed',
    completed_date: '2026-09-24',
    frequency: 'Mensual',
    notes: 'Auditoría en Oficinas administrativas',
  },
  {
    item_number: 5,
    planner_responsible: 'Nataly Rubilar',
    area: 'Logistica Inversa',
    area_responsible: 'Fernando Ramos',
    planned_date: '2026-09-25',
    auditor: 'Airen Gonzalez /ArielMella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Logística Inversa',
  },
  {
    item_number: 6,
    planner_responsible: 'Nataly Rubilar',
    area: 'Bodega UULL',
    area_responsible: 'Claudio Muñoz',
    planned_date: '2026-10-16',
    auditor: 'Ariel Mella /Consultor',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Bodega UULL',
  },
  {
    item_number: 7,
    planner_responsible: 'Nataly Rubilar',
    area: 'Sala Baterias',
    area_responsible: 'Walter Sanchez',
    planned_date: '2026-10-19',
    auditor: 'Fernando Ramos/Ariel Mella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Sala de Baterías',
  },
  {
    item_number: 8,
    planner_responsible: 'Nataly Rubilar',
    area: 'Canal dinamico',
    area_responsible: 'Claudio Muñoz',
    planned_date: '2026-10-20',
    auditor: 'Claudio Muñoz/ArielMella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Canal Dinámico',
  },
  {
    item_number: 9,
    planner_responsible: 'Nataly Rubilar',
    area: 'Despacho',
    area_responsible: 'Supervisores Despacho',
    planned_date: '2026-10-21',
    auditor: 'Airen Gonzalez /ArielMella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Despacho',
  },
  {
    item_number: 10,
    planner_responsible: 'Nataly Rubilar',
    area: 'Picking',
    area_responsible: 'Supervisores Picking',
    planned_date: '2026-10-22',
    auditor: 'Nataly Rubilar/Ariel Mella /Consultor',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Picking',
  },
  {
    item_number: 11,
    planner_responsible: 'Nataly Rubilar',
    area: 'Recepción',
    area_responsible: 'Supervisores Recepción',
    planned_date: '2026-10-23',
    auditor: 'Ariel Mella /Consultor',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Recepción',
  },
  {
    item_number: 12,
    planner_responsible: 'Nataly Rubilar',
    area: 'Bodega Insumos',
    area_responsible: 'Jefes de Turno',
    planned_date: '2026-10-26',
    auditor: 'Fernando Ramos/Ariel Mella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Bodega Insumos',
  },
  {
    item_number: 13,
    planner_responsible: 'Nataly Rubilar',
    area: 'Tavil',
    area_responsible: 'Claudio Muñoz',
    planned_date: '2026-10-27',
    auditor: 'Claudio Muñoz/ArielMella',
    status: 'pending',
    frequency: 'Mensual',
    notes: 'Por realizar en Tavil',
  },
];

export const auditPlanService = {
  /**
   * Obtiene todos los ítems planificados para la empresa
   */
  async getPlanItems(companyId?: string | null): Promise<AuditPlanItem[]> {
    // 1. Ejecutar auto-sincronización con auditorías reales si hay conexión
    if (navigator.onLine) {
      try {
        await this.syncPlansWithAudits(companyId);
      } catch (syncErr) {
        console.warn('Auto sync audit plans check:', syncErr);
      }
    }

    let items: AuditPlanItem[] = [];

    // 2. Intentar consultar desde Supabase
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
            id: String(d.id),
            company_id: d.company_id,
            item_number: d.item_number !== undefined && d.item_number !== null ? Number(d.item_number) : undefined,
            planner_responsible: d.planner_responsible || undefined,
            area: d.area,
            area_responsible: d.area_responsible || undefined,
            auditor: d.auditor || 'Sin auditor',
            planned_date: d.planned_date,
            frequency: d.frequency || 'Mensual',
            status: d.status === 'completed' ? 'completed' : 'pending',
            completed_date: d.completed_date || null,
            score: d.score !== undefined && d.score !== null ? Number(d.score) : null,
            completed_audit_id: d.completed_audit_id ? String(d.completed_audit_id) : null,
            guide_url: d.guide_url || null,
            guide_name: d.guide_name || null,
            notes: d.notes || '',
            created_at: d.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        // Fallback suave si hay desconexión
        console.warn('Supabase audit_5s_plans query check:', err);
      }
    }

    // 3. Si no hubo datos remotos o offline, cargar desde localStorage
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

    // 4. Si aún no hay datos para esta empresa, inicializar con plantilla modelo amigable
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
   * Sincroniza ítems pendientes del plan con auditorías reales registradas en audit_5s
   */
  async syncPlansWithAudits(companyId?: string | null): Promise<{
    syncedCount: number;
    updatedItems: AuditPlanItem[];
  }> {
    if (!navigator.onLine) {
      return { syncedCount: 0, updatedItems: [] };
    }

    try {
      // 1. Obtener los planes
      let plansQuery = supabase.from('audit_5s_plans').select('*');
      if (companyId && companyId !== 'all') {
        plansQuery = plansQuery.eq('company_id', companyId);
      }
      const { data: plansData, error: plansErr } = await plansQuery;
      if (plansErr || !plansData || plansData.length === 0) {
        return { syncedCount: 0, updatedItems: [] };
      }

      // 2. Obtener las auditorías reales
      let auditsQuery = supabase
        .from('audit_5s')
        .select('id, area, auditor, audit_date, total_score, status')
        .order('audit_date', { ascending: false });
      if (companyId && companyId !== 'all') {
        auditsQuery = auditsQuery.eq('company_id', companyId);
      }
      const { data: auditsData, error: auditsErr } = await auditsQuery;
      if (auditsErr || !auditsData || auditsData.length === 0) {
        return { syncedCount: 0, updatedItems: [] };
      }

      // Filtrar auditorías válidas
      const validAudits = auditsData.filter((a) => {
        const st = (a.status || '').toLowerCase();
        return st !== 'programada' && st !== 'scheduled';
      });

      let syncedCount = 0;
      const updatedItems: AuditPlanItem[] = [];

      for (const plan of plansData) {
        // Regla de Negocio Estricta:
        // Una auditoría realizada solo valida una programación si coincide en mismo mes, zona y auditor ("si no, no vale")
        const match = validAudits.find((aud) =>
          isAuditPlanMatch(
            { area: plan.area, planned_date: plan.planned_date, auditor: plan.auditor },
            { area: aud.area, audit_date: aud.audit_date, auditor: aud.auditor }
          )
        );

        if (match) {
          const rawScore = Number(match.total_score) || 0;
          const scorePercent = rawScore > 0 && rawScore <= 5 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);
          const needsUpdate =
            plan.status !== 'completed' ||
            !plan.completed_audit_id ||
            String(plan.completed_audit_id) !== String(match.id) ||
            plan.score === null ||
            plan.score === undefined;

          if (needsUpdate) {
            const completedDate = match.audit_date || plan.planned_date;
            const auditorName = match.auditor && match.auditor !== 'Sin auditor' ? match.auditor : plan.auditor;

            const { error: updErr } = await supabase
              .from('audit_5s_plans')
              .update({
                status: 'completed',
                completed_date: completedDate,
                auditor: auditorName,
                score: scorePercent,
                completed_audit_id: String(match.id),
              })
              .eq('id', plan.id);

            if (!updErr) {
              syncedCount++;
              updatedItems.push({
                ...plan,
                id: String(plan.id),
                status: 'completed',
                completed_date: completedDate,
                auditor: auditorName,
                score: scorePercent,
                completed_audit_id: String(match.id),
              });
            }
          }
        } else if (plan.completed_audit_id) {
          // Si el plan tenía una auditoría vinculada que NO cumple las 3 reglas (mes, zona, auditor), desvincularla ("si no, no vale")
          const linkedAudit = validAudits.find((a) => String(a.id) === String(plan.completed_audit_id));
          if (
            linkedAudit &&
            !isAuditPlanMatch(
              { area: plan.area, planned_date: plan.planned_date, auditor: plan.auditor },
              { area: linkedAudit.area, audit_date: linkedAudit.audit_date, auditor: linkedAudit.auditor }
            )
          ) {
            await supabase
              .from('audit_5s_plans')
              .update({
                status: 'pending',
                completed_date: null,
                score: null,
                completed_audit_id: null,
              })
              .eq('id', plan.id);

            updatedItems.push({
              ...plan,
              id: String(plan.id),
              status: 'pending',
              completed_date: null,
              score: null,
              completed_audit_id: null,
            });
          }
        }
      }

      // Sincronizar en localStorage
      if (updatedItems.length > 0) {
        try {
          const stored = localStorage.getItem(STORAGE_PLAN_KEY);
          if (stored) {
            let list: AuditPlanItem[] = JSON.parse(stored);
            updatedItems.forEach((upd) => {
              const idx = list.findIndex((i) => String(i.id) === String(upd.id));
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...upd };
              }
            });
            localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
          }
        } catch (e) {
          console.warn('Error syncing updated items to localStorage:', e);
        }
      }

      return { syncedCount, updatedItems };
    } catch (err) {
      console.error('Error in syncPlansWithAudits:', err);
      return { syncedCount: 0, updatedItems: [] };
    }
  },

  /**
   * Vincula automáticamente una auditoría con su respectivo ítem del plan
   */
  async linkAuditToPlan(audit: {
    id: string | number;
    companyId?: string | null;
    area: string;
    auditor?: string;
    auditDate?: string;
    totalScore?: number;
  }): Promise<boolean> {
    try {
      const rawScore = Number(audit.totalScore) || 0;
      const scorePercent = rawScore > 0 && rawScore <= 5 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);
      const auditDate = audit.auditDate || new Date().toISOString().split('T')[0];

      if (navigator.onLine) {
        let query = supabase.from('audit_5s_plans').select('*');
        if (audit.companyId && audit.companyId !== 'all') {
          query = query.eq('company_id', audit.companyId);
        }
        const { data: plans } = await query;
        if (plans && plans.length > 0) {
          const match = plans.find((p: any) =>
            isAuditPlanMatch(
              { area: p.area, planned_date: p.planned_date, auditor: p.auditor },
              { area: audit.area, audit_date: auditDate, auditor: audit.auditor || '' }
            )
          );
          if (match) {
            await supabase
              .from('audit_5s_plans')
              .update({
                status: 'completed',
                completed_date: auditDate,
                auditor: audit.auditor || match.auditor,
                score: scorePercent,
                completed_audit_id: String(audit.id),
              })
              .eq('id', match.id);
          }
        }
      }

      // LocalStorage
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      if (stored) {
        try {
          const list: AuditPlanItem[] = JSON.parse(stored);
          const matchIdx = list.findIndex((p) =>
            isAuditPlanMatch(
              { area: p.area, planned_date: p.planned_date, auditor: p.auditor },
              { area: audit.area, audit_date: auditDate, auditor: audit.auditor || '' }
            )
          );
          if (matchIdx >= 0) {
            list[matchIdx] = {
              ...list[matchIdx],
              status: 'completed',
              completed_date: auditDate,
              auditor: audit.auditor || list[matchIdx].auditor,
              score: scorePercent,
              completed_audit_id: String(audit.id),
            };
            localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
          }
        } catch (e) {
          console.warn('Error updating local storage plan for new audit:', e);
        }
      }

      return true;
    } catch (err) {
      console.warn('Error linking audit to plan:', err);
      return false;
    }
  },

  /**
   * Guarda o actualiza un ítem del plan de auditoría
   */
  async savePlanItem(item: AuditPlanItem): Promise<{ success: boolean; data?: AuditPlanItem; error?: string }> {
    try {
      const isTemp = String(item.id).startsWith('plan_');

      // 1. Intentar guardar en Supabase
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('audit_5s_plans')
            .upsert([
              {
                id: isTemp ? undefined : item.id,
                company_id: item.company_id && item.company_id !== 'global' ? item.company_id : null,
                item_number: item.item_number || null,
                planner_responsible: item.planner_responsible || null,
                area: item.area,
                area_responsible: item.area_responsible || null,
                auditor: item.auditor,
                planned_date: item.planned_date,
                frequency: item.frequency,
                status: item.status,
                completed_date: item.completed_date,
                score: item.score,
                completed_audit_id: item.completed_audit_id ? String(item.completed_audit_id) : null,
                guide_url: item.guide_url,
                guide_name: item.guide_name,
                notes: item.notes,
                created_at: item.created_at || new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (!error && data) {
            item = { ...item, id: String(data.id) };
          }
        } catch (supabaseErr) {
          console.warn('Supabase upsert failed, continuing with local storage:', supabaseErr);
        }
      }

      // 2. Guardar en localStorage
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      let list: AuditPlanItem[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((i) => String(i.id) === String(item.id));

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
   * Guarda múltiples auditorías en lote (importación por pegado de texto o archivo)
   */
  async bulkSavePlanItems(
    newItems: AuditPlanItem[],
    replaceExisting: boolean = false,
    companyId?: string | null
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const targetCompany = companyId && companyId !== 'all' ? companyId : 'global';

      // 1. Si se elige reemplazar, limpiar los registros de esta empresa en Supabase
      if (replaceExisting && navigator.onLine) {
        try {
          let delQuery = supabase.from('audit_5s_plans').delete();
          if (targetCompany !== 'global') {
            delQuery = delQuery.eq('company_id', targetCompany);
          } else {
            delQuery = delQuery.is('company_id', null);
          }
          await delQuery;
        } catch (e) {
          console.warn('Error deleting existing plans in supabase:', e);
        }
      }

      // 2. Insertar registros en lote en Supabase
      if (navigator.onLine && newItems.length > 0) {
        try {
          const rowsToInsert = newItems.map((item) => ({
            company_id: targetCompany !== 'global' ? targetCompany : null,
            item_number: item.item_number || null,
            planner_responsible: item.planner_responsible || null,
            area: item.area,
            area_responsible: item.area_responsible || null,
            auditor: item.auditor || 'Sin asignar',
            planned_date: item.planned_date,
            frequency: item.frequency || 'Mensual',
            status: item.status || 'pending',
            completed_date: item.completed_date || null,
            score: item.score || null,
            notes: item.notes || null,
            created_at: new Date().toISOString(),
          }));

          const { error } = await supabase.from('audit_5s_plans').insert(rowsToInsert);
          if (error) {
            console.warn('Supabase bulk insert warning:', error);
          }
        } catch (supErr) {
          console.warn('Supabase bulk error:', supErr);
        }
      }

      // 3. Sincronizar en localStorage
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      let list: AuditPlanItem[] = stored ? JSON.parse(stored) : [];

      if (replaceExisting) {
        if (targetCompany !== 'global') {
          list = list.filter((i) => i.company_id !== targetCompany && i.company_id !== 'global');
        } else {
          list = [];
        }
        list = [...newItems, ...list];
      } else {
        list = [...newItems, ...list];
      }

      localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
      return { success: true, count: newItems.length };
    } catch (err: any) {
      console.error('Error in bulkSavePlanItems:', err);
      return { success: false, count: 0, error: err.message || 'Error en carga masiva' };
    }
  },

  /**
   * Cambia con 1 solo clic el estado entre 'pending' y 'completed'
   */
  async togglePlanItemStatus(
    id: string | number,
    newStatus: 'pending' | 'completed',
    score?: number | null,
    auditId?: string | number | null
  ): Promise<{ success: boolean; updated?: AuditPlanItem; error?: string }> {
    try {
      const idStr = String(id);
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      let list: AuditPlanItem[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((i) => String(i.id) === idStr);

      if (index >= 0) {
        const item = list[index];
        const updated: AuditPlanItem = {
          ...item,
          status: newStatus,
          completed_date: newStatus === 'completed' ? (item.completed_date || new Date().toISOString().split('T')[0]) : null,
          score: score !== undefined ? score : item.score,
          completed_audit_id: auditId !== undefined ? (auditId ? String(auditId) : null) : item.completed_audit_id,
        };
        list[index] = updated;
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));

        // Actualizar en Supabase si está online
        if (navigator.onLine && !idStr.startsWith('plan_seed_')) {
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
  async deletePlanItem(id: string | number): Promise<{ success: boolean; error?: string }> {
    try {
      const idStr = String(id);
      const stored = localStorage.getItem(STORAGE_PLAN_KEY);
      if (stored) {
        let list: AuditPlanItem[] = JSON.parse(stored);
        list = list.filter((i) => String(i.id) !== idStr);
        localStorage.setItem(STORAGE_PLAN_KEY, JSON.stringify(list));
      }

      if (navigator.onLine && !idStr.startsWith('plan_seed_')) {
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
