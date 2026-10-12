/**
 * Gemini AI Service - Consultor Senior de Mejora Continua (Nexus Lean 2.0)
 * Analiza integralmente los 6 módulos operativos:
 * 1. Tarjetas 5S
 * 2. Auditorías 5S (con Radar 1S-5S)
 * 3. Quick Wins (Kaizen Rápido)
 * 4. Proyectos A3 (Ishikawa, 5 Porqués, Pareto, Contramedidas, Plan 5W2H y KPIs/OEE)
 * 5. Mapas VSM (Flujo de Valor, PCE, Takt Time y Cuellos de Botella)
 * 6. Gemba Walk (Hallazgos, 8 Mudas TIMWOODS, Pactos de Compromiso y Reconocimientos)
 */

import { supabase } from '../lib/supabase';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
];

const KNOWN_EXPIRED_KEYS = new Set([
  'AIzaSyBwpCd9VxCZrv8vHbJIece0_L8tFoOpYQg',
  'AIzaSyDDYV0hq2Hgj_8mq-zZYTYM36vQ5LuBW6M',
]);

let cachedOpenRouterKey: string | null =
  import.meta.env.VITE_OPENROUTER_API_KEY || null;

async function getOpenRouterKey(): Promise<string> {
  if (cachedOpenRouterKey) return cachedOpenRouterKey;
  try {
    const { data } = await supabase
      .from('lean_ai_insights')
      .select('insight_data')
      .eq('scope_key', '__system_ai_config__')
      .maybeSingle();
    const keyFromDb = (data as any)?.insight_data?.openrouter_key;
    if (keyFromDb && typeof keyFromDb === 'string') {
      cachedOpenRouterKey = keyFromDb.trim();
      return cachedOpenRouterKey;
    }
  } catch {
    // Ignorar error de lectura
  }
  return '';
}

const OPENROUTER_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
];

/**
 * Helper con timeout estricto para evitar que fetch quede colgado indefinidamente
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 18000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Limpia etiquetas HTML de textos enriquecidos (RichTextEditor)
 */
function stripHtml(html?: string | null): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza puntajes de auditoría 5S (escala 0-5 o 0-100%)
 */
function normalizeAuditScore(score: number | null | undefined): number {
  if (!score || score <= 0) return 0;
  if (score <= 5) return Math.min(100, Math.round((score / 5) * 100));
  return Math.min(100, Math.round(score));
}

/**
 * Consulta OpenRouter (compatible con Gemini 2.5 Flash) y devuelve formato Gemini estándar
 */
async function callOpenRouterAPI(requestBody: any, explicitKey?: string): Promise<any> {
  const resolvedKey = explicitKey || (await getOpenRouterKey());
  if (!resolvedKey) {
    throw new Error('No OpenRouter key available');
  }

  // Convertir formato contents de Gemini a messages de OpenAI/OpenRouter
  const contents = Array.isArray(requestBody?.contents) ? requestBody.contents : [];
  const messages = contents.map((c: any) => {
    const role = c.role === 'model' ? 'assistant' : 'user';
    const text = (c.parts || []).map((p: any) => p.text || '').join('\n');
    return { role, content: text };
  });

  if (messages.length === 0) {
    throw new Error('Empty messages for OpenRouter');
  }

  const isJson =
    requestBody?.generationConfig?.responseMimeType === 'application/json';
  const maxTokens = Math.min(
    requestBody?.generationConfig?.maxOutputTokens || 2200,
    2500
  );
  const temperature = requestBody?.generationConfig?.temperature ?? 0.3;

  let lastErr: Error | null = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const bodyPayload: any = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };
      if (isJson) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const response = await fetchWithTimeout(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resolvedKey}`,
            'HTTP-Referer':
              typeof window !== 'undefined'
                ? window.location.origin
                : 'https://nexuslean.app',
            'X-Title': 'Nexus Lean 2.0 AI Consultant',
          },
          body: JSON.stringify(bodyPayload),
        },
        20000
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        lastErr = new Error(`OpenRouter (${model}) HTTP ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const contentText = data?.choices?.[0]?.message?.content;
      if (!contentText) {
        lastErr = new Error(`Respuesta vacía de OpenRouter (${model})`);
        continue;
      }

      return {
        candidates: [
          {
            content: {
              parts: [{ text: contentText }],
            },
          },
        ],
      };
    } catch (err: any) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Error al consultar OpenRouter');
}

/**
 * Consulta la API de Gemini ejecutando fallback automático a OpenRouter (Gemini 2.5 Flash)
 */
async function callGeminiAPI(apiKey: string, requestBody: any): Promise<any> {
  const cleanKey = (apiKey || '').trim();

  // Si la clave empieza con sk-or-v1, es directamente una clave de OpenRouter
  if (cleanKey.startsWith('sk-or-')) {
    return callOpenRouterAPI(requestBody, cleanKey);
  }

  // Si es una clave de Google válida (no está en la lista de claves revocadas)
  if (cleanKey && !KNOWN_EXPIRED_KEYS.has(cleanKey)) {
    const customModel =
      (typeof window !== 'undefined' ? localStorage.getItem('gemini_model') : null) ||
      import.meta.env.VITE_GEMINI_MODEL;

    const modelsToTry: string[] = Array.from(
      new Set([customModel, ...DEFAULT_GEMINI_MODELS].filter(Boolean) as string[])
    );

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          },
          15000
        );

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg: string =
            errJson.error?.message || `Error HTTP ${response.status} en modelo ${model}`;

          // Si la API Key en sí es inválida o expiró, no reintentar más modelos en Google
          if (
            errMsg.toLowerCase().includes('api key not valid') ||
            errMsg.toLowerCase().includes('api_key_invalid') ||
            response.status === 403
          ) {
            console.warn('[Gemini API] API Key inválida o expirada, cambiando a motor respaldo.');
            if (
              typeof window !== 'undefined' &&
              localStorage.getItem('gemini_api_key') === cleanKey
            ) {
              localStorage.removeItem('gemini_api_key');
            }
            break;
          }

          const match = errMsg.match(/models\/([a-zA-Z0-9._-]+)/i);
          if (match && match[1] && !modelsToTry.includes(match[1])) {
            modelsToTry.splice(i + 1, 0, match[1]);
          }
          continue;
        }

        const data = await response.json();
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data;
        }
      } catch (networkErr: any) {
        console.warn(`[Gemini API] Timeout o red en ${model}:`, networkErr?.message);
      }
    }
  }

  // Fallback transparente a OpenRouter (Gemini 2.5 Flash)
  return callOpenRouterAPI(requestBody);
}

export function getEffectiveApiKey(passedKey?: string): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('gemini_api_key');
    if (local && local.trim() && !KNOWN_EXPIRED_KEYS.has(local.trim())) {
      return local.trim();
    }
  }
  if (passedKey && passedKey.trim() && !KNOWN_EXPIRED_KEYS.has(passedKey.trim())) {
    return passedKey.trim();
  }
  if (cachedOpenRouterKey) {
    return cachedOpenRouterKey;
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

const OLLAMA_FALLBACK_URL =
  'https://desktop-sj195st.tail5a26f1.ts.net:8443/api/generate';
const OLLAMA_MODEL = 'qwen2.5-coder:14b';

async function queryOllamaFallback(prompt: string, jsonFormat = false): Promise<string> {
  try {
    const response = await fetchWithTimeout(
      OLLAMA_FALLBACK_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          format: jsonFormat ? 'json' : undefined,
          options: {
            temperature: jsonFormat ? 0.2 : 0.7,
          },
        }),
      },
      3500
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response;
    if (!text) {
      throw new Error('Respuesta vacía de Ollama');
    }
    return text.trim();
  } catch (error) {
    throw new Error('Fallback local no disponible');
  }
}

