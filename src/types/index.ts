// Auth & Multi-tenant types
export type UserRole = 'user' | 'superuser' | 'superadmin' | 'platform_admin' | 'NexusOwner';

export interface Company {
  id: string;
  name: string;
  domain?: string;
  schema_name?: string;
  slug?: string;
  database_schema?: string;
  is_lobby?: boolean;
  allowed_apps?: string[] | null;
  allowed_modules?: string[] | null;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  company_id?: string | null;
  role: UserRole;
  database_schema?: string;
  is_authorized?: boolean;
  has_ai_access?: boolean;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NexusUser {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: UserRole;
  companyId: string | null;
  company_id?: string | null;
  isNexusOwner: boolean;
  isGlobalAdmin: boolean;
  isCompanyAdmin: boolean;
  canAccessAdmin: boolean;
  isAuthorized: boolean;
  hasAiAccess: boolean;
  allowedModules: string[];
  databaseSchema: string;
  avatarUrl?: string | null;
}

// 5S Module Types
export type FiveSCategory = 'Seiri' | 'Seiton' | 'Seiso' | 'Seiketsu' | 'Shitsuke' | 'Seguridad' | 'Calidad' | 'Medio Ambiente' | 'Otro';
export type FiveSPriority = 'Baja' | 'Media' | 'Alta';
export type FiveSStatus = 'Abierto' | 'En Proceso' | 'En Progreso' | 'Cerrado' | 'Pendiente de subir';

export interface FiveSCard {
  id: string;
  company_id: string;
  companyId?: string;
  cardNumber?: string;
  card_number?: string | null;
  card_date?: string | null;
  date?: string | null;
  area: string;
  location?: string | null;
  description: string;
  article?: string | null;
  findings?: string | null;
  reason?: string | null;
  status: FiveSStatus;
  priority?: FiveSPriority;
  category: FiveSCategory;
  type?: string;
  assigned_to?: string | null;
  responsible?: string | null;
  due_date?: string | null;
  targetDate?: string | null;
  close_date?: string | null;
  solutionDate?: string | null;
  closure_comment?: string | null;
  proposedAction?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  after_image_url?: string | null;
  after_image_urls?: string[] | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  isOffline?: boolean;
  tempId?: string;
  statusColor?: string;
}

// 5S Audit Module Types
export interface Audit5SEntry {
  id?: string;
  audit_id?: string;
  section: 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
  question: string;
  score: number; // 0 to 4 or 0 to 10
  comment?: string | null;
}

export interface Audit5S {
  id: string;
  company_id: string;
  title?: string | null;
  area: string;
  auditor: string;
  audit_date: string;
  total_score: number;
  status?: 'Realizada' | 'Pendiente' | 'No Realizada';
  created_at: string;
  entries?: Audit5SEntry[];
  isOffline?: boolean;
}

// 5S Audit Plan / Schedule Types
export interface AuditPlanItem {
  id: string;
  company_id: string;
  item_number?: number;
  planner_responsible?: string;
  area: string;
  area_responsible?: string;
  auditor: string;
  planned_date: string; // YYYY-MM-DD
  frequency?: 'Única' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';
  status: 'pending' | 'completed'; // 'pending' = Pendiente, 'completed' = Realizada
  completed_date?: string | null;
  score?: number | null; // Calificación obtenida si ya se evaluó
  completed_audit_id?: string | null; // Id de la auditoría 5S vinculada
  guide_url?: string | null; // Documento o guía de verificación específica adjunta
  guide_name?: string | null; // Nombre original del archivo guía
  notes?: string | null; // Observaciones, alcance o foco de la auditoría
  created_at: string;
}

export interface AuditPlanCompanyGuide {
  id: string;
  company_id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
  description?: string;
}

// Quick Wins Types
export interface QuickWin {
  id: string;
  company_id: string | null;
  title: string;
  description?: string | null;
  proposed_solution?: string | null;
  status: 'idea' | 'in_progress' | 'done';
  impact: 'Alto' | 'Medio' | 'Bajo';
  responsible?: string | null;
  date: string;
  deadline?: string | null;
  image_url?: string | null;
  completion_image_url?: string | null;
  category?: string | null;
  cause?: string | null;
  impact_score?: number | null;
  effort_score?: number | null;
  image_urls?: string[] | null;
  completion_image_urls?: string[] | null;
  completion_comment?: string | null;
  completed_at?: string | null;
  likes?: number;
  created_at: string;
  created_by?: string | null;
}

// A3 Projects Types
export interface A3Subtask {
  id: string | number;
  title: string;
  completed: boolean;
  responsible?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface A3ActionPlanItem {
  id: string | number;
  planId?: string; // Group / Phase ID
  planName?: string; // Plan name (e.g. "Plan de Contención", "Plan 5W2H Principal", "Plan de Estandarización")
  // 5W2H fields:
  what: string;         // Qué se hará (alias: activity)
  why?: string;         // Por qué se hace (justificación o contramedida)
  who: string;          // Quién es el responsable (alias: responsible)
  when: string;         // Cuándo (fecha compromiso / límite, alias: date)
  where?: string;       // Dónde (área / proceso / línea)
  how?: string;         // Cómo (método o estándar)
  howMuch?: string;     // Cuánto (costo estimado / presupuesto / horas)
  
  // Status and tracking:
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  progress?: number;    // 0 - 100% (calculated or manual)
  subtasks?: A3Subtask[];
  countermeasures?: string[];
  countermeasure?: string;
  notes?: string;
  
  // Evidencia fotográfica / Prueba de trabajo realizado (Opcional)
  image_urls?: string[];
  images?: string[];

  // Backwards compatibility aliases
  activity?: string;
  responsible?: string;
  date?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface A3PlanGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

export interface A3ParetoItem {
  name: string;
  value: number;
  cumulativePercentage?: number;
}

export interface A3IshikawaCause {
  text: string;
  color?: 'neutral' | 'green' | 'yellow' | 'red';
}

export interface A3IshikawaData {
  id?: number | string;
  problem: string;
  rootCause?: string;
  categories?: Record<string, (string | A3IshikawaCause)[]>;
}

export interface A3FiveWhysItem {
  id: number | string;
  problem: string;
  whys: string[];
  status: 'neutral' | 'root' | 'discarded';
  parentId?: number | string | null;
  parentWhyIndex?: number;
}

export interface A3FollowUpDataPoint {
  id: number;
  date: string;
  value: number;
  availability?: number;
  performance?: number;
  quality?: number;
  plannedTime?: number;
  runTime?: number;
  totalPieces?: number;
  defectPieces?: number;
}

export interface A3FollowUpConfig {
  id?: string | number;
  kpiName?: string;
  kpiGoal?: string;
  goalType?: 'minimize' | 'maximize';
  improvementDirection?: 'minimize' | 'maximize';
  indicatorType?: 'simple' | 'oee';
  kpiType?: 'simple' | 'oee';
  interventionDate?: string;
  dataType?: 'numeric' | 'percentage';
  isPercentage?: boolean;
  dateFormat?: 'date' | 'month' | 'week' | 'week_offset';
  xAxisFormat?: 'date' | 'month' | 'week' | 'week_offset';
  showInDashboard?: boolean;
  dataPoints?: A3FollowUpDataPoint[];
  oeeConfig?: {
    standardSpeed?: number;
    shiftDuration?: number;
  };
}

export interface A3Project {
  id: string;
  company_id: string | null;
  companyId?: string | null;
  title: string;
  status: 'Nuevo' | 'En Proceso' | 'En Revisión' | 'Completado' | 'Standby' | string;
  responsible: string;
  date: string;
  background?: string;
  background_image_url?: string | null;
  backgroundImageUrl?: string | null;
  current_condition?: string;
  currentCondition?: string;
  current_condition_image_url?: string | null;
  currentConditionImageUrl?: string | null;
  goal?: string;
  root_cause?: string;
  rootCause?: string;
  pareto_data?: A3ParetoItem[];
  paretoData?: A3ParetoItem[];
  countermeasures?: string;
  countermeasure_list?: { id: number | string; title: string }[];
  countermeasureList?: { id: number | string; title: string }[];
  execution_plan?: string;
  plan?: string;
  action_plan?: A3ActionPlanItem[];
  actionPlan?: A3ActionPlanItem[];
  actionPlansMeta?: A3PlanGroup[];
  action_plans_meta?: A3PlanGroup[];
  follow_up_notes?: string;
  followUp?: string;
  follow_up_data?: A3FollowUpConfig[] | any;
  followUpData?: A3FollowUpConfig[] | any;
  ishikawas?: A3IshikawaData[];
  five_whys?: A3FiveWhysItem[];
  multipleFiveWhys?: A3FiveWhysItem[];
  created_at?: string;
  updated_at?: string;
}

// VSM Types
export interface VSMProcess {
  id: string;
  name: string;
  cycleTime: number; // in seconds
  changeoverTime: number;
  uptime: number; // percentage
  operators: number;
  wipInventory: number;
}

// -------------------------------------------------------------
// Gemba Walk Module Types
// -------------------------------------------------------------
export type GembaWalkStatus = 'programada' | 'en_curso' | 'completada' | 'cancelada';
export type GembaFindingType =
  | 'desperdicio_muda'
  | 'seguridad'
  | 'calidad'
  | 'estandar'
  | 'reconocimiento_positivo';
export type GembaMudaCategory =
  | 'sobreproduccion'
  | 'espera'
  | 'transporte'
  | 'sobreprocesamiento'
  | 'inventario'
  | 'movimiento'
  | 'defectos'
  | 'talento';

export interface GembaStation {
  id: string;
  name: string;
  area: string;
  standardNotes?: string;
  standardImageUrl?: string;
  orderIndex: number;
}

export interface GembaRoute {
  id: string;
  company_id: string;
  companyId?: string;
  name: string;
  area: string;
  description?: string;
  focus_theme: string;
  stations: GembaStation[];
  estimated_duration_min: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface GembaWalk {
  id: string;
  company_id: string;
  companyId?: string;
  route_id?: string | null;
  title: string;
  area: string;
  walker_id?: string | null;
  walker_name: string;
  companion_names?: string[];
  scheduled_date: string;
  status: GembaWalkStatus;
  start_time?: string | null;
  end_time?: string | null;
  focus_theme?: string;
  summary_notes?: string | null;
  coaching_notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GembaCommitmentMeta {
  isHandshake: boolean;
  daysAgreed: number;
  dueDate: string;
  leaderSupport?: string;
  completedAt?: string | null;
  afterImageUrl?: string | null;
}

export interface GembaFinding {
  id: string;
  company_id: string;
  companyId?: string;
  walk_id: string;
  station_name: string;
  operator_name?: string | null;
  finding_type: GembaFindingType;
  muda_category?: GembaMudaCategory | null;
  description: string;
  image_url?: string | null;
  audio_note_url?: string | null;
  immediate_action?: string | null;
  derived_type?: 'ninguna' | 'quick_win' | 'five_s' | 'a3' | string;
  derived_record_id?: string | null;
  status: 'abierto' | 'en_proceso' | 'cerrado';
  created_at: string;
  updated_at?: string;
}

