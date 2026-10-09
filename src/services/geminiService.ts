/**
 * Gemini AI Service - Consultor de Mejora Continua
 * Genera análisis inteligentes basados en los datos de la empresa
 */

/**
 * Modelos de Gemini para generación de contenido.
 * Si un modelo es deprecado o no está disponible, el sistema cambia automáticamente
 * al siguiente o al modelo sugerido por el error de Google.
 */
const DEFAULT_GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp',
];

/**
 * Consulta la API de Gemini ejecutando fallback automático si un modelo ya no está disponible.
 */
async function callGeminiAPI(apiKey: string, requestBody: any): Promise<any> {
  const customModel =
    (typeof window !== 'undefined' ? localStorage.getItem('gemini_model') : null) ||
    import.meta.env.VITE_GEMINI_MODEL;

  const modelsToTry: string[] = Array.from(
    new Set(
      [
        customModel,
        ...DEFAULT_GEMINI_MODELS,
      ].filter(Boolean) as string[]
    )
  );

  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg: string =
          errJson.error?.message || `Error HTTP ${response.status} en modelo ${model}`;

        console.warn(`[Gemini API] Falló modelo ${model}:`, errMsg);

        // Detectar si Google recomendó un modelo nuevo en su mensaje de error:
        // Ej: "Please update your code to use models/gemini-1.5-flash" o "models/gemini-3.8-flash"
        const match = errMsg.match(/models\/([a-zA-Z0-9._-]+)/i);
        if (match && match[1] && !modelsToTry.includes(match[1])) {
          console.info(`[Gemini API] Google sugiere usar el modelo: ${match[1]}. Reintentando...`);
          modelsToTry.splice(i + 1, 0, match[1]);
        }

        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      return data;
    } catch (networkErr: any) {
      console.warn(`[Gemini API] Error de red consultando modelo ${model}:`, networkErr);
      lastError = networkErr;
    }
  }

  throw lastError || new Error('No fue posible obtener respuesta de Gemini.');
}