function extractAndParseJSON(text: string): any {
  let cleanText = text.trim();

  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleanText.match(markdownRegex);
  if (match) {
    cleanText = match[1].trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch (firstError) {
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');

    // Si es un array JSON (ej. generateLeanSubtasks)
    if (
      firstBracket !== -1 &&
      lastBracket > firstBracket &&
      (firstBrace === -1 || firstBracket < firstBrace)
    ) {
      const possibleArr = cleanText.substring(firstBracket, lastBracket + 1);
      try {
        return JSON.parse(possibleArr);
      } catch {
        // continue
      }
    }

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const possibleJson = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(possibleJson);
      } catch {
        const cleaned = possibleJson
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
        return JSON.parse(cleaned);
      }
    }
    throw firstError;
  }
}

// Helper to format Ishikawa data
const formatIshikawa = (ishikawas: any[]): string => {
  if (!ishikawas || !Array.isArray(ishikawas) || ishikawas.length === 0) {
    return 'No hay diagramas de Ishikawa registrados.';
  }

  return ishikawas
    .map((ish, idx) => {
      const problem = ish.problem || 'Problema no definido';
      const categories = Object.entries(ish.categories || {})
        .map(([cat, causes]: [string, any]) => {
          if (!causes || !Array.isArray(causes) || causes.length === 0) return null;
          const causeList = causes
            .map((c: any) => {
              const text = typeof c === 'string' ? c : c.text || '';
              if (!text.trim()) return null;
              const priority =
                c.color === 'green' || c.status === 'confirmed'
                  ? '[VALIDADA - SÍ OCURRE]'
                  : c.color === 'red' || c.status === 'discarded'
                  ? '[DESCARTADA]'
                  : '';
              return `      - ${text} ${priority}`;
            })
            .filter(Boolean)
            .join('\n');
          return causeList ? `    * ${cat}:\n${causeList}` : null;
        })
        .filter(Boolean)
        .join('\n');

      return `  Diagrama #${idx + 1}: Problema: "${problem}"\n    Causa Raíz Seleccionada: ${
        ish.rootCause || 'En validación'
      }\n${categories || '    (Sin espinas detalladas)'}`;
    })
    .join('\n\n');
};

// Helper to format 5 Whys
const formatFiveWhys = (fiveWhys: any[]): string => {
  if (!fiveWhys || !Array.isArray(fiveWhys) || fiveWhys.length === 0) {
    return 'No hay análisis de 5 Porqués registrados.';
  }

  return fiveWhys
    .map((item, idx) => {
      const whysArr = Array.isArray(item.whys)
        ? item.whys.filter((w: any) => typeof w === 'string' && w.trim().length > 0)
        : [item.why1, item.why2, item.why3, item.why4, item.why5].filter(
            (w: any) => typeof w === 'string' && w.trim().length > 0
          );
      const whys = whysArr.join(' -> ');
      const status =
        item.status === 'root' || item.isRootCause
          ? '[CAUSA RAÍZ VALIDADA]'
          : item.status === 'discarded'
          ? '[DESCARTADO]'
          : '';
      return `  Análisis #${idx + 1} (${item.problem || item.hypothesis || 'Hipótesis'}):\n    Cadena Causal: ${
        whys || 'Sin desglose'
      } ${item.rootCause ? `=> Raíz: ${item.rootCause}` : ''} ${status}`;
    })
    .join('\n');
};

// Helper to format Action Plan 5W2H
const formatActionPlan = (actions: any[]): string => {
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return 'No hay acciones 5W2H definidas.';
  }

  return actions
    .map((act) => {
      const what = act.what || act.action || act.activity || 'Acción sin título';
      const who = act.who || act.responsible || 'Sin asignar';
      const when = act.when || act.deadline || act.date || 'Sin fecha';
      const why = act.why ? ` (Por qué: ${act.why})` : '';
      const isDone =
        act.status === 'completed' ||
        act.status === 'done' ||
        act.status === 'Completada' ||
        act.status === 'completado' ||
        act.progress === 100;

      let pct = 0;
      if (isDone) {
        pct = 100;
      } else if (typeof act.progress === 'number' && !isNaN(act.progress)) {
        pct = Math.max(0, Math.min(100, act.progress));
      } else if (Array.isArray(act.subtasks) && act.subtasks.length > 0) {
        const doneSub = act.subtasks.filter((s: any) => s.completed).length;
        pct = Math.round((doneSub / act.subtasks.length) * 100);
      }

      const statusLabel = isDone ? 'COMPLETADA (100%)' : `EN PROCESO (${pct}%)`;
      return `    * ${what}${why} | Resp: ${who} | Plazo: ${when} | [${statusLabel}]`;
    })
    .join('\n');
};

// Helper to format Follow Up Charts
const formatCharts = (charts: any[]): string => {
  if (!charts || !Array.isArray(charts) || charts.length === 0) {
    return 'No hay gráficos de seguimiento KPI.';
  }

  return charts
    .map((chart, idx) => {
      const kpiType =
        chart.kpiType === 'oee' ? 'OEE (Eficiencia Global de Equipos)' : 'Indicador KPI';
      const goalVal = chart.kpiGoal ?? chart.goal;
      const goal = goalVal
        ? `${goalVal}${chart.isPercentage || chart.kpiType === 'oee' ? '%' : ''}`
        : 'N/A';

      let dataSummary = '';
      const points = Array.isArray(chart.dataPoints) ? chart.dataPoints : [];
      if (chart.kpiType === 'oee') {
        const last = points.length > 0 ? points[points.length - 1] : null;
        if (last) {
          const oeeVal = last.oee ?? last.value ?? 'ND';
          dataSummary = `Último registro (${last.date}): OEE ${oeeVal}%`;
        } else {
          dataSummary = 'Sin mediciones registradas.';
        }
      } else if (points.length > 0) {
        dataSummary = points
          .slice(-4)
          .map((dp: any) => `${dp.date}: ${dp.value}${chart.isPercentage ? '%' : ''}`)
          .join(' -> ');
      } else {
        dataSummary = 'Sin mediciones registradas.';
      }

      return `  Gráfico #${idx + 1}: ${chart.kpiName || 'KPI'} (${kpiType}) | Meta: ${goal} | Evolución: ${dataSummary}`;
    })
    .join('\n');
};

/**
 * Prepara y enriquece profundamente los datos de todos los módulos de Nexus Lean 2.0
 */
