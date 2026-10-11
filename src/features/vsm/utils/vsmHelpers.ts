import type { VSMStep, VSMMetrics } from '../types';

export const DEFAULT_VSM_STEPS: VSMStep[] = [
  {
    id: 'step-1',
    name: 'Recepción y Corte',
    cycleTime: 45,
    changeoverTime: 15,
    operators: 1,
    uptime: 95,
    wipUnits: 120,
    waitTimeHours: 8,
    scrapRate: 1,
    hasKaizenBurst: false,
  },
  {
    id: 'step-2',
    name: 'Mecanizado / Ensamble',
    cycleTime: 85,
    changeoverTime: 30,
    operators: 2,
    uptime: 88,
    wipUnits: 240,
    waitTimeHours: 16,
    scrapRate: 2.5,
    hasKaizenBurst: true,
    kaizenBurstTitle: 'Cuello de Botella en Ensamble',
    kaizenBurstDescription: 'El tiempo de ciclo (85s) excede el Takt Time. Se requiere balanceo de puestos y SMED en cambio de herramienta.',
  },
  {
    id: 'step-3',
    name: 'Tratamiento Térmico / Acabado',
    cycleTime: 35,
    changeoverTime: 10,
    operators: 1,
    uptime: 98,
    wipUnits: 60,
    waitTimeHours: 4,
    scrapRate: 0.5,
    hasKaizenBurst: false,
  },
  {
    id: 'step-4',
    name: 'Inspección de Calidad (Poka-Yoke)',
    cycleTime: 40,
    changeoverTime: 5,
    operators: 1,
    uptime: 96,
    wipUnits: 40,
    waitTimeHours: 2,
    scrapRate: 0.2,
    hasKaizenBurst: false,
  },
  {
    id: 'step-5',
    name: 'Embalaje y Despacho',
    cycleTime: 30,
    changeoverTime: 5,
    operators: 1,
    uptime: 99,
    wipUnits: 15,
    waitTimeHours: 1,
    scrapRate: 0,
    hasKaizenBurst: false,
  },
];

/**
 * Limpia y normaliza cualquier URL de Miro o enlace externo para evitar errores de navegación relativa,
 * protocolos rotos (ej: bhttps://) o código HTML iframe pegado accidentalmente.
 */
export function cleanMiroUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!url) return '';

  // 1. Si el usuario pegó el código iframe completo de Miro: <iframe src="..." ...>
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1].trim();
  }

  // 2. Corregir errores comunes de tipeo al inicio del protocolo (ej: "bhttps://", "vhttps://")
  url = url.replace(/^[a-zA-Z]+(https?:\/\/)/i, '$1');

  // 3. Corregir "https//" o "http//" sin dos puntos
  url = url.replace(/^(https?)\/+/i, '$1://');

  // 4. Corregir "htps://" o "htt://", etc.
  url = url.replace(/^ht+ps?:\/\//i, (m) => (m.toLowerCase().includes('s') ? 'https://' : 'http://'));

  // 5. Si no tiene protocolo (ej: miro.com/..., bit.ly, www.miro.com), agregar https://
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('//')) {
      url = `https:${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  return url;
}

/**
 * Determina el tipo de enlace de Miro para dar el feedback adecuado en la interfaz
 */
export function getMiroLinkType(url: string | null | undefined): 'board' | 'template' | 'external' | 'empty' {
  if (!url || !url.trim()) return 'empty';
  const clean = cleanMiroUrl(url);
  if (!clean) return 'empty';

  if (
    clean.includes('miro.com/app/board/') ||
    clean.includes('miro.com/board/') ||
    clean.includes('miro.com/app/live-embed/') ||
    clean.includes('miro.com/app/embed/')
  ) {
    return 'board';
  }

  if (
    clean.includes('miro.com/es/plantillas/') ||
    clean.includes('miro.com/templates/') ||
    clean.includes('miro.com/template/')
  ) {
    return 'template';
  }

  return 'external';
}

/**
 * Normaliza y extrae la URL embebible interactiva de Miro (Live Embed) si corresponde a un tablero válido
 */
export function getMiroEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const cleanUrl = cleanMiroUrl(url);
  if (!cleanUrl) return null;

  // Si ya es un live-embed oficial de Miro
  if (cleanUrl.includes('miro.com/app/live-embed/')) {
    return cleanUrl;
  }

  // Si es un embed tradicional de Miro, migrar a live-embed moderno
  if (cleanUrl.includes('miro.com/app/embed/')) {
    return cleanUrl.replace('miro.com/app/embed/', 'miro.com/app/live-embed/');
  }

  // Si es un enlace de tablero: miro.com/app/board/<boardId>/ o miro.com/board/<boardId>/
  const boardMatch = cleanUrl.match(/miro\.com\/(?:app\/)?board\/([^/?#]+)/i);
  if (boardMatch && boardMatch[1]) {
    const boardId = boardMatch[1];
    return `https://miro.com/app/live-embed/${boardId}/?embedMode=view_only_without_ui&backLink=false`;
  }

  return null;
}