export function getEffectiveApiKey(passedKey?: string): string {
  if (passedKey && passedKey.trim()) return passedKey.trim();
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('gemini_api_key');
    if (local && local.trim()) return local.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

const OLLAMA_FALLBACK_URL =
  'https://desktop-sj195st.tail5a26f1.ts.net:8443/api/generate';
const OLLAMA_MODEL = 'qwen2.5-coder:14b';

async function queryOllamaFallback(prompt: string, jsonFormat = false): Promise<string> {
  console.log(`[Ollama Fallback] Querying local model ${OLLAMA_MODEL}...`);
  try {
    const response = await fetch(OLLAMA_FALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        format: jsonFormat ? 'json' : undefined,
        options: {
          temperature: jsonFormat ? 0.2 : 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.response;
    if (!text) {
      throw new Error('Respuesta vacía de Ollama');
    }
    return text.trim();
  } catch (error) {
    console.error('[Ollama Fallback] Error:', error);
    throw new Error(
      'Tanto Gemini como el fallback de Nexus IA fallaron. Verifica la conexión y que Ollama esté corriendo.'
    );
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
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const possibleJson = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(possibleJson);
      } catch (secondError) {
        try {
          const cleaned = possibleJson
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/\\"/g, '"')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          return JSON.parse(cleaned);
        } catch (thirdError) {
          console.error(
            'Failed to parse JSON even after cleaning. Raw response:',
            text
          );
          throw new Error('La IA local no generó un formato JSON válido.');
        }
      }
    }
    throw firstError;
  }
}

// Helper to format Ishikawa data
const formatIshikawa = (ishikawas: any[]): string => {
  if (!ishikawas || ishikawas.length === 0) return 'No hay diagramas de Ishikawa.';

  return ishikawas
    .map((ish, idx) => {
      const problem = ish.problem || 'Problema no definido';
      const categories = Object.entries(ish.categories || {})
        .map(([cat, causes]: [string, any]) => {
          if (!causes || causes.length === 0) return null;
          const causeList = causes
            .map((c: any) => {
              const text = typeof c === 'string' ? c : c.text;
              const priority =
                c.color === 'green'
                  ? '(SI OCURRE)'
                  : c.color === 'red'
                  ? '(NO OCURRE)'
                  : '';
              return `      - ${text} ${priority}`;
            })
            .join('\n');
          return `    * ${cat}:\n${causeList}`;
        })
        .filter(Boolean)
        .join('\n');

      return `  Diagrama #${idx + 1}: Problema: "${problem}"\n    Causa Raíz Seleccionada: ${
        ish.rootCause || 'Ninguna'
      }\n${categories}`;
    })
    .join('\n\n');
};

// Helper to format 5 Whys
const formatFiveWhys = (fiveWhys: any[]): string => {
  if (!fiveWhys || fiveWhys.length === 0) return 'No hay análisis de 5 Porqués.';

  return fiveWhys
    .map((item, idx) => {
      const whys = (item.whys || []).filter((w: string) => w.trim().length > 0).join(' -> ');
      const status =
        item.status === 'root'
          ? '(CAUSA RAÍZ)'
          : item.status === 'discarded'
          ? '(DESCARTADO)'
          : '';
      return `  Análisis #${idx + 1}: ${item.problem}\n    Cadena: ${whys} ${status}`;
    })
    .join('\n');
};

// Helper to format Action Plan
const formatActionPlan = (actions: any[]): string => {
  if (!actions || actions.length === 0) return 'No hay acciones definidas.';

  return actions
    .map((act) => {
      const status = act.status === 'done' ? '(COMPLETADA)' : '(PENDIENTE)';
      return `    * ${act.activity} [Resp: ${act.responsible}] [Vence: ${act.date}] ${status}`;
    })
    .join('\n');
};

// Helper to format Follow Up Charts
const formatCharts = (charts: any[]): string => {
  if (!charts || charts.length === 0) return 'No hay gráficos de seguimiento.';

  return charts
    .map((chart, idx) => {
      const kpiType =
        chart.kpiType === 'oee' ? 'OEE (Eficiencia General)' : 'Simple';
      const goal = chart.goal
        ? `${chart.goal}${chart.isPercentage ? '%' : ''}`
        : 'N/A';

      let dataSummary = '';
      if (chart.kpiType === 'oee') {
        const last =
          chart.dataPoints && chart.dataPoints.length > 0
            ? chart.dataPoints[chart.dataPoints.length - 1]
            : null;
        if (last) {
          const oeeVal = last.oee || 'ND';
          dataSummary = `Último registro (${last.date}): OEE ${oeeVal}% (Disp: ${
            last.availability || 'ND'
          }%, Rend: ${last.performance || 'ND'}%, Cal: ${last.quality || 'ND'}%)`;
        } else {
          dataSummary = 'Sin datos registrados.';
        }
      } else {
        const points = chart.dataPoints || [];
        if (points.length > 0) {
          dataSummary = points
            .slice(-3)
            .map((dp: any) => `${dp.date}: ${dp.value}`)
            .join(', ');
        } else {
          dataSummary = 'Sin datos registrados.';
        }
      }

      return `  Gráfico #${idx + 1}: ${chart.kpiName || 'Sin nombre'} (${kpiType})\n    Meta: ${goal}\n    Datos: ${dataSummary}`;
    })
    .join('\n');
};

/**
 * Prompt base del consultor de mejora continua
 */
const getConsultantPrompt = (companyData: any, companyName: string): string => {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
Ejes del Software "Nexus Lean":
- Módulo 5S: Auditorías, hallazgos, acciones correctivas.
- Módulo Quick Wins: Mejoras rápidas de bajo costo.
- Módulo A3: Resolución de problemas (Ishikawa, 5 Porqués).
- Módulo VSM: Mapeo de flujo de valor (Estado Actual -> Estado Futuro).

FECHA: ${today}
EMPRESA: ${companyName || 'Cliente'}

TU ROL Y PODERES:
1. Eres un mentor experto en Lean Manufacturing.
2. Tienes acceso SOLO a los datos de texto provistos aquí. NO tienes acceso a base de datos, no puedes borrar, editar ni ver otras empresas.
3. Todas las ideas o proyectos que sugieras deben ser atribuidos al usuario que pregunta.
4. NO puedes acceder al panel de administración ni cambiar configuraciones.

CAPACIDAD DE GENERACIÓN DE EJEMPLOS:
Si el usuario te pide un ejemplo (ej: "Dame un ejemplo de A3 para seguridad"), genera una respuesta estructurada en Markdown lista para usar.

=== DATOS DE LA EMPRESA PARA ANÁLISIS ===

📋 TARJETAS 5S:
- Total Histórico: ${companyData.fiveS.total}
- Abiertas (Pendiente/Proceso): ${
    companyData.fiveS.pending + companyData.fiveS.inProcess
  }
- Cerradas (Finalizadas): ${companyData.fiveS.closed}
- Tasa de cierre: ${companyData.fiveS.rate}% (Promedio cierre: ${
    companyData.fiveS.avgClosure
  } días)
${companyData.fiveS.details
  .map(
    (d: any) =>
      `  • ${d.status ? d.status.toUpperCase() : 'PENDIENTE'}: ${d.reason} (${
        d.location
      }) - ${d.responsible}`
  )
  .join('\n')}
${
  companyData.auditLogs && companyData.auditLogs.length > 0
    ? `👉 ÚLTIMA AUDITORÍA 5S: Puntaje ${companyData.auditLogs[0].score}% (${companyData.auditLogs[0].date})`
    : ''
}

⚡ QUICK WINS:
- Total: ${companyData.quickWins.total} (Implementadas: ${
    companyData.quickWins.done
  }, Alto Impacto: ${companyData.quickWins.highImpact})
${companyData.quickWins.details
  .map(
    (d: any) =>
      `  • IDEA: ${d.title} (Impacto: ${d.impact}, Esfuerzo: ${d.effort}) - Estado: ${
        d.status
      }\n    Detalle: "${d.description || 'Sin descripción'}"`
  )
  .join('\n')}

📊 PROYECTOS A3:
- Total: ${companyData.a3.total}
${
  companyData.a3.details.length > 0
    ? companyData.a3.details
        .map(
          (d: any) => `
> PROYECTO A3: "${d.title}" (Estado: ${d.status})
  1. DEFINICIÓN:
     - Antecedentes: ${d.background || 'No definido'}
     - Condición Actual: ${d.currentCondition || 'No definida'}
     - Objetivo: ${d.goal || 'No definido'}
     - Responsable: ${d.responsible || 'Sin asignar'}

  2. ANÁLISIS DE CAUSA:
     - Causa Raíz Identificada: ${d.rootCause || 'No identificada'}
     - Diagramas de Ishikawa:
${formatIshikawa(d.ishikawas)}
     - 5 Porqués:
${formatFiveWhys(d.fiveWhys)}

  3. PLAN Y SEGUIMIENTO:
     - Contramedidas (Estrategia): ${d.countermeasures || 'No definidas'}
     - Plan de Acción:
${formatActionPlan(d.actionPlan)}
     - Métricas de Seguimiento (Gráficos):
${formatCharts(d.followUpData)}
`
        )
        .join('\n\n------------------------------------------------------------\n\n')
    : 'No hay proyectos activos.'
}

🗺️ MAPAS VSM:
- Total: ${companyData.vsm.count}
${
  companyData.vsm.details && companyData.vsm.details.length > 0
    ? companyData.vsm.details
        .map(
          (v: any) => `  • VSM: "${v.name || 'Sin nombre'}" (${
            v.status === 'current'
              ? 'Estado Actual'
              : v.status === 'future'
              ? 'Estado Futuro'
              : 'Finalizado'
          })
    - Descripción: ${v.description || 'N/A'}
    - Lead Time: ${v.leadTime || 'ND'}
    - Tiempo Proceso: ${v.processTime || 'ND'}
    - Eficiencia: ${v.efficiency || 'ND'}
    - Takt Time: ${v.taktTime || 'ND'}`
        )
        .join('\n')
    : 'No hay mapas VSM activos.'
}

=== TU ANÁLISIS ===
1. Resumen Ejecutivo (Estado general).
2. Evaluación de Progreso (Coherencia metodológica).
3. Coaching (Errores detectados).
4. Acciones Recomendadas (Priorizadas).

REGLAS DE RESPUESTA:
- Si te piden ejemplos, usa la estructura de Markdown estructurada.
- Si te preguntan por datos de otras empresas, aclara firmemente que no tienes acceso por seguridad.
- Mantén un tono profesional, motivador y educativo.
`;
};

/**
 * Prepara los datos de la empresa para el análisis
 */
export const prepareCompanyData = (data: any, companyName = 'Cliente') => {
  const { fiveS = [], quickWins = [], vsms = [], a3 = [], auditLogs = [] } = data;

  const fiveSClosed = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'cerrado'
  ).length;
  const fiveSPending = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'pendiente'
  ).length;
  const fiveSInProcess = fiveS.filter(
    (i: any) => i.status?.toLowerCase() === 'en proceso'
  ).length;
  const fiveSRate =
    fiveS.length > 0 ? Math.round((fiveSClosed / fiveS.length) * 100) : 0;

  const qwDone = quickWins.filter(
    (i: any) => i.status === 'done' || i.status === 'completed'
  ).length;
  const qwPending = quickWins.filter(
    (i: any) => i.status !== 'done' && i.status !== 'completed'
  ).length;
  const qwHighImpact = quickWins.filter(
    (i: any) => i.impact === 'Alto'
  ).length;

  const a3Details = a3
    .filter((p: any) => p.status !== 'Cerrado')
    .slice(0, 50)
    .map((p: any) => ({
      title: p.title,
      status: p.status,
      responsible: p.responsible,
      background: p.background,
      currentCondition: p.currentCondition,
      goal: p.goal,
      rootCause: p.rootCause,
      countermeasures: p.countermeasures,
      actionPlan: p.actionPlan || [],
      ishikawas: p.ishikawas || [],
      fiveWhys: p.multipleFiveWhys || p.fiveWhys || [],
      followUpData: p.followUpData || [],
    }));

  return {
    companyName,
    fiveS: {
      total: fiveS.length,
      closed: fiveSClosed,
      pending: fiveSPending,
      inProcess: fiveSInProcess,
      rate: fiveSRate,
      avgClosure: '4.5',
      details: fiveS.slice(0, 30).map((d: any) => ({
        status: d.status,
        reason: d.description || d.findings || 'Sin detalle',
        location: d.area || 'Sin área',
        responsible: d.assigned_to || d.responsible || 'Sin asignar',
      })),
    },
    quickWins: {
      total: quickWins.length,
      done: qwDone,
      pending: qwPending,
      highImpact: qwHighImpact,
      details: quickWins.slice(0, 30).map((w: any) => ({
        title: w.title,
        status: w.status,
        impact: w.impact,
        effort: w.effort_score || 5,
        description: w.description,
      })),
    },
    a3: {
      total: a3.length,
      details: a3Details,
    },
    vsm: {
      count: vsms.length,
      details: vsms.slice(0, 10).map((v: any) => ({
        name: v.name,
        status: v.status,
        description: v.description,
        leadTime: v.lead_time,
        processTime: v.process_time,
        efficiency: v.efficiency,
        taktTime: v.takt_time,
      })),
    },
    auditLogs: auditLogs.slice(0, 5).map((a: any) => ({
      score: a.total_score,
      date: a.audit_date,
    })),
  };
};

/**
 * Genera el insight estructurado desde Gemini o Fallback
 */
export const generateAIInsight = async (
  companyData: any,
  companyName: string,
  apiKey: string
): Promise<any> => {
  const prompt = `${getConsultantPrompt(
    companyData,
    companyName
  )}\n\nGenera un análisis en formato JSON estricto con las siguientes claves:
{
  "resumenEjecutivo": "string con tu análisis conciso del estado de la empresa",
  "metricaDestacada": {
    "nombre": "string nombre de la métrica clave",
    "valor": "string valor destacado",
    "tendencia": "up" | "down" | "flat"
  },
  "evaluacionProgreso": {
    "estado": "bueno" | "regular" | "critico",
    "observaciones": ["string", "string"]
  },
  "alertas": [
    {
      "tipo": "critica" | "advertencia" | "info",
      "mensaje": "string con la alerta",
      "proyecto": "string opcional"
    }
  ],
  "proximosPasos": [
    {
      "titulo": "string",
      "descripcion": "string",
      "prioridad": "alta" | "media" | "baja"
    }
  ],
  "coachingPracticas": [
    {
      "tema": "string",
      "consejo": "string"
    }
  ],
  "enfoqueDelDia": "string con una recomendación focal para el turno o jornada",
  "generatedAt": "${new Date().toISOString()}"
}`;

  const effectiveKey = getEffectiveApiKey(apiKey);

  try {
    if (!effectiveKey) {
      return await queryOllamaFallback(prompt, true).then(extractAndParseJSON);
    }

    const data = await callGeminiAPI(effectiveKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía de Gemini');

    return extractAndParseJSON(rawText);
  } catch (err: any) {
    console.warn('Gemini request failed, trying Ollama fallback:', err);
    try {
      const fallbackText = await queryOllamaFallback(prompt, true);
      return extractAndParseJSON(fallbackText);
    } catch (fallbackErr) {
      throw new Error(
        err?.message || 'No fue posible generar el diagnóstico de IA.'
      );
    }
  }
};

/**
 * Envía un mensaje en el chat con contexto
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
      parts: [{ text: `${systemPrompt}\n\nIniciemos la conversación de asesoría.` }],
    },
    {
      role: 'model',
      parts: [
        {
          text: `Entendido. He analizado todos los datos de ${companyName}. Estoy listo para asesorar al equipo con metodología Lean, Kaizen y Toyota A3.`,
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
    if (!effectiveKey) {
      const chatPrompt = `${systemPrompt}\n\nHistorial de conversación:\n${history
        .map((h) => `${h.role}: ${h.content}`)
        .join('\n')}\nUsuario: ${newMessage}\nAsistente:`;
      return await queryOllamaFallback(chatPrompt);
    }

    const data = await callGeminiAPI(effectiveKey, {
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.7,
      },
    });

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No pude procesar la respuesta.'
    );
  } catch (err: any) {
    console.warn('Chat request failed, trying Ollama fallback:', err);
    const chatPrompt = `${systemPrompt}\n\nPregunta: ${newMessage}\nRespuesta Asistente:`;
    return await queryOllamaFallback(chatPrompt);
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
    if (!effectiveKey) {
      return await queryOllamaFallback(prompt);
    }

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
    console.warn('Error in generateQuickWinSolution, using local fallback:', error);
    try {
      return await queryOllamaFallback(prompt);
    } catch (fallbackError) {
      throw error;
    }
  }
};

export default {
  prepareCompanyData,
  generateAIInsight,
  sendChatMessage,
  shouldGenerateNewInsight,
  generateQuickWinSolution,
};