export const prepareCompanyData = (data: any, companyName = 'Cliente') => {
  const {
    fiveS = [],
    quickWins = [],
    vsms = [],
    a3 = [],
    auditLogs = [],
    gembaWalks = [],
    gembaFindings = [],
    profiles = [],
  } = data || {};

  // Mapa de perfiles para traducir UUIDs a nombres reales
  const profileMap = new Map<string, string>();
  if (Array.isArray(profiles)) {
    profiles.forEach((p: any) => {
      if (p?.id) {
        const name = p.full_name?.trim() || p.name?.trim() || p.email?.trim();
        if (name) profileMap.set(p.id, name);
      }
    });
  }

  const resolvePerson = (val: any): string => {
    if (!val) return 'Sin asignar';
    const str = String(val).trim();
    if (profileMap.has(str)) return profileMap.get(str)!;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return 'Responsable asignado';
    }
    return str;
  };

  const now = Date.now();

  // =========================================================================
  // 1. TARJETAS 5S
  // =========================================================================
  const fiveSClosed = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'cerrado'
  ).length;
  const fiveSPending = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'pendiente' || i.status?.toLowerCase() === 'abierto'
  ).length;
  const fiveSInProcess = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'en proceso'
  ).length;
  const fiveSRate =
    fiveS.length > 0 ? Math.round((fiveSClosed / fiveS.length) * 100) : 0;

  // Cálculo real de días promedio de cierre 5S
  let totalClosureDays = 0;
  let validClosedCount = 0;
  fiveS.forEach((c: any) => {
    if (c.status?.toLowerCase() === 'cerrado') {
      const startStr = c.date || c.card_date || c.created_at || c.createdAt;
      const endStr = c.close_date || c.solutionDate || c.updated_at || c.updatedAt;
      if (startStr && endStr) {
        const start = new Date(startStr).getTime();
        const end = new Date(endStr).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          totalClosureDays += days;
          validClosedCount++;
        }
      }
    }
  });
  const avgClosureReal =
    validClosedCount > 0 ? (totalClosureDays / validClosedCount).toFixed(1) : '0.0';

  // Tarjetas 5S vencidas y ranking de áreas críticas
  let overdue5SCount = 0;
  const areaStatsMap: Record<string, { total: number; open: number; closed: number }> = {};
  const categoryStatsMap: Record<string, number> = {};

  fiveS.forEach((c: any) => {
    const isClosed = c.status?.toLowerCase() === 'cerrado';
    const areaName = (c.area || 'General').trim();
    if (!areaStatsMap[areaName]) {
      areaStatsMap[areaName] = { total: 0, open: 0, closed: 0 };
    }
    areaStatsMap[areaName].total++;
    if (isClosed) {
      areaStatsMap[areaName].closed++;
    } else {
      areaStatsMap[areaName].open++;
      if (c.due_date && new Date(c.due_date).getTime() < now) {
        overdue5SCount++;
      }
    }

    const cat = c.category || 'Sin categoría';
    categoryStatsMap[cat] = (categoryStatsMap[cat] || 0) + 1;
  });

  const topCriticalAreas = Object.entries(areaStatsMap)
    .sort((a, b) => b[1].open - a[1].open || b[1].total - a[1].total)
    .slice(0, 6)
    .map(([area, st]) => ({
      area,
      open: st.open,
      closed: st.closed,
      total: st.total,
    }));

  // =========================================================================
  // 2. AUDITORÍAS 5S Y RADAR DE MADUREZ
  // =========================================================================
  const normalizedAudits = auditLogs.map((a: any) => {
    const normScore = normalizeAuditScore(a.total_score);
    return {
      id: a.id,
      area: a.area || a.title || 'Planta General',
      auditor: resolvePerson(a.auditor),
      date: a.audit_date || a.date || (a.created_at ? a.created_at.split('T')[0] : 'Reciente'),
      score: normScore,
      rawScore: a.total_score,
      entries: Array.isArray(a.entries) ? a.entries : [],
    };
  });

  const avgAuditScore =
    normalizedAudits.length > 0
      ? Math.round(
          normalizedAudits.reduce((sum: number, a: any) => sum + a.score, 0) /
            normalizedAudits.length
        )
      : 0;

  // Calcular promedios por pilar 1S..5S si existen entries
  const sTotals = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  const sCounts = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  normalizedAudits.forEach((a: any) => {
    const hasOver4 = a.entries.some((e: any) => (e.score || 0) > 4);
    const maxPts = hasOver4 ? 5 : 4;
    a.entries.forEach((e: any) => {
      const sec = (e.section || '').toLowerCase() as keyof typeof sTotals;
      if (sTotals[sec] !== undefined) {
        sTotals[sec] += Math.min(100, ((e.score || 0) / maxPts) * 100);
        sCounts[sec]++;
      }
    });
  });

  const radar5S = {
    s1: sCounts.s1 > 0 ? Math.round(sTotals.s1 / sCounts.s1) : avgAuditScore,
    s2: sCounts.s2 > 0 ? Math.round(sTotals.s2 / sCounts.s2) : avgAuditScore,
    s3: sCounts.s3 > 0 ? Math.round(sTotals.s3 / sCounts.s3) : avgAuditScore,
    s4: sCounts.s4 > 0 ? Math.round(sTotals.s4 / sCounts.s4) : avgAuditScore,
    s5: sCounts.s5 > 0 ? Math.round(sTotals.s5 / sCounts.s5) : avgAuditScore,
  };

  // =========================================================================
  // 3. QUICK WINS
  // =========================================================================
  const qwDone = quickWins.filter(
    (i: any) => i.status === 'done' || i.status === 'completed' || i.status === 'Implementado'
  ).length;
  const qwPending = quickWins.length - qwDone;
  const qwHighImpact = quickWins.filter((i: any) => i.impact === 'Alto').length;
  const qwHighImpactPending = quickWins.filter(
    (i: any) =>
      i.impact === 'Alto' &&
      i.status !== 'done' &&
      i.status !== 'completed' &&
      i.status !== 'Implementado'
  ).length;
  const qwRate =
    quickWins.length > 0 ? Math.round((qwDone / quickWins.length) * 100) : 0;

  // =========================================================================
  // 4. PROYECTOS A3 (CON AVANCE REAL DE TAREAS Y SNAKE_CASE / CAMELCASE)
  // =========================================================================
  let globalA3TasksTotal = 0;
  let globalA3TasksDone = 0;
  let globalA3ProgressSum = 0;

  const a3Details = a3.slice(0, 40).map((p: any) => {
    let rawActions = p.action_plan || p.actionPlan || [];
    if (typeof rawActions === 'string') {
      try {
        rawActions = JSON.parse(rawActions);
      } catch {
        rawActions = [];
      }
    }
    const actions = Array.isArray(rawActions) ? rawActions : [];

    let projProgressSum = 0;
    let projDoneCount = 0;
    actions.forEach((task: any) => {
      globalA3TasksTotal++;
      let tProg = 0;
      const isDone =
        task.status === 'completed' ||
        task.status === 'done' ||
        task.status === 'Completada' ||
        task.status === 'completado';
      if (isDone) {
        tProg = 100;
        projDoneCount++;
        globalA3TasksDone++;
      } else if (typeof task.progress === 'number' && !isNaN(task.progress)) {
        tProg = Math.max(0, Math.min(100, task.progress));
        if (tProg === 100) {
          projDoneCount++;
          globalA3TasksDone++;
        }
      } else if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        const doneSub = task.subtasks.filter((s: any) => s.completed).length;
        tProg = Math.round((doneSub / task.subtasks.length) * 100);
        if (tProg === 100) {
          projDoneCount++;
          globalA3TasksDone++;
        }
      }
      projProgressSum += tProg;
      globalA3ProgressSum += tProg;
    });

    const projectAvgProgress =
      actions.length > 0 ? Math.round(projProgressSum / actions.length) : 0;

    // Parse countermeasures (puede ser JSON {"list":[...],"freeText":"..."})
    let countermeasuresText = stripHtml(p.countermeasures);
    if (
      typeof p.countermeasures === 'string' &&
      p.countermeasures.trim().startsWith('{')
    ) {
      try {
        const parsedCm = JSON.parse(p.countermeasures);
        const listStr = Array.isArray(parsedCm.list)
          ? parsedCm.list
              .map((cm: any) => `${cm.title || cm.description || ''} (${cm.effectiveness || ''})`)
              .filter(Boolean)
              .join('; ')
          : '';
        countermeasuresText = [listStr, stripHtml(parsedCm.freeText)]
          .filter(Boolean)
          .join(' | ');
      } catch {
        // keep as is
      }
    }

    const rawFollowUp = p.follow_up_data || p.followUpData || [];
    const followUpArr = Array.isArray(rawFollowUp)
      ? rawFollowUp
      : rawFollowUp && Object.keys(rawFollowUp).length > 0
      ? [rawFollowUp]
      : [];

    return {
      title: p.title || 'Proyecto A3',
      status: p.status || 'En Proceso',
      responsible: resolvePerson(p.responsible),
      progressPct: projectAvgProgress,
      tasksCompleted: projDoneCount,
      tasksTotal: actions.length,
      background: stripHtml(p.background),
      currentCondition: stripHtml(p.current_condition || p.currentCondition),
      goal: stripHtml(p.goal),
      rootCause: stripHtml(p.root_cause || p.rootCause),
      countermeasures: countermeasuresText,
      actionPlan: actions.map((a: any) => ({
        ...a,
        who: resolvePerson(a.who || a.responsible),
      })),
      ishikawas: Array.isArray(p.ishikawas) ? p.ishikawas : [],
      fiveWhys: Array.isArray(p.five_whys || p.multipleFiveWhys || p.fiveWhys)
        ? p.five_whys || p.multipleFiveWhys || p.fiveWhys
        : [],
      paretoData: Array.isArray(p.pareto_data || p.paretoData)
        ? p.pareto_data || p.paretoData
        : [],
      followUpData: followUpArr,
    };
  });

  const a3GlobalAvgProgress =
    globalA3TasksTotal > 0 ? Math.round(globalA3ProgressSum / globalA3TasksTotal) : 0;

  // =========================================================================
  // 5. MAPAS VSM (EXTRACCIÓN DE CUELLOS DE BOTELLA Y FLUJO)
  // =========================================================================
  const vsmDetails = vsms.slice(0, 15).map((v: any) => {
    let cleanNotes = v.description || '';
    let bottleneckStation = 'No detectado';
    let stepsCount = 0;

    if (typeof v.description === 'string' && v.description.includes('---VSM_DATA---')) {
      const [notesPart, jsonPart] = v.description.split('---VSM_DATA---');
      cleanNotes = notesPart.trim();
      try {
        const parsed = JSON.parse(jsonPart.trim());
        const steps = Array.isArray(parsed) ? parsed : parsed?.steps || [];
        stepsCount = steps.length;
        if (steps.length > 0) {
          const maxStep = [...steps].sort(
            (a: any, b: any) => (Number(b.cycleTime) || 0) - (Number(a.cycleTime) || 0)
          )[0];
          if (maxStep && Number(maxStep.cycleTime) > 0) {
            bottleneckStation = `${maxStep.name} (T. Ciclo: ${maxStep.cycleTime}s, WIP: ${
              maxStep.inventoryDays || 0
            }d)`;
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      name: v.name || 'Mapa VSM',
      status: v.status || 'current',
      responsible: resolvePerson(v.responsible),
      description: cleanNotes,
      leadTime: v.lead_time || v.leadTime || 'ND',
      processTime: v.process_time || v.processTime || 'ND',
      efficiency: v.efficiency || 'ND',
      taktTime: v.takt_time || v.taktTime || 'ND',
      stepsCount,
      bottleneckStation,
    };
  });

  // =========================================================================
  // 6. CAMINATAS GEMBA WALK Y PACTOS DE COMPROMISO (MANO ESTRECHADA)
  // =========================================================================
  const completedWalks = gembaWalks.filter((w: any) => w.status === 'completed').length;
  const mudaStats: Record<string, number> = {};
  const commitments: Array<{
    station: string;
    operator: string;
    proposal: string;
    deadline: string;
    fulfilled: boolean;
    overdue: boolean;
  }> = [];
  let kudosCount = 0;

  gembaFindings.forEach((f: any) => {
    if (f.finding_type === 'kudos') {
      kudosCount++;
    } else if (f.muda_category) {
      mudaStats[f.muda_category] = (mudaStats[f.muda_category] || 0) + 1;
    }

    if (
      typeof f.audio_note_url === 'string' &&
      f.audio_note_url.startsWith('COMMITMENT::')
    ) {
      try {
        const meta = JSON.parse(f.audio_note_url.replace('COMMITMENT::', ''));
        if (meta?.hasCommitment) {
          const isFulfilled = Boolean(meta.fulfilled || f.status === 'closed');
          const isOverdue =
            !isFulfilled &&
            Boolean(meta.commitmentDate) &&
            new Date(meta.commitmentDate + 'T23:59:59').getTime() < now;
          commitments.push({
            station: f.station_name || 'Estación',
            operator: f.operator_name || 'Operador',
            proposal: meta.operatorProposal || f.immediate_action || f.description || '',
            deadline: meta.commitmentLabel || meta.commitmentDate || 'Acordado',
            fulfilled: isFulfilled,
            overdue: isOverdue,
          });
        }
      } catch {
        // ignore
      }
    }
  });

  return {
    companyName,
    fiveS: {
      total: fiveS.length,
      closed: fiveSClosed,
      pending: fiveSPending,
      inProcess: fiveSInProcess,
      overdue: overdue5SCount,
      rate: fiveSRate,
      avgClosure: avgClosureReal,
      topCriticalAreas,
      categories: categoryStatsMap,
      details: fiveS.slice(0, 30).map((d: any) => ({
        status: d.status || 'Pendiente',
        priority: d.priority || 'Media',
        category: d.category || 'General',
        reason: d.description || d.findings || 'Sin detalle',
        location: d.area || 'Sin área',
        responsible: resolvePerson(d.assigned_to || d.responsible),
      })),
    },
    quickWins: {
      total: quickWins.length,
      done: qwDone,
      pending: qwPending,
      rate: qwRate,
      highImpact: qwHighImpact,
      highImpactPending: qwHighImpactPending,
      details: quickWins.slice(0, 25).map((w: any) => ({
        title: w.title,
        status: w.status === 'done' || w.status === 'completed' ? 'Implementado' : 'Pendiente',
        impact: w.impact || 'Medio',
        effort: w.effort_score || 5,
        responsible: resolvePerson(w.responsible),
        description: w.description || '',
        solution: w.proposed_solution || w.completion_comment || '',
      })),
    },
    a3: {
      total: a3.length,
      avgProgress: a3GlobalAvgProgress,
      totalTasks: globalA3TasksTotal,
      completedTasks: globalA3TasksDone,
      details: a3Details,
    },
    vsm: {
      count: vsms.length,
      details: vsmDetails,
    },
    auditLogs: normalizedAudits.slice(0, 8),
    auditStats: {
      totalAudits: normalizedAudits.length,
      avgScore: avgAuditScore,
      radar5S,
    },
    gemba: {
      totalWalks: gembaWalks.length,
      completedWalks,
      totalFindings: gembaFindings.length,
      kudosCount,
      mudaStats,
      commitments,
      recentFindings: gembaFindings.slice(0, 15).map((f: any) => ({
        station: f.station_name,
        operator: f.operator_name || 'Equipo de turno',
        type: f.finding_type,
        muda: f.muda_category || 'N/A',
        description: f.description,
        action: f.immediate_action || '',
        status: f.status,
      })),
    },
  };
};

/**
 * Prompt base del consultor de mejora continua con visión 360° de los 6 módulos
 */
const getConsultantPrompt = (companyData: any, companyName: string): string => {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const topAreasText =
    companyData.fiveS?.topCriticalAreas?.length > 0
      ? companyData.fiveS.topCriticalAreas
          .map(
            (a: any) =>
              `${a.area} (${a.open} abiertas / ${a.closed} cerradas de ${a.total})`
          )
          .join(', ')
      : 'Sin áreas críticas registradas';

  const r5 = companyData.auditStats?.radar5S || { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

  return `
Eres el Master Black Belt y Consultor Senior en Lean Manufacturing, Toyota Production System (TPS) y Kaizen de "Nexus Lean 2.0".
Tu misión es entregar diagnósticos ejecutivos ultra precisos, cruzando la información real de los 6 módulos de la planta para detectar cuellos de botella, causas raíz sistémicas, desviaciones de estándar y oportunidades de alto retorno.

FECHA DEL ANÁLISIS: ${today}
EMPRESA / PLANTA: ${companyName || 'Planta Principal'}

=== 1. MÓDULO TARJETAS 5S (HALLAZGOS EN PISO) ===
- Total Histórico: ${companyData.fiveS.total} tarjetas
- Abiertas (Pendientes + En Proceso): ${companyData.fiveS.pending + companyData.fiveS.inProcess} (${companyData.fiveS.overdue || 0} vencidas de plazo)
- Cerradas (Resueltas): ${companyData.fiveS.closed} (Tasa de Cierre: ${companyData.fiveS.rate}%)
- Tiempo Promedio Real de Cierre: ${companyData.fiveS.avgClosure} días
- Ranking de Áreas con más Hallazgos Abiertos: ${topAreasText}
- Detalle de Tarjetas Recientes:
${
  companyData.fiveS.details.length > 0
    ? companyData.fiveS.details
        .map(
          (d: any) =>
            `  • [${d.status.toUpperCase()} | Prioridad ${d.priority} | ${d.category}] Área: ${d.location} -> "${d.reason}" (Resp: ${d.responsible})`
        )
        .join('\n')
    : '  • Sin tarjetas 5S registradas.'
}

=== 2. MÓDULO AUDITORÍAS 5S Y RADAR DE MADUREZ ===
- Total Auditorías Ejecutadas: ${companyData.auditStats?.totalAudits || 0}
- Puntaje Promedio Global: ${companyData.auditStats?.avgScore || 0}%
- Desglose por Pilar 5S: 1S Seiri: ${r5.s1}% | 2S Seiton: ${r5.s2}% | 3S Seiso: ${r5.s3}% | 4S Seiketsu: ${r5.s4}% | 5S Shitsuke: ${r5.s5}%
${
  companyData.auditLogs && companyData.auditLogs.length > 0
    ? companyData.auditLogs
        .map(
          (a: any) =>
            `  • Auditoría en "${a.area}": ${a.score}% (${a.date}) por ${a.auditor}`
        )
        .join('\n')
    : '  • Sin auditorías 5S registradas.'
}

=== 3. MÓDULO QUICK WINS (KAIZEN RÁPIDO) ===
- Total Ideas: ${companyData.quickWins.total} | Implementadas: ${companyData.quickWins.done} (${companyData.quickWins.rate}%) | Pendientes: ${companyData.quickWins.pending}
- Ideas de Alto Impacto: ${companyData.quickWins.highImpact} (${companyData.quickWins.highImpactPending} pendientes de ejecutar)
${
  companyData.quickWins.details.length > 0
    ? companyData.quickWins.details
        .map(
          (d: any) =>
            `  • [${d.status.toUpperCase()}] "${d.title}" (Impacto: ${d.impact}, Esfuerzo: ${d.effort}/10, Resp: ${d.responsible})\n    Problema: "${d.description || 'Sin descripción'}"${d.solution ? ` | Solución: "${d.solution}"` : ''}`
        )
        .join('\n')
    : '  • Sin Quick Wins registrados.'
}

=== 4. MÓDULO PROYECTOS A3 (RESOLUCIÓN ESTRUCTURADA TOYOTA) ===
- Total Proyectos A3: ${companyData.a3.total}
- Avance Promedio Global de Tareas A3: ${companyData.a3.avgProgress}% (${companyData.a3.completedTasks} de ${companyData.a3.totalTasks} tareas 5W2H completadas)
${
  companyData.a3.details.length > 0
    ? companyData.a3.details
        .map(
          (d: any) => `
> PROYECTO A3: "${d.title}" | Estado: ${d.status} | Avance Plan 5W2H: ${d.progressPct}% (${d.tasksCompleted}/${d.tasksTotal} tareas) | Líder: ${d.responsible}
  1. CONTEXTO Y META:
     - Antecedentes: ${d.background || 'No definido'}
     - Condición Actual: ${d.currentCondition || 'No definida'}
     - Meta SMART: ${d.goal || 'No definida'}
  2. CAUSA RAÍZ:
     - Conclusión Causa Raíz: ${d.rootCause || 'No identificada'}
     - Diagramas de Ishikawa:
${formatIshikawa(d.ishikawas)}
     - 5 Porqués:
${formatFiveWhys(d.fiveWhys)}
  3. CONTRAMEDIDAS, PLAN 5W2H Y KPIS:
     - Contramedidas: ${d.countermeasures || 'No definidas'}
     - Plan de Acción 5W2H:
${formatActionPlan(d.actionPlan)}
     - Monitoreo de KPIs / OEE:
${formatCharts(d.followUpData)}`
        )
        .join('\n------------------------------------------------------------\n')
    : '  • No hay proyectos A3 registrados.'
}

=== 5. MÓDULO MAPAS VSM (VALUE STREAM MAPPING) ===
- Total Mapas VSM: ${companyData.vsm.count}
${
  companyData.vsm.details && companyData.vsm.details.length > 0
    ? companyData.vsm.details
        .map(
          (v: any) =>
            `  • VSM: "${v.name}" (${v.status === 'current' ? 'Estado Actual' : v.status === 'future' ? 'Estado Futuro' : 'Completado'}) | Resp: ${v.responsible}
    - Lead Time: ${v.leadTime} | Tiempo Valor Agregado: ${v.processTime} | Eficiencia PCE: ${v.efficiency} | Takt Time: ${v.taktTime}
    - Estación Cuello de Botella: ${v.bottleneckStation} (${v.stepsCount} etapas mapeadas)`
        )
        .join('\n')
    : '  • No hay mapas VSM registrados.'
}

=== 6. MÓDULO GEMBA WALK (TERRENO, 8 MUDAS Y PACTOS DE COMPROMISO) ===
- Caminatas Gemba: ${companyData.gemba?.totalWalks || 0} (${companyData.gemba?.completedWalks || 0} finalizadas)
- Hallazgos en Terreno: ${companyData.gemba?.totalFindings || 0} | Reconocimientos Kaizen (Kudos): ${companyData.gemba?.kudosCount || 0}
- Pactos de Compromiso (Mano Estrechada con Operadores): ${companyData.gemba?.commitments?.length || 0} registrados
${
  companyData.gemba?.commitments?.length > 0
    ? companyData.gemba.commitments
        .map(
          (c: any) =>
            `  • [PACTO ${c.fulfilled ? 'CUMPLIDO' : c.overdue ? 'VENCIDO' : 'EN CURSO'}] Estación "${c.station}" - Operador ${c.operator}: "${c.proposal}" (Plazo: ${c.deadline})`
        )
        .join('\n')
    : ''
}

INSTRUCCIONES DE INTELIGENCIA PARA TU ANÁLISIS:
1. Cruza información real entre módulos: menciona nombres exactos de áreas críticas, proyectos A3 específicos, porcentajes reales de avance, cuellos de botella de VSM, puntajes de auditoría 5S y compromisos de Gemba Walk.
2. Nunca inventes datos que no estén arriba; usa las cifras exactas provistas.
3. Identifica incoherencias metodológicas (por ejemplo, proyectos A3 sin causa raíz o sin tareas 5W2H, tarjetas 5S acumuladas en una misma área sin un A3 asociado, o Quick Wins de alto impacto aún sin implementar).
4. Propón próximos pasos concretos, accionables en el Gemba y priorizados por impacto operativo.
`;
};

/**
 * Motor determinístico inteligente de respaldo (si no hay red o créditos de IA)
 * Garantiza que el Consultor IA NUNCA falle al cargar y siempre entregue valor real
 */
function buildSmartFallbackInsight(companyData: any, companyName: string): any {
  const f5 = companyData.fiveS || {};
  const qw = companyData.quickWins || {};
  const a3 = companyData.a3 || {};
  const vsm = companyData.vsm || {};
  const aud = companyData.auditStats || {};
  const gemba = companyData.gemba || {};

  const open5S = (f5.pending || 0) + (f5.inProcess || 0);
  const topArea = f5.topCriticalAreas?.[0];
  const topA3 = a3.details?.[0];
  const overallState =
    f5.rate >= 75 && (a3.avgProgress >= 60 || a3.total === 0)
      ? 'bueno'
      : f5.rate >= 45 || qw.rate >= 50
      ? 'regular'
      : 'critico';

  const observaciones: string[] = [
    `Gestión 5S: ${f5.closed || 0} de ${f5.total || 0} tarjetas cerradas (${f5.rate || 0}% de cumplimiento) con un tiempo medio de resolución de ${f5.avgClosure || '0.0'} días.`,
    `Proyectos A3: ${a3.total || 0} proyectos registrados con un avance promedio real del ${a3.avgProgress || 0}% en sus planes de acción 5W2H (${a3.completedTasks || 0}/${a3.totalTasks || 0} tareas completadas).`,
    `Quick Wins Kaizen: ${qw.done || 0} de ${qw.total || 0} mejoras rápidas implementadas (${qw.rate || 0}%), destacando ${qw.highImpact || 0} iniciativas de alto impacto.`,
  ];

  if (aud.totalAudits > 0) {
    observaciones.push(
      `Auditorías 5S: Promedio de madurez en planta del ${aud.avgScore}% en ${aud.totalAudits} evaluaciones ejecutadas.`
    );
  }
  if (gemba.totalWalks > 0 || gemba.commitments?.length > 0) {
    observaciones.push(
      `Gemba Walk en Terreno: ${gemba.totalWalks} caminatas, ${gemba.kudosCount || 0} reconocimientos Kaizen y ${gemba.commitments?.length || 0} pactos de compromiso con operadores.`
    );
  }

  const alertas: Array<{ tipo: string; mensaje: string; proyecto?: string }> = [];

  if (topArea && topArea.open > 0) {
    alertas.push({
      tipo: topArea.open >= 4 ? 'critica' : 'advertencia',
      mensaje: `El área "${topArea.area}" concentra ${topArea.open} tarjetas 5S abiertas de un total de ${topArea.total}. Requiere barrido focalizado de cierre en terreno.`,
      proyecto: `5S - ${topArea.area}`,
    });
  }

  if (qw.highImpactPending > 0) {
    alertas.push({
      tipo: 'advertencia',
      mensaje: `Existen ${qw.highImpactPending} Quick Wins clasificados como Alto Impacto que aún están pendientes de implementación.`,
      proyecto: 'Módulo Quick Wins',
    });
  }

  a3.details?.forEach((proj: any) => {
    if (proj.tasksTotal === 0) {
      alertas.push({
        tipo: 'critica',
        mensaje: `El proyecto A3 "${proj.title}" aún no tiene tareas definidas en su Plan de Acción 5W2H.`,
        proyecto: proj.title,
      });
    } else if (proj.progressPct < 50) {
      alertas.push({
        tipo: 'advertencia',
        mensaje: `El proyecto A3 "${proj.title}" presenta un avance de ejecución del ${proj.progressPct}% (${proj.tasksCompleted}/${proj.tasksTotal} tareas).`,
        proyecto: proj.title,
      });
    }
  });

  if (alertas.length === 0) {
    alertas.push({
      tipo: 'info',
      mensaje: 'Los indicadores operativos se mantienen controlados. Continuar reforzando la estandarización (4S) y disciplina (5S).',
    });
  }

  return {
    resumenEjecutivo: `${companyName} registra un ${f5.rate || 0}% de cierre en Tarjetas 5S (${open5S} anomalías activas), un ${a3.avgProgress || 0}% de avance promedio en las tareas de sus ${a3.total || 0} Proyectos A3 y un ${qw.rate || 0}% de implementación en Quick Wins.${topArea ? ` El principal foco de atención en planta se ubica en "${topArea.area}" con ${topArea.open} hallazgos abiertos.` : ''}`,
    metricaDestacada: {
      nombre: a3.total > 0 ? 'Avance Promedio Tareas A3' : 'Tasa de Cierre 5S',
      valor: a3.total > 0 ? `${a3.avgProgress}%` : `${f5.rate}%`,
      tendencia: (a3.total > 0 ? a3.avgProgress : f5.rate) >= 60 ? 'up' : 'flat',
    },
    evaluacionProgreso: {
      estado: overallState,
      observaciones,
    },
    alertas: alertas.slice(0, 5),
    proximosPasos: [
      {
        titulo: topArea
          ? `Ejecutar blitz 5S de cierre en ${topArea.area}`
          : 'Acelerar cierre de tarjetas 5S pendientes',
        descripcion: topArea
          ? `Resolver las ${topArea.open} tarjetas abiertas en ${topArea.area} asignando responsables y verificando el estándar visual en Gemba.`
          : `Priorizar las ${open5S} tarjetas abiertas para reducir el tiempo medio de cierre actual (${f5.avgClosure} días).`,
        prioridad: 'alta',
      },
      {
        titulo: topA3
          ? `Impulsar seguimiento 5W2H en A3 "${topA3.title}"`
          : 'Formalizar análisis de causa raíz en proyectos A3',
        descripcion: topA3
          ? `Completar las tareas pendientes del proyecto (${topA3.progressPct}% de avance actual, liderado por ${topA3.responsible}) y validar eficacia en gráficos KPI.`
          : 'Transformar las anomalías recurrentes de 5S y Gemba Walk en un proyecto A3 con Ishikawa y 5 Porqués.',
        prioridad: 'alta',
      },
      {
        titulo:
          qw.highImpactPending > 0
            ? `Implementar los ${qw.highImpactPending} Quick Wins de Alto Impacto pendientes`
            : 'Realizar Caminata Gemba con Pacto de Compromiso',
        descripcion:
          qw.highImpactPending > 0
            ? 'Capturar victorias rápidas en piso de planta que requieren bajo costo y entregan retorno inmediato.'
            : 'Recorrer las estaciones críticas comparando contra la foto del estándar y acordando plazos de mejora con los operadores.',
        prioridad: 'media',
      },
    ],
    coachingPracticas: [
      {
        tema: 'Conexión entre Tarjetas 5S, Gemba Walk y Proyectos A3',
        consejo:
          'Si un área repite más de 3 tarjetas 5S por el mismo síntoma, no basta con limpiar o reparar: abre un A3 y aplica los 5 Porqués para erradicar la causa raíz sistémica.',
      },
      {
        tema: 'Seguimiento Basado en Tareas 5W2H y Compromisos',
        consejo:
          'Toda contramedida de un A3 debe traducirse en tareas con verbo en infinitivo, responsable único y fecha límite verificable en la reunión diaria.',
      },
    ],
    enfoqueDelDia: topArea
      ? `Hoy en reunión de piso: revisar en 10 minutos los ${topArea.open} hallazgos abiertos de "${topArea.area}" y destrabar las tareas 5W2H próximas a vencer.`
      : 'Hoy en reunión de piso: verificar en terreno el cumplimiento de los estándares visuales y reconocer al menos una mejora Kaizen del equipo.',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Genera el insight estructurado desde Gemini/OpenRouter o Fallback inteligente
 */
export const generateAIInsight = async (
  companyData: any,
  companyName: string,
  apiKey: string
): Promise<any> => {
  const prompt = `${getConsultantPrompt(
    companyData,
    companyName
  )}\n\nGenera un análisis ejecutivo integral en formato JSON estricto (en español) con las siguientes claves exactas:
{
  "resumenEjecutivo": "string de 2 a 3 oraciones con diagnóstico ejecutivo mencionando cifras reales de 5S, A3, Auditorías, Quick Wins y Gemba",
  "metricaDestacada": {
    "nombre": "string nombre de la métrica más relevante",
    "valor": "string valor numérico o porcentaje destacado",
    "tendencia": "up" | "down" | "flat"
  },
  "evaluacionProgreso": {
    "estado": "bueno" | "regular" | "critico",
    "observaciones": ["string detallado por módulo con datos exactos", "string", "string", "string"]
  },
  "alertas": [
    {
      "tipo": "critica" | "advertencia" | "info",
      "mensaje": "string describiendo el cuello de botella, área crítica o desviación real detectada",
      "proyecto": "string nombre del área, A3 o módulo afectado"
    }
  ],
  "proximosPasos": [
    {
      "titulo": "string iniciando con verbo en infinitivo",
      "descripcion": "string accionable mencionando el área, responsable o proyecto específico",
      "prioridad": "alta" | "media" | "baja"
    }
  ],
  "coachingPracticas": [
    {
      "tema": "string tema metodológico Lean detectado",
      "consejo": "string consejo práctico de coaching Toyota/Kaizen aplicable a sus datos"
    }
  ],
  "enfoqueDelDia": "string recomendación directa para la reunión operativa de hoy en planta",
  "generatedAt": "${new Date().toISOString()}"
}`;

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 2200,
        responseMimeType: 'application/json',
      },
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía de IA');

    const parsed = extractAndParseJSON(rawText);
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('Primary AI failed, trying local Ollama fallback:', err?.message);
    try {
      const fallbackText = await queryOllamaFallback(prompt, true);
      const parsed = extractAndParseJSON(fallbackText);
      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      console.info('Using Smart Deterministic Lean Engine for instant insight.');
      return buildSmartFallbackInsight(companyData, companyName);
    }
  }
};

/**
 * Envía un mensaje en el chat con contexto completo de los 6 módulos
 */
export const sendChatMessage = async (
  history: Array<{ role: string; content: string }>,
  newMessage: string,
  companyData: any,
  companyName: string,
  apiKey: string
): Promise<string> => {
  const systemPrompt = getConsultantPrompt(companyData, companyName);

  const formattedHistory = [
    {
      role: 'user',
      parts: [
        {
          text: `${systemPrompt}\n\nActúa como el Consultor Senior Lean de ${companyName}. Responde siempre en español de forma clara, estructurada (con viñetas o negritas cuando ayude) y citando los datos reales de los módulos cuando el usuario pregunte por su planta.`,
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          text: `Entendido. Tengo cargados en memoria todos los datos en tiempo real de ${companyName} (Tarjetas 5S, Auditorías 5S, Quick Wins, Proyectos A3 con sus planes 5W2H, Mapas VSM y Caminatas Gemba). ¿Cómo te ayudo?`,
        },
      ],
    },
    ...history.slice(-10).map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
  ];

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1800,
      },
    });

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No pude procesar la respuesta.'
    );
  } catch (err: any) {
    console.warn('Chat AI failed, trying fallback:', err?.message);
    try {
      const chatPrompt = `${systemPrompt}\n\nPregunta del usuario: ${newMessage}\nRespuesta experta en español:`;
      return await queryOllamaFallback(chatPrompt);
    } catch {
      const f5 = companyData.fiveS || {};
      const a3 = companyData.a3 || {};
      const qw = companyData.quickWins || {};
      const topArea = f5.topCriticalAreas?.[0];
      return `Basado en los registros actuales de **${companyName}**:\n\n- **Tarjetas 5S:** ${f5.closed || 0} cerradas de ${f5.total || 0} (${f5.rate || 0}% de avance, tiempo medio ${f5.avgClosure || '0.0'} días).${topArea ? ` El área con mayor carga es **${topArea.area}** (${topArea.open} abiertas).` : ''}\n- **Proyectos A3:** ${a3.total || 0} proyectos con un **${a3.avgProgress || 0}%** de avance promedio en sus tareas 5W2H (${a3.completedTasks || 0}/${a3.totalTasks || 0} completadas).\n- **Quick Wins:** ${qw.done || 0} implementados de ${qw.total || 0} (${qw.rate || 0}%).\n\nTe sugiero priorizar el cierre de hallazgos en **${topArea?.area || 'las áreas críticas'}** y revisar el cumplimiento de las tareas 5W2H de los proyectos A3 activos.`;
    }
  }
};

