import { supabase } from '../../../lib/supabase';
import { db } from '../../../lib/db';
import type { Audit5S, Audit5SEntry } from '../../../types';
import { auditPlanService } from './auditPlanService';

export const AUDIT_CRITERIA: Record<
  'S1' | 'S2' | 'S3' | 'S4' | 'S5',
  { title: string; subtitle: string; questions: string[] }
> = {
  S1: {
    title: 'S - Seleccionar (Seiri)',
    subtitle: 'Distinguir lo necesario de lo innecesario y retirar lo prescindible',
    questions: [
      '¿Se han eliminado los elementos innecesarios del área?',
      '¿Las herramientas y materiales están seleccionados y clasificados correctamente?',
      '¿Los pasillos y zonas de paso están libres de obstáculos?',
    ],
  },
  S2: {
    title: 'O - Ordenar (Seiton)',
    subtitle: 'Un lugar para cada cosa y cada cosa en su lugar',
    questions: [
      '¿Cada cosa tiene un lugar asignado y está en su lugar?',
      '¿Las ubicaciones están claramente etiquetadas y delimitadas?',
      '¿Es fácil encontrar, retirar y devolver las herramientas?',
    ],
  },
  S3: {
    title: 'L - Limpiar (Seiso)',
    subtitle: 'La limpieza es inspección y mantenimiento continuo',
    questions: [
      '¿El área de trabajo está limpia y libre de polvo, derrames o residuos?',
      '¿Existen programas o rutinas de limpieza visibles y se siguen?',
      '¿Los implementos de limpieza están disponibles y en buen estado?',
    ],
  },
  S4: {
    title: 'E - Estandarizar (Seiketsu)',
    subtitle: 'Crear hábitos y controles visuales para mantener las 3S',
    questions: [
      '¿Existen estándares visuales claros para el estado "normal"?',
      '¿Se utiliza código de colores para identificar anomalías?',
      '¿El personal conoce y cumple los procedimientos estándar del puesto?',
    ],
  },
  S5: {
    title: 'S - Sostener (Shitsuke)',
    subtitle: 'Fomentar la cultura de mejora continua, disciplina y rigor',
    questions: [
      '¿Se realizan auditorías periódicas y se respetan las fechas?',
      '¿Se respetan las normas de seguridad y EPP consistentemente?',
      '¿Existe un plan de acción activo para corregir desviaciones detectadas?',
    ],
  },
};

