import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
  FiveSCard,
  QuickWin,
  A3Project,
  A3ActionPlanItem,
  A3PlanGroup,
  Audit5S,
  Profile,
  Company,
} from '../../../types';
import type { TaskItem } from '../ResponsablesPage';
import { FiveSCardModal } from '../../fives/components/FiveSCardModal';
import { DetailEditModal } from '../../quick-wins/components/DetailEditModal';
import { CompletionModal } from '../../quick-wins/components/CompletionModal';
import { A3ActionModal } from '../../a3/components/A3ActionModal';
import { A3BoardView } from '../../a3/components/A3BoardView';
import { A3ActionPlan5W2H } from '../../a3/components/A3ActionPlan5W2H';
import AuditRadarChart from '../../audits/components/AuditRadarChart';
import { auditService } from '../../audits/services/auditService';
import { MaximizableModal } from '../../../components/common/MaximizableModal';
import { ImageLightbox } from '../../../components/common/ImageLightbox';
import {
  FileText,
  ListTodo,
  Layout,
  ShieldCheck,
  Calendar,
  User,
  MapPin,
  Award,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ResponsablesTaskDetailModalsProps {
  activeTask: TaskItem | null;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  users: Profile[];
  companies: Company[];
  currentUser: any;
  targetCompanyId: string | null;
  a3ProjectsMap: Map<string, A3Project>;
}

const DEFAULT_A3_PLANS: A3PlanGroup[] = [
  {
    id: 'main',
    name: 'Plan Principal (5W2H)',
    description: 'Plan de acción para erradicar la causa raíz',
    isDefault: true,
    color: 'brand',
  },
  {
    id: 'containment',
    name: 'Plan de Contención',
    description: 'Acciones inmediatas provisionales de contención',
    isDefault: false,
    color: 'amber',
  },
  {
    id: 'standardization',
    name: 'Plan de Estandarización',
    description: 'Auditorías, actualización de POE y entrenamiento',
    isDefault: false,
    color: 'indigo',
  },
];

export const ResponsablesTaskDetailModals: React.FC<ResponsablesTaskDetailModalsProps> = ({
  activeTask,
  onClose,
  onRefreshData,
  users,
  companies,
  currentUser,
  targetCompanyId,
  a3ProjectsMap,
}) => {
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [completionModalWinId, setCompletionModalWinId] = useState<string | null>(null);
  const [localQuickWin, setLocalQuickWin] = useState<QuickWin | null>(null);

  // Estado para alternar desde una Acción 5W2H hacia el Proyecto A3 completo sin salir del módulo
  const [viewingFullA3, setViewingFullA3] = useState<A3Project | null>(null);
  const [a3ModalTab, setA3ModalTab] = useState<'board' | 'plan'>('board');
  const [isSavingA3, setIsSavingA3] = useState(false);

  // Estado para detalle de Auditoría 5S
  const [auditDetail, setAuditDetail] = useState<Audit5S | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Sincronizar estado interno cuando cambia activeTask
  useEffect(() => {
    setZoomImageUrl(null);
    setCompletionModalWinId(null);
    setViewingFullA3(null);
    setA3ModalTab('board');
    setAuditDetail(null);

    if (!activeTask) {
      setLocalQuickWin(null);
      return;
    }

    if (activeTask.type === 'QW' && activeTask.rawTask) {
      setLocalQuickWin(activeTask.rawTask as QuickWin);
    }

    if (activeTask.type === 'A3') {
      const proj = a3ProjectsMap.get(activeTask.id) || (activeTask.rawTask as A3Project);
      if (proj) {
        setViewingFullA3(proj);
      }
    }

    if (activeTask.type === 'AUDIT') {
      const rawAudit = activeTask.rawTask as Audit5S | undefined;
      if (rawAudit && Array.isArray(rawAudit.entries) && rawAudit.entries.length > 0) {
        setAuditDetail(rawAudit);
      } else {
        setLoadingAudit(true);
        auditService
          .getAudits(targetCompanyId)
          .then((list) => {
            const found = list.find((a) => a.id === activeTask.id);
            if (found) {
              setAuditDetail(found);
            } else if (rawAudit) {
              setAuditDetail(rawAudit);
            }
          })
          .finally(() => setLoadingAudit(false));
      }
    }
  }, [activeTask, a3ProjectsMap, targetCompanyId]);

  const userOptions = useMemo<{ name: string; email?: string }[]>(() => {
    return users
      .map((u) => ({
        name: String((u as any).name || u.full_name || u.email || ''),
        email: u.email || undefined,
      }))
      .filter((u) => Boolean(u.name));
  }, [users]);

  // ---------------------------------------------------------------------------
  // 1. TARJETA 5S: Mapeo y Guardado en Supabase
  // ---------------------------------------------------------------------------
  const mappedFiveSCard = useMemo<FiveSCard | null>(() => {
    if (!activeTask || activeTask.type !== '5S' || !activeTask.rawTask) return null;
    const c = activeTask.rawTask;
    let color = '#ef4444';
    if (c.status === 'En Proceso' || c.status === 'En Progreso') color = '#f59e0b';
    if (c.status === 'Cerrado') color = '#10b981';

    return {
      ...c,
      responsible: c.responsible?.trim() || activeTask.collaboratorName || '',
      assigned_to: c.assigned_to || null,
      date: c.date || c.card_date || c.created_at,
      card_date: c.card_date || c.date || c.created_at,
      cardNumber: c.card_number || c.cardNumber || '?',
      card_number: c.card_number || c.cardNumber || '?',
      location: c.location || c.area || '',
      area: c.area || c.location || '',
      article: c.article || c.description || '',
      description: c.description || c.article || '',
      reason: c.reason || c.findings || '',
      findings: c.findings || c.reason || '',
      proposedAction: c.proposedAction || c.closure_comment || '',
      closure_comment: c.closure_comment || c.proposedAction || '',
      targetDate: c.targetDate || c.due_date || '',
      due_date: c.due_date || c.targetDate || '',
      solutionDate: c.solutionDate || c.close_date || '',
      close_date: c.close_date || c.solutionDate || '',
      image_urls: c.image_urls || (c.image_url ? [c.image_url] : []),
      after_image_urls: c.after_image_urls || (c.after_image_url ? [c.after_image_url] : []),
      statusColor: color,
    };
  }, [activeTask]);

  const handleSaveFiveSCard = async (cardData: Partial<FiveSCard>): Promise<boolean> => {
    try {
      const assignedUser = users.find(
        (u) =>
          u.id === cardData.assigned_to ||
          (u.full_name &&
            u.full_name.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase()) ||
          ((u as any).name &&
            (u as any).name.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase()) ||
          (u.email && u.email.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase())
      );

      const finalAssignedTo = cardData.assigned_to || assignedUser?.id || null;
      const finalResponsible =
        cardData.responsible ||
        assignedUser?.full_name ||
        (assignedUser as any)?.name ||
        assignedUser?.email ||
        null;
      const finalDate =
        cardData.date || cardData.card_date || new Date().toISOString().split('T')[0];

      const cardId = cardData.id || mappedFiveSCard?.id;
      if (!cardId) return false;

      const { error } = await supabase
        .from('five_s_cards')
        .update({
          card_number: cardData.cardNumber || cardData.card_number,
          area: cardData.location || cardData.area,
          description: cardData.article || cardData.description,
          findings: cardData.reason || cardData.findings,
          status: cardData.status,
          category: cardData.category,
          assigned_to: finalAssignedTo,
          responsible: finalResponsible,
          due_date: cardData.targetDate || cardData.due_date,
          close_date: cardData.solutionDate || cardData.close_date,
          closure_comment: cardData.proposedAction || cardData.closure_comment,
          image_urls: cardData.image_urls || [],
          image_url: cardData.image_urls?.[0] || null,
          after_image_urls: cardData.after_image_urls || [],
          after_image_url: cardData.after_image_urls?.[0] || null,
          date: finalDate,
          card_date: finalDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId);

      if (error) throw error;
      await onRefreshData();
      return true;
    } catch (err: any) {
      console.error('Error guardando tarjeta 5S desde Responsables:', err);
      toast.error('Error al guardar tarjeta 5S: ' + (err.message || 'Error desconocido'));
      return false;
    }
  };

  const handleDeleteFiveSCard = async (cardId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('five_s_cards').delete().eq('id', cardId);
      if (error) throw error;
      await onRefreshData();
      return true;
    } catch (err: any) {
      console.error('Error eliminando tarjeta 5S desde Responsables:', err);
      toast.error('Error al eliminar tarjeta 5S: ' + (err.message || ''));
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // 2. QUICK WIN: Edición, Subida de Fotos y Completado
  // ---------------------------------------------------------------------------
  const handleQuickWinImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const companyPath = targetCompanyId && targetCompanyId !== 'all' ? targetCompanyId : 'global';
      const filePath = `${companyPath}/quickwins/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('five-s-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error subiendo imagen de Quick Win:', error);
      toast.error('Error al subir la imagen: ' + (error?.message || ''));
      return null;
    }
  };

  const handleSaveQuickWin = async (updatedWin: QuickWin) => {
    try {
      const { error } = await supabase
        .from('quick_wins')
        .update({
          title: updatedWin.title,
          description: updatedWin.description,
          proposed_solution: updatedWin.proposed_solution,
          image_url: updatedWin.image_url,
          image_urls: updatedWin.image_urls || [],
          completion_image_url: updatedWin.completion_image_url,
          completion_image_urls: updatedWin.completion_image_urls || [],
          completion_comment: updatedWin.completion_comment,
          responsible: updatedWin.responsible,
          impact: updatedWin.impact,
          deadline: updatedWin.deadline,
          category: updatedWin.category,
          cause: updatedWin.cause,
          impact_score: updatedWin.impact_score,
          effort_score: updatedWin.effort_score,
        })
        .eq('id', updatedWin.id);

      if (error) throw error;
      toast.success('Quick Win actualizado correctamente');
      setLocalQuickWin(updatedWin);
      await onRefreshData();
    } catch (error: any) {
      console.error('Error actualizando Quick Win desde Responsables:', error);
      toast.error('Error al actualizar Quick Win: ' + (error?.message || ''));
      throw error;
    }
  };

  const handleConfirmQuickWinCompletion = async (
    winId: string,
    comment: string,
    images: string[]
  ) => {
    try {
      const completedAt = new Date().toISOString();
      const { error } = await supabase
        .from('quick_wins')
        .update({
          status: 'done',
          completion_image_url: images[0] || null,
          completion_image_urls: images || [],
          completion_comment: comment,
          completed_at: completedAt,
        })
        .eq('id', winId);

      if (error) throw error;
      toast.success('¡Quick Win completado exitosamente!');
      await onRefreshData();
      setCompletionModalWinId(null);
      onClose();
    } catch (error: any) {
      console.error('Error completando Quick Win:', error);
      toast.error('Error al completar Quick Win: ' + (error?.message || ''));
      throw error;
    }
  };

  const handleDeleteQuickWin = async (id: string) => {
    try {
      const { error } = await supabase.from('quick_wins').delete().eq('id', id);
      if (error) throw error;
      toast.success('Quick Win eliminado');
      await onRefreshData();
      onClose();
    } catch (error: any) {
      console.error('Error eliminando Quick Win:', error);
      toast.error('Error al eliminar Quick Win: ' + (error?.message || ''));
    }
  };

  // ---------------------------------------------------------------------------
  // 3. ACCIÓN 5W2H (A3_ACTION) & PROYECTO A3 COMPLETO
  // ---------------------------------------------------------------------------
  const parentA3ForAction = useMemo<A3Project | null>(() => {
    if (!activeTask) return null;
    if (activeTask.type === 'A3_ACTION' && activeTask.a3ProjectId) {
      return a3ProjectsMap.get(activeTask.a3ProjectId) || null;
    }
    if (activeTask.type === 'A3') {
      return a3ProjectsMap.get(activeTask.id) || (activeTask.rawTask as A3Project) || null;
    }
    return null;
  }, [activeTask, a3ProjectsMap]);

  const a3PlanGroups = useMemo<A3PlanGroup[]>(() => {
    const targetProj = viewingFullA3 || parentA3ForAction;
    if (!targetProj) return DEFAULT_A3_PLANS;

    const meta = targetProj.actionPlansMeta || targetProj.action_plans_meta;
    const base: A3PlanGroup[] =
      Array.isArray(meta) && meta.length > 0 ? [...meta] : [...DEFAULT_A3_PLANS];

    const existingIds = new Set(base.map((p) => p.id));
    const actions = (targetProj.actionPlan || targetProj.action_plan || []) as A3ActionPlanItem[];
    actions.forEach((act) => {
      const pid = act.planId;
      if (pid && pid !== 'all' && !existingIds.has(pid)) {
        existingIds.add(pid);
        base.push({
          id: pid,
          name: act.planName || `Plan ${pid.replace('plan-', '')}`,
          description: `Plan de acción`,
          color: 'indigo',
        });
      }
    });
    return base;
  }, [viewingFullA3, parentA3ForAction]);

  const handleSaveSingle5W2HAction = async (updatedItem: A3ActionPlanItem) => {
    if (!activeTask || !activeTask.a3ProjectId) return;
    try {
      const { data: a3Data, error: fetchErr } = await supabase
        .from('a3_projects')
        .select('action_plan')
        .eq('id', activeTask.a3ProjectId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentPlan = Array.isArray(a3Data?.action_plan) ? [...a3Data.action_plan] : [];
      const updatedPlan = currentPlan.map((act: any, idx: number) => {
        const matchById =
          activeTask.actionId !== undefined &&
          act.id !== undefined &&
          String(act.id) === String(activeTask.actionId);
        const matchByIdx = activeTask.actionIndex !== undefined && idx === activeTask.actionIndex;
        if (!matchById && !matchByIdx) return act;
        return {
          ...act,
          ...updatedItem,
        };
      });

      const { error: updErr } = await supabase
        .from('a3_projects')
        .update({ action_plan: updatedPlan })
        .eq('id', activeTask.a3ProjectId);

      if (updErr) throw updErr;

      toast.success('Tarea 5W2H actualizada exitosamente');
      await onRefreshData();
      onClose();
    } catch (err: any) {
      console.error('Error guardando acción 5W2H desde Responsables:', err);
      toast.error('No se pudo guardar la tarea 5W2H: ' + (err?.message || 'Error'));
    }
  };

  // Actualizar campos o plan de acción cuando el usuario está viendo el Proyecto A3 completo en el modal
  const handleUpdateFullA3ActionPlan = async (newActions: A3ActionPlanItem[]) => {
    if (!viewingFullA3) return;
    const updatedProj: A3Project = {
      ...viewingFullA3,
      actionPlan: newActions,
      action_plan: newActions,
    };
    setViewingFullA3(updatedProj);

    setIsSavingA3(true);
    try {
      const { error } = await supabase
        .from('a3_projects')
        .update({ action_plan: newActions })
        .eq('id', viewingFullA3.id);
      if (error) throw error;
      toast.success('Plan 5W2H del A3 guardado', { id: 'resp-a3-save' });
      await onRefreshData();
    } catch (err: any) {
      toast.error('Error al actualizar plan A3: ' + (err?.message || ''));
    } finally {
      setIsSavingA3(false);
    }
  };

  const handleUpdateFullA3Field = async (field: string, value: any) => {
    if (!viewingFullA3) return;
    const updatedProj: any = { ...viewingFullA3, [field]: value };
    if (field === 'currentCondition') updatedProj.current_condition = value;
    if (field === 'rootCause') updatedProj.root_cause = value;
    if (field === 'followUp') updatedProj.follow_up_notes = value;
    if (field === 'action_plan' || field === 'actionPlan') {
      return handleUpdateFullA3ActionPlan(value);
    }
    setViewingFullA3(updatedProj);

    const dbColumnMap: Record<string, string> = {
      title: 'title',
      status: 'status',
      responsible: 'responsible',
      background: 'background',
      currentCondition: 'current_condition',
      current_condition: 'current_condition',
      goal: 'goal',
      rootCause: 'root_cause',
      root_cause: 'root_cause',
      countermeasures: 'countermeasures',
      followUp: 'follow_up_notes',
      follow_up_notes: 'follow_up_notes',
      ishikawas: 'ishikawas',
      five_whys: 'five_whys',
      multipleFiveWhys: 'five_whys',
      paretoData: 'pareto_data',
      pareto_data: 'pareto_data',
      followUpData: 'follow_up_data',
      follow_up_data: 'follow_up_data',
    };

    const dbCol = dbColumnMap[field];
    if (!dbCol) return;

    try {
      const { error } = await supabase
        .from('a3_projects')
        .update({ [dbCol]: value })
        .eq('id', viewingFullA3.id);
      if (error) throw error;
      toast.success('A3 actualizado', { id: 'resp-a3-field' });
      await onRefreshData();
    } catch (err: any) {
      toast.error('Error al guardar cambio en A3');
    }
  };

  // Calcular puntajes Radar para Auditoría 5S
  const auditRadarScores = useMemo(() => {
    if (!auditDetail) return { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
    const entries = auditDetail.entries || [];
    const rawScore = Number(auditDetail.total_score) || 0;
    const normTotal =
      rawScore <= 5 && rawScore > 0 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);

    if (entries.length === 0) {
      return { s1: normTotal, s2: normTotal, s3: normTotal, s4: normTotal, s5: normTotal };
    }

    const hasScoreOver4 = entries.some((e) => (e.score || 0) > 4);
    const maxPerQuestion = hasScoreOver4 ? 5 : 4;
    const res = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
    (['s1', 's2', 's3', 's4', 's5'] as const).forEach((sec) => {
      const secEntries = entries.filter((e) => e.section?.toLowerCase() === sec);
      if (secEntries.length > 0) {
        const sum = secEntries.reduce((acc, curr) => acc + (curr.score || 0), 0);
        res[sec] = Math.min(
          100,
          Math.max(0, Math.round((sum / (secEntries.length * maxPerQuestion)) * 100))
        );
      } else {
        res[sec] = normTotal;
      }
    });
    return res;
  }, [auditDetail]);

  if (!activeTask) return null;

  return (
    <>
      {/* 1. MODAL TARJETA 5S */}
      {activeTask.type === '5S' && mappedFiveSCard && (
        <FiveSCardModal
          isOpen={true}
          onClose={onClose}
          card={mappedFiveSCard}
          users={users}
          companies={companies}
          currentUser={currentUser}
          targetCompanyId={targetCompanyId}
          onSave={handleSaveFiveSCard}
          onDelete={handleDeleteFiveSCard}
          onZoomImage={(url) => setZoomImageUrl(url)}
        />
      )}

      {/* 2. MODAL QUICK WIN + COMPLETION MODAL */}
      {activeTask.type === 'QW' && localQuickWin && (
        <>
          <DetailEditModal
            win={localQuickWin}
            isOpen={!completionModalWinId}
            onClose={onClose}
            onSave={handleSaveQuickWin}
            onDelete={handleDeleteQuickWin}
            onOpenCompleteModal={(winId) => setCompletionModalWinId(winId)}
            users={users}
            onUploadImage={handleQuickWinImageUpload}
            onZoomImage={(url) => setZoomImageUrl(url)}
          />
          <CompletionModal
            isOpen={Boolean(completionModalWinId)}
            winId={completionModalWinId}
            onClose={() => setCompletionModalWinId(null)}
            onConfirm={handleConfirmQuickWinCompletion}
            onUploadImage={handleQuickWinImageUpload}
          />
        </>
      )}

      {/* 3. MODAL TAREA / ACCIÓN 5W2H DE UN A3 (Cuando aún no se ha cambiado a la vista de A3 completo) */}
      {activeTask.type === 'A3_ACTION' && !viewingFullA3 && (
        <A3ActionModal
          isOpen={true}
          onClose={onClose}
          onSave={handleSaveSingle5W2HAction}
          actionToEdit={activeTask.rawTask as A3ActionPlanItem}
          users={userOptions}
          planGroups={a3PlanGroups}
          activePlanId={(activeTask.rawTask as A3ActionPlanItem)?.planId || 'main'}
          countermeasures={
            (parentA3ForAction?.countermeasureList || parentA3ForAction?.countermeasure_list || []).map(
              (c: any) => c.title
            )
          }
          projectGoal={parentA3ForAction?.goal}
          rootCause={parentA3ForAction?.rootCause || parentA3ForAction?.root_cause}
          parentA3Title={parentA3ForAction?.title}
          onOpenParentA3={
            parentA3ForAction
              ? () => {
                  setViewingFullA3(parentA3ForAction);
                  setA3ModalTab('board');
                }
              : undefined
          }
        />
      )}

      {/* 4. MODAL PROYECTO A3 COMPLETO (Tanto para tarjetas 'A3' como al expandir desde una tarea 'A3_ACTION') */}
      {viewingFullA3 && (
        <MaximizableModal
          isOpen={true}
          onClose={onClose}
          title={`Proyecto A3: ${viewingFullA3.title}`}
          titleIcon={<FileText size={20} />}
          defaultMaxWidth="max-w-7xl"
          headerActions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector rápido de pestaña: Tablero A3 vs Plan 5W2H */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setA3ModalTab('board')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    a3ModalTab === 'board'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layout size={13} />
                  <span>Tablero A3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setA3ModalTab('plan')}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    a3ModalTab === 'plan'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListTodo size={13} />
                  <span>
                    Plan 5W2H ({(viewingFullA3.actionPlan || viewingFullA3.action_plan || []).length})
                  </span>
                </button>
              </div>

              {/* Estado del Proyecto A3 */}
              <select
                value={viewingFullA3.status || 'En Proceso'}
                onChange={(e) => handleUpdateFullA3Field('status', e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Nuevo">Nuevo</option>
                <option value="En Proceso">En Proceso</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Completado">Completado</option>
                <option value="Cerrado">Cerrado</option>
              </select>
            </div>
          }
        >
          <div className="p-4 sm:p-6 bg-slate-50/60 min-h-[60vh]">
            {a3ModalTab === 'board' ? (
              <A3BoardView
                a3={viewingFullA3}
                onUpdate={handleUpdateFullA3Field}
                users={userOptions}
              />
            ) : (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
                <A3ActionPlan5W2H
                  actions={(viewingFullA3.actionPlan || viewingFullA3.action_plan || []) as A3ActionPlanItem[]}
                  onChange={handleUpdateFullA3ActionPlan}
                  users={userOptions}
                  countermeasures={
                    (viewingFullA3.countermeasureList || viewingFullA3.countermeasure_list || []).map(
                      (c: any) => c.title
                    )
                  }
                  plansMeta={viewingFullA3.actionPlansMeta || viewingFullA3.action_plans_meta || undefined}
                  isSaving={isSavingA3}
                  projectGoal={viewingFullA3.goal}
                  rootCause={viewingFullA3.rootCause || viewingFullA3.root_cause}
                />
              </div>
            )}
          </div>
        </MaximizableModal>
      )}

      {/* 5. MODAL AUDITORÍA 5S */}
      {activeTask.type === 'AUDIT' && (
        <MaximizableModal
          isOpen={true}
          onClose={onClose}
          title={auditDetail?.title || activeTask.title || 'Informe de Auditoría 5S'}
          titleIcon={<ShieldCheck size={20} />}
          defaultMaxWidth="max-w-5xl"
        >
          <div className="p-5 sm:p-6 space-y-6 bg-slate-50/50">
            {loadingAudit ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold">Cargando detalle de la auditoría 5S...</span>
              </div>
            ) : (
              <>
                {/* Resumen superior */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="text-cyan-600" /> Área Auditada
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      {auditDetail?.area || activeTask.area || 'Planta'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <User size={12} className="text-indigo-600" /> Auditor Líder
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      {auditDetail?.auditor || activeTask.collaboratorName || 'Auditor'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Calendar size={12} className="text-amber-600" /> Fecha
                    </span>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      {auditDetail?.audit_date ||
                        (activeTask.createdAt
                          ? new Date(activeTask.createdAt).toLocaleDateString('es-CL')
                          : '-')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                      <Award size={12} className="text-emerald-600" /> Puntaje Global
                    </span>
                    <p className="text-lg font-black text-emerald-800 mt-0.5">
                      {activeTask.extra?.replace('Puntaje: ', '') ||
                        `${auditDetail?.total_score || 0}%`}
                    </p>
                  </div>
                </div>

                {/* Gráfico Radar + Desglose de Criterios */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                      Polígono de Madurez 5S
                    </h4>
                    <AuditRadarChart scores={auditRadarScores} />
                  </div>

                  <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 max-h-[420px] overflow-y-auto">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Evaluación por Criterio ({auditDetail?.entries?.length || 0})</span>
                    </h4>

                    {auditDetail?.entries && auditDetail.entries.length > 0 ? (
                      <div className="space-y-2">
                        {auditDetail.entries.map((entry, idx) => (
                          <div
                            key={entry.id || idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                                  {entry.section}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  {entry.question}
                                </span>
                              </div>
                              {entry.comment && (
                                <p className="text-[11px] text-slate-600 italic pl-1">
                                  Observación: "{entry.comment}"
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                                entry.score >= 4
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : entry.score >= 2
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {entry.score} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        Esta auditoría fue registrada con puntaje global consolidado (
                        {activeTask.extra || 'Realizada'}).
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </MaximizableModal>
      )}

      {/* LIGHTBOX PARA AMPLIAR FOTOS (5S / QUICK WINS) */}
      <ImageLightbox imageUrl={zoomImageUrl} onClose={() => setZoomImageUrl(null)} />
    </>
  );
};

export default ResponsablesTaskDetailModals;