export const shouldGenerateNewInsight = (lastInsight: any): boolean => {
  if (!lastInsight || !lastInsight.generatedAt) return true;
  const hoursSince =
    (Date.now() - new Date(lastInsight.generatedAt).getTime()) /
    (1000 * 60 * 60);
  return hoursSince > 12;
};

/**
 * Genera una solución rápida de mejora Kaizen con IA
 */
export const generateQuickWinSolution = async (
  title: string,
  description: string,
  apiKey?: string
): Promise<string> => {
  const prompt = `
Eres un experto en Lean Manufacturing y mejora continua.
Problema: "${title}"
Descripción: "${description}"

Tu tarea:
1. Propón una solución técnica breve pero altamente efectiva (máx 50 palabras).
2. Incluye un beneficio cuantificable esperado.
3. Sé directo, práctico y accionable en el Gemba (terreno).

Responde únicamente con el texto de la solución.
`;

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256,
      },
    });

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error('Respuesta vacía de Gemini');

    return textResponse.trim();
  } catch (error) {
    try {
      return await queryOllamaFallback(prompt);
    } catch {
      return `Estandarizar el punto crítico de "${title}" mediante control visual (5S) y dispositivo Poka-Yoke en la estación, reduciendo tiempos improductivos y recurrencia del hallazgo en un 50%.`;
    }
  }
};