export const auditService = {
  async getAudits(companyId?: string | null): Promise<Audit5S[]> {
    let list: Audit5S[] = [];

    if (navigator.onLine) {
      try {
        let query = supabase
          .from('audit_5s')
          .select(`
            id, company_id, title, area, auditor, audit_date, total_score, status, created_at,
            audit_5s_entries (
              id, audit_id, section, question, score, comment
            )
          `)
          .order('audit_date', { ascending: false });

        if (companyId && companyId !== 'all' && companyId !== 'null') {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (!error && data) {
          list = data
            // Safely filter without dropping NULL status rows
            .filter((d: any) => {
              const st = (d.status || '').toLowerCase();
              if (st === 'programada' || st === 'scheduled') {
                return false;
              }

              // Exclude ghost/empty placeholder records
              const entriesCount = d.audit_5s_entries ? d.audit_5s_entries.length : 0;
              const score = Number(d.total_score) || 0;
              if (score === 0 && entriesCount === 0 && (!d.area || d.area.trim() === '')) {
                return false;
              }
              return true;
            })
            .map((d: any) => ({
              id: String(d.id),
              company_id: d.company_id,
              title: d.title || `Auditoría 5S - ${d.area || 'General'}`,
              area: d.area || 'General',
              auditor: d.auditor || 'Sin auditor',
              audit_date: d.audit_date,
              total_score: Number(d.total_score) || 0,
              status: d.status || 'Realizada',
              created_at: d.created_at,
              entries: d.audit_5s_entries || [],
            }));
        }
      } catch (err) {
        console.warn('Error fetching online audits:', err);
      }
    }

    // Offline pending audits from Dexie
    try {
      const rawOffline = await db.audits.toArray();
      const offlineAudits: Audit5S[] = rawOffline
        .filter((a) => !companyId || a.company_id === companyId)
        .map((a) => ({
          id: a.tempId,
          company_id: a.company_id,
          title: a.title,
          area: a.area,
          auditor: a.auditor,
          audit_date: a.audit_date,
          total_score: a.total_score,
          status: 'Pendiente',
          created_at: a.created_at,
          entries: a.entries as any,
          isOffline: true,
        }));

      return [...offlineAudits, ...list];
    } catch {
      return list;
    }
  },

  async createAudit(
    auditData: Omit<Audit5S, 'id' | 'created_at'>,
    entries: Audit5SEntry[]
  ): Promise<{ success: boolean; auditId?: string; error?: string }> {
    if (!auditData.area || !auditData.area.trim()) {
      return { success: false, error: 'El área a auditar es obligatoria.' };
    }
    if (!entries || entries.length === 0) {
      return { success: false, error: 'La auditoría debe contener respuestas evaluadas.' };
    }

    const tempId = `audit_off_${Date.now()}`;

    if (navigator.onLine) {
      try {
        const { data: audit, error: auditError } = await supabase
          .from('audit_5s')
          .insert([
            {
              company_id: auditData.company_id,
              title: auditData.title || `Auditoría 5S - ${auditData.area}`,
              area: auditData.area,
              auditor: auditData.auditor || 'Sin auditor',
              audit_date: auditData.audit_date,
              total_score: auditData.total_score,
              status: auditData.status || 'Realizada',
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (auditError) throw auditError;

        if (entries && entries.length > 0) {
          const entryPayload = entries.map((e) => ({
            audit_id: audit.id,
            section: e.section,
            question: e.question,
            score: e.score,
            comment: e.comment || null,
          }));

          const { error: entriesError } = await supabase
            .from('audit_5s_entries')
            .insert(entryPayload);

          if (entriesError) console.warn('Error inserting audit entries:', entriesError);
        }

        // Auto-vincular la auditoría realizada con el plan de auditorías
        try {
          await auditPlanService.linkAuditToPlan({
            id: audit.id,
            companyId: auditData.company_id,
            area: auditData.area,
            auditor: auditData.auditor,
            auditDate: auditData.audit_date,
            totalScore: auditData.total_score,
          });
        } catch (planSyncErr) {
          console.warn('Auto link plan warning:', planSyncErr);
        }

        return { success: true, auditId: String(audit.id) };
      } catch (err: any) {
        console.warn('Online audit creation failed, saving offline:', err);
      }
    }

    // Offline fallback in Dexie
    try {
      await db.audits.add({
        tempId,
        title: auditData.title,
        area: auditData.area,
        auditor: auditData.auditor,
        audit_date: auditData.audit_date,
        total_score: auditData.total_score,
        company_id: auditData.company_id,
        created_at: new Date().toISOString(),
        syncStatus: 'pending_insert',
        entries: entries.map((e) => ({
          audit_temp_id: tempId,
          section: e.section,
          question: e.question,
          score: e.score,
          comment: e.comment || '',
        })),
      });

      return { success: true, auditId: tempId };
    } catch (offlineErr: any) {
      return { success: false, error: offlineErr?.message || 'Error guardando auditoría' };
    }
  },

  async updateAudit(
    id: string | number,
    updates: {
      area?: string;
      auditor?: string;
      audit_date?: string;
      total_score?: number;
      title?: string;
      status?: 'Realizada' | 'Pendiente' | 'No Realizada';
    }
  ): Promise<{ success: boolean; data?: Partial<Audit5S>; error?: string }> {
    try {
      const idStr = String(id);

      // Offline check
      if (idStr.startsWith('audit_off_')) {
        await db.audits.update(idStr, updates as any);
        return { success: true, data: { id: idStr, ...updates } as Partial<Audit5S> };
      }

      const payload: any = {};
      if (updates.area !== undefined) {
        payload.area = updates.area.trim();
        payload.title = updates.title || `Auditoría 5S - ${updates.area.trim()}`;
      }
      if (updates.auditor !== undefined) payload.auditor = updates.auditor.trim();
      if (updates.audit_date !== undefined) payload.audit_date = updates.audit_date;
      if (updates.total_score !== undefined) payload.total_score = updates.total_score;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await supabase
        .from('audit_5s')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sincronizar con el plan de auditorías para mantener consistencia
      try {
        if (updates.area || updates.auditor || updates.total_score !== undefined) {
          await auditPlanService.syncPlansWithAudits(data?.company_id);
        }
      } catch (planErr) {
        console.warn('Could not re-sync plan after audit update:', planErr);
      }

      return {
        success: true,
        data: {
          id: String(data.id),
          area: data.area,
          title: data.title,
          auditor: data.auditor,
          audit_date: data.audit_date,
          total_score: Number(data.total_score),
          status: data.status,
        },
      };
    } catch (err: any) {
      console.error('Error updating audit:', err);
      return { success: false, error: err?.message || 'Error al actualizar auditoría' };
    }
  },

  async deleteAudit(id: string | number): Promise<{ success: boolean; error?: string }> {
    try {
      const idStr = String(id);
      if (idStr.startsWith('audit_off_')) {
        await db.audits.delete(idStr);
        return { success: true };
      }

      await supabase.from('audit_5s_entries').delete().eq('audit_id', id);
      const { error } = await supabase.from('audit_5s').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error eliminando auditoría' };
    }
  },
};
