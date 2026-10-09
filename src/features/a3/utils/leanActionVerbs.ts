/**
 * Utilidades y reglas Lean para redacción de Planes de Acción y Subtareas (5W2H).
 * En la filosofía Lean (Toyota A3, Kaizen), toda acción y subtarea debe iniciar
 * obligatoriamente con un verbo en infinitivo (-ar, -er, -ir) para garantizar
 * que represente una acción observable, medible y asignable.
 */

export const COMMON_LEAN_VERBS = [
  'Implementar',
  'Estandarizar',
  'Capacitar',
  'Diseñar',
  'Auditar',
  'Verificar',
  'Instalar',
  'Definir',
  'Medir',
  'Optimizar',
  'Documentar',
  'Calibrar',
  'Ejecutar',
  'Ajustar',
  'Crear',
  'Eliminar',
] as const;

export const COMMON_SUBTASK_VERBS = [
  'Definir',
  'Capacitar',
  'Ejecutar',
  'Verificar',
  'Estandarizar',
  'Medir',
  'Auditar',
  'Documentar',
] as const;

// Mapeo común de sustantivos operacionales a verbos en infinitivo
const NOUN_TO_VERB_MAP: Record<string, string> = {
  capacitacion: 'Capacitar',
  capacitación: 'Capacitar',
  estandarizacion: 'Estandarizar',
  estandarización: 'Estandarizar',
  implementacion: 'Implementar',
  implementación: 'Implementar',
  revision: 'Revisar',
  revisión: 'Revisar',
  auditoria: 'Auditar',
  auditoría: 'Auditar',
  verificacion: 'Verificar',
  verificación: 'Verificar',
  instalacion: 'Instalar',
  instalación: 'Instalar',
  diseño: 'Diseñar',
  diseno: 'Diseñar',
  medicion: 'Medir',
  medición: 'Medir',
  calibracion: 'Calibrar',
  calibración: 'Calibrar',
  optimizacion: 'Optimizar',
  optimización: 'Optimizar',
  eliminacion: 'Eliminar',
  eliminación: 'Eliminar',
  documentacion: 'Documentar',
  documentación: 'Documentar',
  definicion: 'Definir',
  definición: 'Definir',
  analisis: 'Analizar',
  análisis: 'Analizar',
  evaluacion: 'Evaluar',
  evaluación: 'Evaluar',
  limpieza: 'Limpiar',
  orden: 'Ordenar',
  clasificacion: 'Clasificar',
  clasificación: 'Clasificar',
  creacion: 'Crear',
  creación: 'Crear',
  prueba: 'Probar',
  ajuste: 'Ajustar',
  reparacion: 'Reparar',
  reparación: 'Reparar',
};

/**
 * Valida si el texto comienza con un verbo de acción (infinitivo o imperativo).
 */
export function startsWithActionVerb(text: string): {
  isValid: boolean;
  firstWord: string;
  suggestedVerb?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isValid: false, firstWord: '' };
  }

  // Obtener primera palabra sin puntuación
  const firstWordMatch = trimmed.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)/i);
  if (!firstWordMatch) {
    return { isValid: false, firstWord: '' };
  }

  const rawFirstWord = firstWordMatch[1];
  const lowerFirstWord = rawFirstWord.toLowerCase();

  // 1. Revisar si termina en infinitivo (-ar, -er, -ir)
  const isInfinitivo =
    lowerFirstWord.endsWith('ar') ||
    lowerFirstWord.endsWith('er') ||
    lowerFirstWord.endsWith('ir') ||
    lowerFirstWord.endsWith('ár') ||
    lowerFirstWord.endsWith('ér') ||
    lowerFirstWord.endsWith('ír');

  if (isInfinitivo && lowerFirstWord.length >= 4) {
    return {
      isValid: true,
      firstWord: rawFirstWord,
    };
  }

  // 2. Revisar si es un sustantivo común con equivalente verbal
  if (NOUN_TO_VERB_MAP[lowerFirstWord]) {
    return {
      isValid: false,
      firstWord: rawFirstWord,
      suggestedVerb: NOUN_TO_VERB_MAP[lowerFirstWord],
    };
  }

  return {
    isValid: false,
    firstWord: rawFirstWord,
  };
}

/**
 * Corrige un texto para que comience con un verbo en infinitivo.
 * Si es un sustantivo conocido, lo transforma (ej: "Capacitación a operarios" -> "Capacitar a operarios").
 * Si no, antepone el verbo sugerido.
 */
export function formatWithActionVerb(text: string, defaultVerb: string = 'Implementar'): string {
  const trimmed = text.trim();
  if (!trimmed) return defaultVerb;

  const analysis = startsWithActionVerb(trimmed);
  if (analysis.isValid) return trimmed;

  if (analysis.suggestedVerb) {
    // Reemplaza la primera palabra con el verbo sugerido
    const rest = trimmed.slice(analysis.firstWord.length).trim();
    // Limpieza de conectores innecesarios ej: "Capacitación de personal" -> "Capacitar al personal"
    let cleanRest = rest;
    if (cleanRest.toLowerCase().startsWith('de ')) {
      cleanRest = cleanRest.slice(3);
    } else if (cleanRest.toLowerCase().startsWith('del ')) {
      cleanRest = 'al ' + cleanRest.slice(4);
    }
    return `${analysis.suggestedVerb} ${cleanRest}`.trim();
  }

  // Anteponer verbo por defecto
  return `${defaultVerb} ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`;
}