/**
 * Mejora la redacción de una acción o plan 5W2H para que inicie con un verbo en infinitivo
 * y cumpla con el estándar Lean.
 */
export const improveLeanActionWording = async (
  text: string,
  context?: { why?: string; goal?: string },
  apiKey?: string
): Promise<string> => {
  const prompt = `
Eres un consultor experto en Lean Manufacturing, Kaizen y Toyota A3.
Tu tarea es reescribir la siguiente acción o plan para que cumpla rigurosamente con el estándar Lean:
1. Debe iniciar OBLIGATORIAMENTE con un verbo de acción en infinitivo (ej: Implementar, Estandarizar, Diseñar, Capacitar, Auditar, Instalar, Documentar, Calibrar, Medir, Optimizar, etc.).
2. Debe ser directo, concreto, accionable en el Gemba (terreno) y profesional.
3. Máximo 15 palabras.

Texto original: "${text}"
${context?.why ? `Propósito/Por qué: "${context.why}"` : ''}
${context?.goal ? `Meta del A3: "${context.goal}"` : ''}

Responde ÚNICAMENTE con la frase reescrita, sin explicaciones adicionales ni comillas.
`;

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 120,
      },
    });

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error('Respuesta vacía de Gemini');

    return textResponse.trim().replace(/^["']|["']$/g, '');
  } catch {
    try {
      const ollamaRes = await queryOllamaFallback(prompt);
      return ollamaRes.replace(/^["']|["']$/g, '').trim();
    } catch {
      const words = text.trim().split(' ');
      return `Implementar ${words.join(' ')}`;
    }
  }
};

export type A3FieldType =
  | 'background'
  | 'current_condition'
  | 'goal'
  | 'root_cause'
  | 'countermeasure'
  | 'action_what'
  | 'action_why'
  | 'action_how'
  | 'follow_up';

/**
 * Corrige y optimiza con IA cualquier sección de un reporte A3 Toyota o plan de acción 5W2H
 * garantizando estándares estrictos de Lean Manufacturing y Kaizen.
 */
export const improveA3FieldText = async (
  fieldType: A3FieldType,
  currentText: string,
  context?: {
    projectTitle?: string;
    goal?: string;
    rootCause?: string;
    background?: string;
    currentCondition?: string;
    countermeasure?: string;
  },
  apiKey?: string
): Promise<string> => {
  const cleanInput = stripHtml(currentText);
  const title = context?.projectTitle || 'Optimización Operativa';

  let prompt = '';

  switch (fieldType) {
    case 'background':
      prompt = `Eres un consultor senior en Lean Manufacturing y Toyota A3.
Mejora y profesionaliza la sección "Antecedentes del Negocio (Contexto y Relevancia Operativa)" de un reporte A3.
Título del Proyecto: "${title}"
${cleanInput ? `Borrador del usuario: "${cleanInput}"` : 'El usuario aún no ha escrito antecedentes.'}

REGLAS OBLIGATORIAS:
1. Explica de forma ejecutiva por qué este problema debe resolverse con urgencia (impacto financiero, servicio al cliente, cuellos de botella, calidad o seguridad).
2. Tono formal, contundente y enfocado en la estrategia del negocio.
3. Máximo 2 párrafos concisos y bien estructurados.
4. Responde ÚNICAMENTE con el texto en español, sin saludos, sin explicaciones ni comillas.`;
      break;

    case 'current_condition':
      prompt = `Eres un consultor senior en Lean Manufacturing y Toyota A3.
Mejora la sección "Condición Actual (Situación de Partida en el Gemba)" de un reporte A3.
Título del Proyecto: "${title}"
${context?.background ? `Contexto del problema: "${context.background}"` : ''}
${cleanInput ? `Borrador del usuario: "${cleanInput}"` : 'El usuario aún no ha escrito la condición actual.'}

REGLAS OBLIGATORIAS:
1. Muestra la situación real con rigor objetivo, fáctico y medible (línea base, indicadores, desviaciones respecto al estándar).
2. No juzgues causas ni culpes a personas; describe hechos observables en el Gemba.
3. Si el usuario aportó números o porcentajes, consérvalos y organízalos con claridad.
4. Máximo 2 párrafos concisos.
5. Responde ÚNICAMENTE con el texto en español, sin explicaciones ni comillas.`;
      break;

    case 'goal':
      prompt = `Eres un consultor senior en Lean Manufacturing y Toyota A3.
Redacta o reformula el "Objetivo / Meta SMART" del reporte A3.
Título del Proyecto: "${title}"
${context?.currentCondition ? `Condición actual / línea base: "${context.currentCondition}"` : ''}
${cleanInput ? `Meta propuesta por el usuario: "${cleanInput}"` : 'Genera una meta SMART representativa para este proyecto.'}

REGLAS OBLIGATORIAS:
1. Debe ser rigurosamente SMART (Específico, Medible, Alcanzable, Relevante y con Fecha límite).
2. Inicia OBLIGATORIAMENTE con un verbo de impacto medible (ej: Reducir, Aumentar, Eliminar, Disminuir).
3. Debe seguir la fórmula: [Verbo] [Indicador clave] de [Línea base actual] a [Meta deseada] para [Plazo o fecha estimada], logrando [Impacto de negocio esperado].
4. Máximo 2 oraciones directas y enérgicas.
5. Responde ÚNICAMENTE con el texto del objetivo SMART, sin explicaciones ni comillas.`;
      break;

    case 'root_cause':
      prompt = `Eres un consultor experto en análisis de causa raíz Lean (Ishikawa y 5 Porqués).
Formula con precisión técnica la "Causa Raíz Validada (Conclusión)" para el A3.
Título del Proyecto: "${title}"
${context?.goal ? `Meta del proyecto: "${context.goal}"` : ''}
${cleanInput ? `Idea de causa del usuario: "${cleanInput}"` : 'Sintetiza la causa raíz sistémica.'}

REGLAS OBLIGATORIAS:
1. La causa raíz debe apuntar a fallas en el proceso, estándar operativo, método o diseño del sistema.
2. NUNCA culpar a personas, falta de capacitación genérica o falta de atención.
3. Redacta de forma clara, directa y concluyente en 1 o 2 oraciones.
4. Responde ÚNICAMENTE con la causa raíz formulada, sin explicaciones ni comillas.`;
      break;

    case 'countermeasure':
      prompt = `Eres un consultor senior en Lean Manufacturing y Kaizen.
Mejora la redacción de esta contramedida para erradicar la causa raíz:
${context?.rootCause ? `Causa raíz a erradicar: "${context.rootCause}"` : ''}
Borrador de contramedida: "${cleanInput || 'Nueva contramedida'}"

REGLAS OBLIGATORIAS:
1. Inicia OBLIGATORIAMENTE con un verbo de acción en infinitivo (ej: Instalar, Estandarizar, Diseñar, Implementar, Calibrar).
2. Debe ser preventiva, duradera (tipo poka-yoke o control visual) y concreta en el Gemba.
3. Máximo 15 palabras.
4. Responde ÚNICAMENTE con la contramedida redactada, sin comillas.`;
      break;

    case 'action_what':
      return improveLeanActionWording(
        currentText,
        { why: context?.background, goal: context?.goal },
        apiKey
      );

    case 'action_why':
      prompt = `Eres un consultor experto en Lean Manufacturing.
Mejora la justificación o propósito (¿Por qué?) de esta acción de un plan 5W2H:
Texto original: "${cleanInput}"
${context?.goal ? `Meta del A3: "${context.goal}"` : ''}
${context?.rootCause ? `Causa raíz a mitigar: "${context.rootCause}"` : ''}

REGLAS OBLIGATORIAS:
1. Explica brevemente qué desperdicio (muda) elimina, qué riesgo previene o qué beneficio directo aporta.
2. Directo, profesional y persuasivo. Máximo 20 palabras.
3. Responde ÚNICAMENTE con la frase mejorada, sin comillas.`;
      break;

    case 'action_how':
      prompt = `Eres un consultor experto en Lean Manufacturing.
Mejora el método o procedimiento de ejecución (¿Cómo?) de esta acción 5W2H:
Texto original: "${cleanInput}"

REGLAS OBLIGATORIAS:
1. Describe de forma técnica y ejecutable el procedimiento operativo a seguir paso a paso.
2. Máximo 25 palabras.
3. Responde ÚNICAMENTE con la frase mejorada, sin comillas.`;
      break;

    case 'follow_up':
      prompt = `Eres un consultor senior en Lean Manufacturing y Yokoten (despliegue horizontal).
Redacta o perfecciona la sección "Estandarización y Lecciones Aprendidas (Yokoten)" de un reporte A3.
Proyecto: "${title}"
${cleanInput ? `Notas del usuario: "${cleanInput}"` : 'Estructura el plan de sostenimiento.'}

REGLAS OBLIGATORIAS:
1. Debe incluir: actualización de POE/estándar operativo, frecuencia de auditorías de confirmación (Kamishibai o 5S), y replicación en otras líneas o áreas.
2. Máximo 2 párrafos concisos y orientados al sostenimiento de la disciplina operacional.
3. Responde ÚNICAMENTE con el texto redactado en español, sin explicaciones ni comillas.`;
      break;
  }

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    });
    const rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawResult || !rawResult.trim()) {
      throw new Error('Respuesta vacía');
    }

    let cleaned = rawResult.trim().replace(/^["']|["']$/g, '');

    if (['background', 'current_condition', 'follow_up'].includes(fieldType)) {
      if (!/<[a-z][\s\S]*>/i.test(cleaned)) {
        const paragraphs = cleaned
          .split(/\n\s*\n/)
          .map((p: string) => p.trim())
          .filter(Boolean);
        if (paragraphs.length > 1) {
          cleaned = paragraphs.map((p: string) => `<p>${p}</p>`).join('');
        }
      }
    }

    return cleaned;
  } catch {
    try {
      const fallbackRes = await queryOllamaFallback(prompt);
      return fallbackRes.trim().replace(/^["']|["']$/g, '');
    } catch {
      return currentText || `Definir estándar para ${title}`;
    }
  }
};

/**
 * Propone subtareas operativas concretas siguiendo el ciclo PDCA (Plan, Do, Check, Act)
 * para completar un plan de acción 5W2H.
 */
export const generateLeanSubtasks = async (
  actionWhat: string,
  context?: {
    why?: string;
    rootCause?: string;
    projectGoal?: string;
    countermeasure?: string;
  },
  apiKey?: string
): Promise<Array<{ title: string; completed: boolean }>> => {
  const prompt = `
Eres un consultor experto en Lean Manufacturing y Toyota A3.
Para la siguiente acción de un plan 5W2H:
Acción: "${actionWhat}"
${context?.why ? `Propósito (Why): "${context.why}"` : ''}
${context?.countermeasure ? `Contramedida raíz: "${context.countermeasure}"` : ''}
${context?.projectGoal ? `Meta global del A3: "${context.projectGoal}"` : ''}

Genera entre 3 y 4 subtareas secuenciales de alto impacto para ejecutar y asegurar el éxito de esta acción.
REGLAS OBLIGATORIAS:
- Cada subtarea DEBE empezar OBLIGATORIAMENTE con un verbo en infinitivo (ej: Definir, Diseñar, Capacitar, Ejecutar, Verificar, Medir, Estandarizar, Auditar).
- Deben seguir la lógica Lean (preparar/estándar -> ejecutar/piloto -> verificar/medir -> estandarizar).
- Máximo 10 palabras por subtarea.
- Responde ÚNICAMENTE en formato JSON plano como una lista:
[
  { "title": "Definir estándar operativo para..." },
  { "title": "Capacitar al personal de turno en..." },
  { "title": "Ejecutar prueba piloto en línea..." },
  { "title": "Verificar y medir resultados contra la meta..." }
]
`;

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    });
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = extractAndParseJSON(rawText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any) => ({
        title: typeof item === 'string' ? item : item.title || item.task || 'Ejecutar tarea',
        completed: false,
      }));
    }
    throw new Error('JSON de subtareas inválido');
  } catch {
    const cleanAction = actionWhat.replace(/^(implementar|realizar|hacer|crear)\s+/i, '').trim();
    return [
      {
        title: `Definir estándar y procedimiento operativo para ${cleanAction.slice(0, 35)}`,
        completed: false,
      },
      {
        title: `Capacitar a los líderes y operadores de turno`,
        completed: false,
      },
      {
        title: `Ejecutar prueba piloto en puesto de trabajo`,
        completed: false,
      },
      {
        title: `Verificar resultados de eficacia y auditar cumplimiento`,
        completed: false,
      },
    ];
  }
};

export default {
  prepareCompanyData,
  generateAIInsight,
  sendChatMessage,
  shouldGenerateNewInsight,
  generateQuickWinSolution,
  improveLeanActionWording,
  improveA3FieldText,
  generateLeanSubtasks,
};
