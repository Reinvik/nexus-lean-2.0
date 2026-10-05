// VSM (Value Stream Mapping) Types

export interface VSMStep {
  id: string;
  name: string;
  cycleTime: number; // Tiempo de ciclo en segundos (C/T)
  changeoverTime?: number; // Tiempo de cambio/setup en minutos (C/O)
  operators?: number; // Cantidad de operarios (Op)
  uptime?: number; // Disponibilidad / OEE operacional (%)
  wipUnits?: number; // Inventario en proceso / Espera (unidades)
  waitTimeHours?: number; // Tiempo de espera / cola antes de este paso (horas)
  scrapRate?: number; // % de defectos / retrabajo
  notes?: string;
  hasKaizenBurst?: boolean; // Flag de Ráfaga Kaizen 💥
  kaizenBurstTitle?: string;
  kaizenBurstDescription?: string;
}

export interface VSMProject {
  id: string;
  name: string;
  description: string | null;
  responsible: string | null;
  date: string | null;
  status: 'current' | 'future' | 'completed';
  lead_time: string | null;
  process_time: string | null;
  efficiency: string | null;
  takt_time: string | null;
  image_url: string | null;
  miro_link: string | null;
  company_id: string;
  created_at?: string;
  // Dynamic process mapping fields (persisted within payload / description)
  steps?: VSMStep[];
  availableTimeHours?: number;
  customerDemandUnits?: number;
}

export interface VSMMetrics {
  taktTimeSeconds: number;
  totalCycleTimeSeconds: number;
  totalWaitTimeHours: number;
  totalLeadTimeHours: number;
  totalLeadTimeDays: number;
  pcePercentage: number; // Process Cycle Efficiency %
  bottleneckStep: VSMStep | null;
  isBalanced: boolean;
}