/**
 * Desempaqueta la descripción y los datos enriquecidos del VSM
 */
export function parseVSMDescription(raw: string | null | undefined): {
  textDescription: string;
  steps: VSMStep[];
  availableTimeHours: number;
  customerDemandUnits: number;
} {
  if (!raw) {
    return {
      textDescription: '',
      steps: DEFAULT_VSM_STEPS,
      availableTimeHours: 8,
      customerDemandUnits: 480,
    };
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          textDescription: parsed.textDescription || '',
          steps: Array.isArray(parsed.steps) && parsed.steps.length > 0 ? parsed.steps : DEFAULT_VSM_STEPS,
          availableTimeHours: typeof parsed.availableTimeHours === 'number' ? parsed.availableTimeHours : 8,
          customerDemandUnits: typeof parsed.customerDemandUnits === 'number' ? parsed.customerDemandUnits : 480,
        };
      }
    } catch {
      // Ignorar error de parsing y tratar como texto plano
    }
  }

  return {
    textDescription: trimmed,
    steps: DEFAULT_VSM_STEPS,
    availableTimeHours: 8,
    customerDemandUnits: 480,
  };
}

/**
 * Empaqueta la descripción y los datos enriquecidos del VSM en formato JSON
 */
export function serializeVSMDescription(
  textDescription: string,
  steps?: VSMStep[],
  availableTimeHours = 8,
  customerDemandUnits = 480
): string {
  return JSON.stringify({
    version: 2,
    textDescription: textDescription.trim(),
    steps: steps || DEFAULT_VSM_STEPS,
    availableTimeHours,
    customerDemandUnits,
  });
}

/**
 * Calcula las métricas Lean del VSM (Takt Time, Lead Time, PCE, Cuello de Botella)
 */
export function calculateVSMMetrics(
  steps: VSMStep[],
  availableTimeHours = 8,
  customerDemandUnits = 480
): VSMMetrics {
  const availableSeconds = Math.max(1, availableTimeHours * 3600);
  const demand = Math.max(1, customerDemandUnits);
  const taktTimeSeconds = Math.round(availableSeconds / demand);

  if (!steps || steps.length === 0) {
    return {
      taktTimeSeconds,
      totalCycleTimeSeconds: 0,
      totalWaitTimeHours: 0,
      totalLeadTimeHours: 0,
      totalLeadTimeDays: 0,
      pcePercentage: 0,
      bottleneckStep: null,
      isBalanced: true,
    };
  }

  // Tiempo de Valor Agregado (Suma de tiempos de ciclo de transformación)
  const totalCycleTimeSeconds = steps.reduce((sum, s) => sum + (s.cycleTime || 0), 0);

  // Tiempo de Espera / Inventario (No Valor Agregado)
  const totalWaitTimeHours = steps.reduce((sum, s) => {
    // Si tiene tiempo de espera explícito en horas, usarlo; sino inferirlo del WIP respecto al Takt Time
    const explicitWait = s.waitTimeHours || 0;
    const wipWaitHours = s.wipUnits ? (s.wipUnits * taktTimeSeconds) / 3600 : 0;
    return sum + Math.max(explicitWait, wipWaitHours);
  }, 0);

  // Lead Time Total = Tiempo de Espera + Tiempo de Proceso
  const processTimeHours = totalCycleTimeSeconds / 3600;
  const totalLeadTimeHours = Number((totalWaitTimeHours + processTimeHours).toFixed(1));
  const totalLeadTimeDays = Number((totalLeadTimeHours / 8).toFixed(1)); // Asumiendo turno de 8h/día

  // Process Cycle Efficiency (PCE %) = (VA Time / Total Lead Time) * 100
  const totalLeadTimeSeconds = Math.max(1, totalLeadTimeHours * 3600);
  const pcePercentage = Number(
    Math.min(100, (totalCycleTimeSeconds / totalLeadTimeSeconds) * 100).toFixed(1)
  );

  // Cuello de botella
  const bottleneckStep = steps.reduce(
    (max, s) => ((s.cycleTime || 0) > (max.cycleTime || 0) ? s : max),
    steps[0]
  );

  const isBalanced = bottleneckStep ? bottleneckStep.cycleTime <= taktTimeSeconds : true;

  return {
    taktTimeSeconds,
    totalCycleTimeSeconds,
    totalWaitTimeHours,
    totalLeadTimeHours,
    totalLeadTimeDays,
    pcePercentage,
    bottleneckStep,
    isBalanced,
  };
}
