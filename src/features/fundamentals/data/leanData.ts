export interface GlossaryItem {
  id: string;
  term: string;
  originalTerm?: string; // Ej: 改善 (Kaizen)
  pronunciation?: string;
  category: 'filosofia' | 'herramientas' | 'resolucion' | 'flujo' | 'desperdicios';
  categoryLabel: string;
  tagColor: string;
  shortSummary: string; // Explicación de 1 línea
  simpleExplanation: string; // Explicación sin tecnicismos
  realWorldExample: string; // Ejemplo de terreno / vida cotidiana
  nexusModule?: {
    label: string;
    path: string;
  };
}

export interface WasteItem {
  id: string;
  code: string; // T, I, M, W, O, O, D, S
  name: string;
  englishName: string;
  color: string;
  bgColor: string;
  definition: string;
  warningSigns: string[];
  realExample: string;
  howToEliminate: string;
  recommendedNexusTool?: {
    name: string;
    path: string;
  };
}

export interface ToolGuideItem {
  id: string;
  problemSituation: string;
  indicator: string;
  toolName: string;
  subtitle: string;
  badgeColor: string;
  explanation: string;
  nexusPath: string;
  nexusActionLabel: string;
  practicalExample: string;
}

export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'fácil' | 'medio';
}

export const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'filosofia', label: 'Filosofía & Cultura' },
  { id: 'herramientas', label: 'Herramientas de Terreno' },
  { id: 'resolucion', label: 'Solución de Problemas' },
  { id: 'flujo', label: 'Flujo & Productividad' },
  { id: 'desperdicios', label: 'Desperdicios (Muda)' },
];

export const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    id: 'kaizen',
    term: 'Kaizen',
    originalTerm: '改善',
    pronunciation: 'Kai = Cambio, Zen = Bueno',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    shortSummary: 'Mejora continua paso a paso todos los días.',
    simpleExplanation:
      'No esperar a hacer un cambio millonario una vez al año. Es hacer pequeños arreglos diarios impulsados por quienes hacen el trabajo real en el puesto.',
    realWorldExample:
      'Si un operario pierde 1 minuto cada vez que busca una llave, colocar una cinta magnética en su mesa para dejarla siempre ahí es puro Kaizen.',
    nexusModule: {
      label: 'Registrar Quick Win',
      path: '/quick-wins',
    },
  },
  {
    id: 'gemba',
    term: 'Gemba (o Genba)',
    originalTerm: '現場',
    pronunciation: 'Lugar real donde ocurren las cosas',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    shortSummary: 'Ir a ver la realidad donde se crea el valor.',
    simpleExplanation:
      'Los problemas no se resuelven desde una oficina con planillas Excel. Gemba significa ponerse los zapatos de seguridad, ir al pasillo, andén o línea productiva, observar con respeto y hablar con los operarios.',
    realWorldExample:
      'En lugar de discutir en una reunión por qué se atrasan los despachos, el supervisor va al andén de carga a las 11:00 am a ver cómo preparan los pedidos.',
    nexusModule: {
      label: 'Iniciar Gemba Walk',
      path: '/gemba',
    },
  },
  {
    id: '5s',
    term: 'Metodología 5S',
    originalTerm: 'Seiri, Seiton, Seiso, Seiketsu, Shitsuke',
    pronunciation: 'Cinco pasos de orden y limpieza',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    shortSummary: 'Crear un lugar de trabajo seguro, ordenado y visual.',
    simpleExplanation:
      'Consiste en 5 hábitos: 1. Clasificar (botar lo inservible), 2. Ordenar (un lugar para cada cosa), 3. Limpiar (limpiar para inspeccionar), 4. Estandarizar (reglas visuales claras) y 5. Disciplina (mantener el hábito).',
    realWorldExample:
      'En un taller mecánico, pintar siluetas de las herramientas en el tablero para saber al segundo si falta un alicate o una llave inglesa.',
    nexusModule: {
      label: 'Módulo Tarjetas 5S',
      path: '/5s',
    },
  },
  {
    id: 'poka-yoke',
    term: 'Poka-Yoke',
    originalTerm: 'ポカヨケ',
    pronunciation: 'A prueba de errores involuntarios',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    shortSummary: 'Diseñar cosas para que sea imposible equivocarse.',
    simpleExplanation:
      'Mecanismos físicos o lógicos que impiden que el ser humano cometa un error, o que detienen el proceso si algo anda mal antes de que salga un producto defectuoso.',
    realWorldExample:
      'La tarjeta SIM del celular tiene una esquina cortada: es físicamente imposible meterla al revés. O el microondas, que no enciende si la puerta está abierta.',
  },
  {
    id: 'andon',
    term: 'Andon',
    originalTerm: 'アンドン',
    pronunciation: 'Luz de advertencia visual',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    shortSummary: 'Sistema visual para pedir ayuda inmediata ante anomalías.',
    simpleExplanation:
      'Una torre de luces (verde, amarilla, roja) o sonido que avisa cuando hay una detención o peligro. En Lean, cuando alguien activa el Andon, el líder acude a ayudar sin juzgar ni culpar.',
    realWorldExample:
      'En las cajas del supermercado, cuando se enciende una luz roja parpadeante para que el supervisor venga a autorizar una anulación o traer sencillo.',
  },
  {
    id: 'a3',
    term: 'Reporte A3 (Toyota)',
    originalTerm: 'A3 Report',
    pronunciation: 'Hoja tamaño A3 (42 x 29.7 cm)',
    category: 'resolucion',
    categoryLabel: 'Solución de Problemas',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shortSummary: 'Resolver un problema complejo en una sola página.',
    simpleExplanation:
      'Una estructura lógica de pensamiento para resolver problemas de raíz: Antecedentes, Situación Actual, Meta, Causa Raíz (Ishikawa/5 Porqués), Plan de Acción y Seguimiento.',
    realWorldExample:
      'Si un cliente reclama que los pallets llegan desarmados, no se compra plástico más caro a ciegas: se hace un A3 para descubrir si la causa es el apilamiento, la vibración del camión o el film.',
    nexusModule: {
      label: 'Ver Proyectos A3',
      path: '/a3',
    },
  },
  {
    id: 'muda',
    term: 'Muda (Desperdicio)',
    originalTerm: '無駄',
    pronunciation: 'Lo que no agrega valor',
    category: 'desperdicios',
    categoryLabel: 'Desperdicios (Muda)',
    tagColor: 'bg-red-100 text-red-800 border-red-200',
    shortSummary: 'Cualquier actividad que consume recursos y el cliente no pagaría por ella.',
    simpleExplanation:
      'Si el cliente compra un sándwich, paga por los ingredientes y la cocción; no quiere pagar porque el cocinero camine 20 metros a buscar el pan ni por esperar 40 minutos.',
    realWorldExample:
      'Caminar 10 veces al día al otro lado del galpón a imprimir una hoja que podría imprimirse en tu propia estación.',
  },
  {
    id: 'vsm',
    term: 'VSM (Value Stream Mapping)',
    originalTerm: 'Mapeo de la Cadena de Valor',
    pronunciation: 'V-S-M',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    shortSummary: 'Diagrama que muestra todo el viaje del producto desde inicio a fin.',
    simpleExplanation:
      'Dibuja cada paso por el que pasa un pedido o producto, mostrando claramente cuánto tiempo se trabaja de verdad (valor) versus cuánto tiempo pasa esperando en bodegas o buffers (desperdicio).',
    realWorldExample:
      'Descubrir que fabricar un mueble toma 3 horas, pero el cliente espera 15 días porque pasa 14 días esperando en colas y bodegas intermedias.',
    nexusModule: {
      label: 'Mapeo de Procesos (VSM)',
      path: '/vsm',
    },
  },
  {
    id: 'kanban',
    term: 'Kanban',
    originalTerm: '看板',
    pronunciation: 'Tarjeta o señal visual',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    shortSummary: 'Producir o reponer solo cuando el siguiente paso lo pide.',
    simpleExplanation:
      'En lugar de acumular cajas por si acaso, una tarjeta o aviso visual avisa cuando quedan pocas unidades para que se reponga solo lo necesario (sistema PULL).',
    realWorldExample:
      'En casa, cuando abres el último paquete de café y anotas "Comprar café" en la pizarra del refrigerador: eso es una tarjeta Kanban de reposición.',
  },
  {
    id: '5-whys',
    term: 'Los 5 Porqués (5 Whys)',
    originalTerm: 'なぜなぜ分析',
    pronunciation: 'Preguntar "¿por qué?" hasta llegar a la raíz',
    category: 'resolucion',
    categoryLabel: 'Solución de Problemas',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    shortSummary: 'Técnica para no quedarse en la superficie de un error.',
    simpleExplanation:
      'Cuando algo falla, no se busca culpables ni soluciones superficiales. Se pregunta consecutivamente "¿Por qué ocurrió?" para encontrar la causa de fondo en el proceso.',
    realWorldExample:
      '¿Por qué se cayó el operario? Había aceite. ¿Por qué había aceite? La máquina goteaba. ¿Por qué goteaba? El sello estaba roto. ¿Por qué estaba roto? No se le hizo mantenimiento. Causa raíz: Falta de plan de mantenimiento preventivo.',
    nexusModule: {
      label: 'Usar en Proyectos A3',
      path: '/a3',
    },
  },
  {
    id: 'ishikawa',
    term: 'Diagrama de Ishikawa (Espina de Pescado)',
    originalTerm: 'Causa y Efecto (6M)',
    pronunciation: 'Ishi-kawa',
    category: 'resolucion',
    categoryLabel: 'Solución de Problemas',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    shortSummary: 'Lluvia de ideas visual organizada en 6 familias.',
    simpleExplanation:
      'Permite al equipo explorar todas las causas posibles de un problema dividiéndolas en 6 ramas (6M): Método, Máquina, Mano de obra, Material, Medio ambiente y Medición.',
    realWorldExample:
      'Analizar por qué las etiquetas de empaque salen torcidas revisando si es la pega (Material), el operario (Mano de obra), el calor (Medio ambiente) o el rodillo (Máquina).',
    nexusModule: {
      label: 'Diseñar en Proyectos A3',
      path: '/a3',
    },
  },
  {
    id: '5w2h',
    term: 'Plan de Acción 5W2H',
    originalTerm: '7 Preguntas Clave',
    pronunciation: 'What, Why, Where, When, Who, How, How Much',
    category: 'resolucion',
    categoryLabel: 'Solución de Problemas',
    tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
    shortSummary: 'El plan de acción más claro del mundo.',
    simpleExplanation:
      'Elimina cualquier duda en una tarea respondiendo: 1. ¿Qué se hará?, 2. ¿Por qué?, 3. ¿Dónde?, 4. ¿Cuándo?, 5. ¿Quién es responsable?, 6. ¿Cómo se hará?, y 7. ¿Cuánto costará?.',
    realWorldExample:
      'En vez de decir "hay que ordenar el andén 2", el 5W2H dice: Qué: Delimitar líneas amarillas. Quién: Alexis. Cuándo: Viernes 15. Cómo: Con pintura de secado rápido. Costo: $40.000.',
    nexusModule: {
      label: 'Crear en Planes 5W2H',
      path: '/a3',
    },
  },
  {
    id: 'takt-time',
    term: 'Takt Time',
    originalTerm: 'Del alemán Takt (Compás/Ritmo musical)',
    pronunciation: 'Takt-Taim',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-200',
    shortSummary: 'El latido del corazón de la operación marcado por el cliente.',
    simpleExplanation:
      'Es el tiempo exacto en que debe salir cada producto para cumplir con los pedidos del día, ni más rápido (evita sobreproducción) ni más lento (evita atrasos).',
    realWorldExample:
      'Si tienes 480 minutos de turno y tus clientes te piden 240 pedidos hoy, tu Takt Time es exactamente 2 minutos por pedido.',
  },
  {
    id: 'lead-time',
    term: 'Lead Time (Tiempo de Entrega)',
    originalTerm: 'Tiempo de Flujo Total',
    pronunciation: 'Lid-Taim',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    shortSummary: 'El tiempo total desde que el cliente pide hasta que lo recibe.',
    simpleExplanation:
      'Todo el reloj corriendo: incluye el tiempo de tomar la orden, comprar insumos, procesar, empacar, cargar y transportar.',
    realWorldExample:
      'Pides una pizza a domicilio a las 8:00 pm y llega a las 8:35 pm. El Lead Time fue de 35 minutos.',
  },
  {
    id: 'smed',
    term: 'SMED (Single Minute Exchange of Die)',
    originalTerm: 'Cambio rápido en menos de 10 minutos',
    pronunciation: 'S-M-E-D',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-violet-100 text-violet-800 border-violet-200',
    shortSummary: 'Cambiar de un modelo o formato a otro a la velocidad de la Fórmula 1.',
    simpleExplanation:
      'Técnica para reducir a minutos el tiempo que toma cambiar moldes, cuchillas o configuraciones de máquinas, separando tareas que se pueden preparar mientras la máquina aún está funcionando.',
    realWorldExample:
      'Los mecánicos de Fórmula 1 cambian 4 neumáticos en 2.2 segundos porque todas las herramientas y ruedas ya están listas antes de que el auto se detenga.',
  },
  {
    id: 'quick-win',
    term: 'Quick Win (Victoria Rápida)',
    originalTerm: 'Mejora Rápida',
    pronunciation: 'Quik-Uin',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    shortSummary: 'Solución inmediata, de bajo costo y alto impacto práctico.',
    simpleExplanation:
      'Mejoras que no requieren aprobación de comités ni compras millonarias; se implementan en 24 a 48 horas con el ingenio del equipo.',
    realWorldExample:
      'Colocar un gancho para que los cables de las transpaletas no se pisen con las ruedas y no se corten.',
    nexusModule: {
      label: 'Ver Módulo Quick Wins',
      path: '/quick-wins',
    },
  },
  {
    id: 'kamishibai',
    term: 'Kamishibai',
    originalTerm: '紙芝居',
    pronunciation: 'Tablero de tarjetas de control diario',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    shortSummary: 'Tablero visual de auditorías diarias de 3 minutos.',
    simpleExplanation:
      'Un tablero con tarjetas de dos caras (rojo/verde). El supervisor toma una tarjeta al azar al día, revisa 3 puntos clave en terreno y la voltea a verde si cumple. Es simple, rápido y transparente.',
    realWorldExample:
      'Revisar si los extintores están despejados y si la estación de pesaje está calibrada antes de arrancar el turno.',
    nexusModule: {
      label: 'Auditorías 5S',
      path: '/auditorias-5s',
    },
  },
  {
    id: 'muri-mura',
    term: 'Muri y Mura',
    originalTerm: '無理 & 斑',
    pronunciation: 'Sobrecarga y Desbalance',
    category: 'desperdicios',
    categoryLabel: 'Desperdicios (Muda)',
    tagColor: 'bg-pink-100 text-pink-800 border-pink-200',
    shortSummary: 'Los dos primos hermanos del desperdicio (Muda).',
    simpleExplanation:
      'Muri es la sobrecarga física o mental extrema (pedirle a una grúa o persona levantar el doble de su capacidad). Mura es la variabilidad o irregularidad (un día trabajar 14 horas alocados y al día siguiente no tener nada que hacer).',
    realWorldExample:
      'Operar con camiones sobrecargados que rompen la suspensión (Muri) debido a que todos los pedidos se concentran solo los viernes (Mura).',
  },
  {
    id: 'jidoka',
    term: 'Jidoka (Autonomatización)',
    originalTerm: '自働化',
    pronunciation: 'Ji-dō-ka (Automatización con toque humano)',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    shortSummary: 'Parada automática inmediata ante anomalías para no pasar defectos aguas abajo.',
    simpleExplanation:
      'En lugar de tener a una persona vigilando una máquina todo el turno por si falla, la máquina se detiene sola apenas detecta una irregularidad o defecto. Esto separa el trabajo humano de la máquina y previene fabricar chatarra.',
    realWorldExample:
      'Como una impresora que frena al instante si el papel se traba y avisa con una luz, o una envasadora que se detiene sola si una botella viene sin tapa.',
  },
  {
    id: 'heijunka',
    term: 'Heijunka (Nivelación de Producción)',
    originalTerm: '平準化',
    pronunciation: 'Hei-jun-ka (Nivelar volumen y mezcla)',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shortSummary: 'Nivelar la producción en volumen y variedad para eliminar picos de estrés y valles de ocio.',
    simpleExplanation:
      'En vez de producir lotes gigantes de un solo producto (ej: hacer 1.000 unidades del Producto A el lunes y nada del Producto B hasta el viernes), se programa una secuencia balanceada diaria según la demanda real del cliente (ej: A-B-A-B). Esto evita saturar bodegas y elimina el desbalance (Mura).',
    realWorldExample:
      'Una panadería que hornea tandas pequeñas y variadas a lo largo de la mañana en vez de hornear 500 marraquetas a las 6 AM y dejar enfriar el pan el resto del día.',
  },
  {
    id: 'hoshin-kanri',
    term: 'Hoshin Kanri (Despliegue Estratégico)',
    originalTerm: '方針管理',
    pronunciation: 'Hō-shin Kan-ri (Brújula estratégica)',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
    shortSummary: 'Alinear los objetivos estratégicos de la gerencia con el trabajo diario de cada equipo en terreno.',
    simpleExplanation:
      'Metodología para asegurar que las metas de la compañía no queden guardadas en un cajón. Mediante un diálogo constante de ida y vuelta ("Catchball"), cada nivel de la organización define sus propios proyectos y métricas para empujar exactamente en la misma dirección.',
    realWorldExample:
      'Si la meta anual de la gerencia es "cero accidentes", en la bodega se traduce en "100% de inspección diaria de grúas y pasillos despejados con 5S".',
    nexusModule: {
      label: 'Alinear en Proyectos A3',
      path: '/a3',
    },
  },
  {
    id: 'obeya',
    term: 'Obeya (Gran Sala de Gestión / War Room)',
    originalTerm: '大部屋',
    pronunciation: 'O-be-ya (Habitación grande de control)',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
    shortSummary: 'Espacio físico o virtual donde los líderes gestionan proyectos a la vista con tableros interactivos.',
    simpleExplanation:
      'Una sala de control cuyas paredes están repletas de gráficos de avance, indicadores visuales, cuellos de botella y planes de acción. En lugar de informes de 50 páginas, el equipo se junta 15 minutos de pie frente a la pared y toma decisiones rápidas y coordinadas.',
    realWorldExample:
      'El equipo de mantenimiento, operaciones y logística reunido todas las mañanas durante 10 minutos frente al tablero de planta para destrabar los pedidos críticos de la jornada.',
    nexusModule: {
      label: 'Ver Panel Dashboard',
      path: '/dashboard',
    },
  },
  {
    id: 'standardized-work',
    term: 'Trabajo Estandarizado (Standardized Work)',
    originalTerm: '標準作業',
    pronunciation: 'Hyō-jun Sa-gyō',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    shortSummary: 'La mejor forma conocida y acordada hoy para realizar una tarea con seguridad y eficiencia.',
    simpleExplanation:
      'Documenta la secuencia exacta de pasos, el tiempo asignado y el stock necesario para hacer un trabajo. No busca convertir a la gente en robots, sino establecer una línea base confiable; sin un estándar claro, es imposible saber si una mejora realmente funcionó.',
    realWorldExample:
      'El manual con fotos y pasos claros de cómo armar un pallet de exportación para que no se desarme en el viaje, garantizando que el operario novato y el experto lo hagan con idéntica calidad.',
    nexusModule: {
      label: 'Auditar Estándares 5S',
      path: '/auditorias-5s',
    },
  },
  {
    id: 'one-piece-flow',
    term: 'Flujo de Una Sola Pieza (One-Piece Flow)',
    originalTerm: '1個流し',
    pronunciation: 'Ikko-nagashi (Flujo continuo pieza a pieza)',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    shortSummary: 'Mover el producto unidad a unidad entre estaciones sin acumular lotes ni esperas intermedias.',
    simpleExplanation:
      'En vez de esperar a llenar un pallet con 200 cajas para moverlo a la siguiente estación (procesamiento por lotes), se procesa y transfiere una sola unidad a la vez. Reduce los tiempos de espera a una fracción y detecta cualquier falla de calidad inmediatamente.',
    realWorldExample:
      'Envoltorio de paquetes: doblar el papel, pegar la cinta y colocar el lazo a un paquete antes de empezar el siguiente, en vez de cortar 50 papeles y recién al final notar que el tamaño estaba equivocado.',
    nexusModule: {
      label: 'Mapear Flujo en VSM',
      path: '/vsm',
    },
  },
  {
    id: 'pull-system',
    term: 'Sistema Pull (Flujo de Arrastre)',
    originalTerm: 'Pull Production System',
    pronunciation: 'Sistema de arrastre según demanda',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
    shortSummary: 'Producir o mover materiales únicamente cuando la etapa siguiente o el cliente lo solicita.',
    simpleExplanation:
      'Lo contrario a empujar (Push) producción basada en pronósticos inciertos. En un sistema Pull, ningún puesto de trabajo procesa nada hasta que el cliente aguas abajo consume una unidad y envía una señal visual (Kanban). Esto erradica el exceso de inventario.',
    realWorldExample:
      'Un restaurante a la carta: el cocinero solo prepara el plato cuando el cliente pide la orden, en lugar de freír 30 porciones a las 2 PM esperando a ver si alguien llega.',
  },
  {
    id: 'supermarket',
    term: 'Supermercado Lean (Buffer Regulado)',
    originalTerm: 'Supermarket Pull System',
    pronunciation: 'Su-per-mar-ket',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
    shortSummary: 'Ubicación física intermedia con stock limitado y controlado que abastece un flujo Pull.',
    simpleExplanation:
      'Un área de almacenamiento dimensionada con niveles mínimos y máximos visibles. Cuando el proceso que sigue retira insumos, el proceso que provee recibe de inmediato la orden de reponer exactamente lo retirado, manteniendo el equilibrio del inventario.',
    realWorldExample:
      'Un dispensador de vasos de café: sacas un vaso por abajo y el resorte baja el siguiente; cuando quedan pocos en el tubo transparente, se repone exactamente la cantidad que falta.',
  },
  {
    id: 'genchi-genbutsu',
    term: 'Genchi Genbutsu (Ir a la Fuente)',
    originalTerm: '現地現物',
    pronunciation: 'Gen-chi Gen-but-su (Sitio real, cosas reales)',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    shortSummary: 'Comprobar la realidad de los hechos directamente con tus propios ojos, no por rumores ni planillas.',
    simpleExplanation:
      'Principio fundamental de Toyota: antes de proponer una solución o juzgar un atraso, el líder debe ir físicamente al lugar del evento, tocar el material, observar el proceso y hablar con los operarios que viven la situación.',
    realWorldExample:
      'Si un cliente dice que las cajas llegan golpeadas, el jefe de operaciones va al andén a cargar camiones él mismo para verificar cómo vibran los bultos en el flete.',
    nexusModule: {
      label: 'Realizar Gemba Walk',
      path: '/gemba',
    },
  },
  {
    id: 'yokoten',
    term: 'Yokoten (Despliegue Horizontal)',
    originalTerm: '横展開',
    pronunciation: 'Yo-ko-ten (Compartir lateralmente)',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-violet-100 text-violet-800 border-violet-200',
    shortSummary: 'Compartir y replicar las mejoras exitosas de un equipo a todas las demás áreas de la empresa.',
    simpleExplanation:
      'Evitar que cada área invente la rueda por separado. Cuando una línea encuentra una solución brillante a un problema, Yokoten significa documentarla y transmitirla a los otros turnos y plantas para que todos se beneficien al instante.',
    realWorldExample:
      'El andén 1 implementó un tope de goma que evita que las transpaletas rayen las puertas; mediante Yokoten, los andenes 2, 3 y 4 colocan el mismo tope esa misma semana.',
    nexusModule: {
      label: 'Replicar en Quick Wins',
      path: '/quick-wins',
    },
  },
  {
    id: 'hansei',
    term: 'Hansei (Autorreflexión y Aprendizaje)',
    originalTerm: '反省',
    pronunciation: 'Han-sei (Autocrítica constructiva)',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-200',
    shortSummary: 'Reconocer honestamente las fallas y oportunidades de mejora, incluso tras un proyecto exitoso.',
    simpleExplanation:
      'No es para deprimirse ni buscar culpables, sino para extraer sabiduría. Consiste en detenerse a reflexionar: "¿Qué no salió como esperábamos? ¿Qué haríamos distinto la próxima vez?". Sin Hansei no hay verdadero Kaizen.',
    realWorldExample:
      'Tras despachar a tiempo el pedido más grande del año, el equipo se reúne 15 minutos para analizar por qué tuvieron que hacer horas extras a última hora y qué mejorar para la próxima campaña.',
    nexusModule: {
      label: 'Cierre y Lecciones en A3',
      path: '/a3',
    },
  },
  {
    id: 'nemawashi',
    term: 'Nemawashi (Construcción de Consenso)',
    originalTerm: '根回し',
    pronunciation: 'Ne-ma-wa-shi (Preparar las raíces antes de trasplantar)',
    category: 'filosofia',
    categoryLabel: 'Filosofía & Cultura',
    tagColor: 'bg-teal-100 text-teal-800 border-teal-200',
    shortSummary: 'Alinear y consultar previamente a las personas clave antes de presentar un cambio oficial.',
    simpleExplanation:
      'Proviene de la botánica japonesa: antes de trasplantar un árbol, se cuidan y preparan sus raíces individualmente para que no muera. En las empresas, antes de implementar una nueva regla o software, se conversa uno a uno con los involucrados para escuchar sus dudas y enriquecer la propuesta.',
    realWorldExample:
      'Antes de modificar el sistema de rotación de turnos, el supervisor comparte un café con los delegados de cada turno para recoger sugerencias antes de la votación formal.',
  },
  {
    id: 'visual-management',
    term: 'Gestión Visual (Mieruka)',
    originalTerm: '見える化',
    pronunciation: 'Mie-ru-ka (Hacer visible el estado)',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    shortSummary: 'Hacer que cualquier desviación o estado operativo sea visible en menos de 5 segundos.',
    simpleExplanation:
      'Utilizar colores, sombras de herramientas, marcas en el piso, luces y letreros claros para que cualquiera distinga lo normal de lo anormal a simple vista, sin necesidad de preguntar ni consultar un sistema computacional.',
    realWorldExample:
      'Pintar franjas verdes y rojas en los manómetros de presión de una compresora para saber a 10 metros si la presión de aire está en el rango seguro.',
    nexusModule: {
      label: 'Módulo Tarjetas 5S',
      path: '/5s',
    },
  },
  {
    id: 'spaghetti-diagram',
    term: 'Diagrama de Espagueti (Spaghetti Chart)',
    originalTerm: 'Diagrama de Recorridos',
    pronunciation: 'Spa-ghet-ti Char-t',
    category: 'herramientas',
    categoryLabel: 'Herramientas de Terreno',
    tagColor: 'bg-orange-100 text-orange-800 border-orange-200',
    shortSummary: 'Plano gráfico que dibuja las rutas físicas de personas o materiales para evidenciar traslados inútiles.',
    simpleExplanation:
      'Se trazan sobre el plano del taller o bodega las líneas de movimiento de un operario durante su jornada. El resultado parece un plato de fideos enredados (espagueti), demostrando cuánto camina la persona innecesariamente por un mal diseño del espacio.',
    realWorldExample:
      'Descubrir en el plano que un preparador camina 8 kilómetros al día solo porque los rollos de film plástico están guardados al final del pasillo 5 en vez de su mesón de embalaje.',
    nexusModule: {
      label: 'Mapear Layout en VSM',
      path: '/vsm',
    },
  },
  {
    id: 'mizusumashi',
    term: 'Mizusumashi / Water Spider (Repartidor Logístico)',
    originalTerm: '水すまし',
    pronunciation: 'Mi-zu-su-ma-shi (Escarabajo acuático)',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-sky-100 text-sky-800 border-sky-200',
    shortSummary: 'Operador móvil dedicado a abastecer piezas e insumos para que los operarios no dejen su puesto.',
    simpleExplanation:
      'Una persona experimentada que recorre una ruta fija en la planta recogiendo productos terminados y entregando materias primas justo a tiempo. Así, los operadores de las estaciones se concentran al 100% en las tareas que agregan valor.',
    realWorldExample:
      'En una línea de montaje, el repartidor pasa cada 15 minutos con un carrito recargando tornillos y cajas vacías, evitando que los operarios apaguen su máquina para ir a la bodega central.',
  },
  {
    id: 'chaku-chaku',
    term: 'Chaku-Chaku (Cargar y Cargar)',
    originalTerm: '着々',
    pronunciation: 'Cha-ku Cha-ku (Carga continua)',
    category: 'flujo',
    categoryLabel: 'Flujo & Productividad',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shortSummary: 'Célula donde las máquinas expulsan las piezas automáticamente para que el operario solo cargue y avance.',
    simpleExplanation:
      'Formato de línea en célula donde cada máquina termina su ciclo y eyecta el producto sola (gracias a Jidoka). El operador toma la pieza con una mano, la carga en la siguiente máquina, la arranca y avanza a la siguiente sin esperar tiempos muertos.',
    realWorldExample:
      'Una cortadora de perfiles donde el operario solo inserta la barra; la máquina corta a la medida y eyecta el tubo cortado por una rampa hacia la siguiente estación sin intervención humana.',
  },
];

export const WASTES_LIST: WasteItem[] = [
  {
    id: 'transporte',
    code: 'T',
    name: 'Transporte Innecesario',
    englishName: 'Transport',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    definition: 'Mover materiales, pallets o documentos de un lugar a otro sin que eso transforme el producto.',
    warningSigns: [
      'Pallets que se mueven a una bodega intermedia y luego vuelven.',
      'Transpaletas recorriendo kilómetros vacías o con carga repetida.',
      'Documentos físicos viajando entre oficinas para firmas.',
    ],
    realExample: 'Descargar mercadería en el pasillo central para luego moverla al rack 4 y al día siguiente al andén 1.',
    howToEliminate: 'Acercar las etapas consecutivas, rediseñar el layout de planta o zonificar por rotación ABC.',
    recommendedNexusTool: {
      name: 'Mapear en VSM',
      path: '/vsm',
    },
  },
  {
    id: 'inventario',
    code: 'I',
    name: 'Exceso de Inventario',
    englishName: 'Inventory',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    definition: 'Tener más stock de materias primas, insumos o productos terminados de los que se necesitan hoy.',
    warningSigns: [
      'Bodegas colapsadas y pasillos bloqueados con pallets "por si acaso".',
      'Productos vencidos o dañados en el fondo de las estanterías.',
      'Dinero inmovilizado que la empresa no puede usar.',
    ],
    realExample: 'Comprar cajas para 6 meses por un descuento por volumen, dejando sin espacio al personal para operar.',
    howToEliminate: 'Implementar tarjetas Kanban y coordinar entregas más frecuentes con proveedores.',
    recommendedNexusTool: {
      name: 'Tarjeta 5S (Seiri/Despeje)',
      path: '/5s',
    },
  },
  {
    id: 'movimiento',
    code: 'M',
    name: 'Movimientos Innecesarios',
    englishName: 'Motion',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    definition: 'Esfuerzo físico, agachadas, estiradas o pasos de más que da el operario debido al mal diseño del puesto.',
    warningSigns: [
      'Operarios agachándose continuamente al suelo a levantar cajas.',
      'Caminar 15 pasos cada vez que se necesita una cinta de embalaje.',
      'Fatiga muscular excesiva al final de la jornada.',
    ],
    realExample: 'Tener que darse vuelta 180° cada vez que se coloca un sticker en una caja de despacho.',
    howToEliminate: 'Aplicar ergonomía, 5S en la mesa de trabajo y colocar las herramientas en el radio de alcance de los brazos.',
    recommendedNexusTool: {
      name: 'Registrar Quick Win Ergonómico',
      path: '/quick-wins',
    },
  },
  {
    id: 'esperas',
    code: 'W',
    name: 'Esperas y Tiempos Muertos',
    englishName: 'Waiting',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    definition: 'Gente esperando materiales o máquinas, o materiales esperando a que alguien los procese.',
    warningSigns: [
      'Operarios parados esperando a que el sistema ERP cargue.',
      'Camiones haciendo fila en el portón esperando la guía de despacho.',
      'Máquinas detenidas esperando que llegue el mecánico.',
    ],
    realExample: 'El preparador de pedidos se queda sentado 20 minutos esperando a que la grúa horquilla baje el pallet del rack alto.',
    howToEliminate: 'Sincronizar turnos, utilizar mantenimiento autónomo y estandarizar la entrega de materiales.',
    recommendedNexusTool: {
      name: 'Proyecto A3 de Lead Time',
      path: '/a3',
    },
  },
  {
    id: 'sobreproduccion',
    code: 'O',
    name: 'Sobreproducción',
    englishName: 'Overproduction',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    definition: 'Fabricar o preparar pedidos antes de tiempo o en mayor cantidad de la solicitada. Es el peor de todos.',
    warningSigns: [
      'Producir para tener ocupada a la gente aunque no haya pedidos.',
      'Montañas de producto terminado esperando camiones.',
      'Esconde todos los demás problemas de calidad y mantenimiento.',
    ],
    realExample: 'Armar 500 cajas de un producto cuando el cliente solo pidió 200 hoy, obligando a buscar dónde guardar las 300 restantes.',
    howToEliminate: 'Trabajar bajo demanda real del cliente (Pull) respetando el Takt Time.',
    recommendedNexusTool: {
      name: 'Analizar Flujo en VSM',
      path: '/vsm',
    },
  },
  {
    id: 'sobreprocesamiento',
    code: 'O',
    name: 'Sobreprocesamiento',
    englishName: 'Overprocessing',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    definition: 'Hacer más trabajo, comprobaciones o acabados de los que el cliente necesita o está dispuesto a pagar.',
    warningSigns: [
      'Pedir 4 firmas de jefaturas para autorizar una compra menor.',
      'Ingresar los mismos datos en una planilla Excel y luego en el ERP.',
      'Envolver un producto con 5 capas de plástico cuando con 2 es seguro.',
    ],
    realExample: 'Revisar manualmente 3 veces la misma factura en 3 escritorios distintos.',
    howToEliminate: 'Preguntar siempre: "¿El cliente valora este paso extra?". Simplificar y digitalizar formularios.',
    recommendedNexusTool: {
      name: 'Solución en Quick Wins',
      path: '/quick-wins',
    },
  },
  {
    id: 'defectos',
    code: 'D',
    name: 'Defectos y Retrabajos',
    englishName: 'Defects',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    definition: 'Errores, roturas o equivocaciones que obligan a botar o corregir lo que ya se hizo.',
    warningSigns: [
      'Pallets rechazados por clientes por productos golpeados o mal etiquetados.',
      'Zonas de "reacondicionamiento" llenas de cajas abiertas.',
      'Reclamos repetitivos por pedidos incompletos.',
    ],
    realExample: 'Enviar un pallet a Concepción cuando era para La Serena porque el código de barras estaba borroso.',
    howToEliminate: 'Implementar Poka-Yoke (a prueba de fallas), control visual y análisis de causa raíz en Proyectos A3.',
    recommendedNexusTool: {
      name: 'Proyecto A3 Causa Raíz',
      path: '/a3',
    },
  },
  {
    id: 'talento',
    code: 'S',
    name: 'Talento No Aprovechado',
    englishName: 'Skills / Non-utilized Talent',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    definition: 'No escuchar las ideas, experiencia y creatividad de las personas que operan el proceso día a día.',
    warningSigns: [
      'Jefaturas que deciden todo sin consultar al operador.',
      'Gente desmotivada que dice "aquí no se puede cambiar nada".',
      'Problemas crónicos conocidos por todos que nadie levanta.',
    ],
    realExample: 'Un operario sabe hace meses cómo evitar que una máquina se atasque, pero nadie le ha preguntado.',
    howToEliminate: 'Cultura Gemba: ir a terreno, escuchar activamente y empoderar con Quick Wins para probar sus ideas.',
    recommendedNexusTool: {
      name: 'Proponer Idea en Quick Wins',
      path: '/quick-wins',
    },
  },
];

export const TOOLS_GUIDE: ToolGuideItem[] = [
  {
    id: 'tool-5s',
    problemSituation: 'Mi área de trabajo está desordenada, sucia, hay cables sueltos o perdemos tiempo buscando herramientas.',
    indicator: 'Desorden, suciedad, riesgo de seguridad o falta de estándar visual',
    toolName: 'Tarjetas 5S',
    subtitle: 'Clasificar, Ordenar, Limpiar, Estandarizar y Disciplina',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    explanation: 'Levanta una tarjeta roja o amarilla 5S con foto del problema, asigna un responsable y plazo de solución.',
    nexusPath: '/5s',
    nexusActionLabel: 'Abrir Módulo 5S',
    practicalExample: 'Cajas botadas en el pasillo que bloquean el paso de la transpaleta.',
  },
  {
    id: 'tool-quick-wins',
    problemSituation: 'Tengo una idea genial, simple y barata que soluciona un dolor de cabeza en menos de 48 horas.',
    indicator: 'Solución rápida, bajo costo y acción inmediata',
    toolName: 'Quick Wins',
    subtitle: 'Victorias Rápidas de Mejora Continua',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    explanation: 'Registra la idea con el antes y después. Si tiene impacto alto y poco esfuerzo, ¡ejecútala de inmediato!',
    nexusPath: '/quick-wins',
    nexusActionLabel: 'Abrir Quick Wins',
    practicalExample: 'Instalar un soporte para lector de código de barras en el andén para evitar que se caiga.',
  },
  {
    id: 'tool-a3',
    problemSituation: 'Tenemos un problema grave, recurrente o costoso y nadie sabe con certeza por qué ocurre.',
    indicator: 'Problema complejo, mermas altas o reclamos de clientes',
    toolName: 'Proyectos A3',
    subtitle: 'Resolución Estructurada de Problemas Toyota',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    explanation: 'Guía paso a paso: Diagnóstico, Ishikawa (Causa-Efecto), 5 Porqués y Plan de Acción 5W2H con metas.',
    nexusPath: '/a3',
    nexusActionLabel: 'Abrir Proyectos A3',
    practicalExample: 'El 15% de los despachos a regiones llegan atrasados hace 3 meses.',
  },
  {
    id: 'tool-vsm',
    problemSituation: 'El proceso completo se siente lento, los pedidos se estancan y no sabemos en qué etapa se pierde el tiempo.',
    indicator: 'Lead Time largo, cuellos de botella y exceso de inventario',
    toolName: 'Mapeo de Procesos (VSM)',
    subtitle: 'Value Stream Mapping (Cadena de Valor)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    explanation: 'Dibuja todo el flujo de materiales e información para ver dónde se agrega valor y dónde hay desperdicio.',
    nexusPath: '/vsm',
    nexusActionLabel: 'Abrir Mapeo VSM',
    practicalExample: 'Desde que entra la orden hasta que sale el camión pasan 3 días cuando el trabajo real son 4 horas.',
  },
  {
    id: 'tool-gemba',
    problemSituation: 'Queremos comprobar la realidad operativa directamente en terreno con respeto hacia las personas.',
    indicator: 'Rutina de liderazgo en terreno y escucha activa',
    toolName: 'Gemba Walk',
    subtitle: 'Caminata de Observación en Terreno',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    explanation: 'Anota hallazgos, conversa con los operarios y captura oportunidades de mejora en el punto de trabajo.',
    nexusPath: '/gemba',
    nexusActionLabel: 'Iniciar Gemba Walk',
    practicalExample: 'El jefe de operaciones camina por la zona de picking durante la hora peak para entender las trabas reales.',
  },
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    question: '¿Qué significa la palabra japonesa "Gemba" en la metodología Lean?',
    options: [
      'Una reunión urgente de gerencia en la sala de juntas.',
      'El lugar real donde ocurren las cosas y se genera el valor.',
      'Un software para calcular tiempos de producción.',
      'Un castigo para el operario que comete un error.',
    ],
    correctIndex: 1,
    explanation: '¡Exacto! Gemba es el terreno físico (el taller, bodega, andén o tienda). En Lean siempre se va al Gemba para ver la realidad con respeto.',
    difficulty: 'fácil',
  },
  {
    id: 2,
    question: '¿Cuál es el propósito fundamental de aplicar las 5S en una bodega o taller?',
    options: [
      'Que el lugar se vea bonito cuando vengan visitas o auditorías.',
      'Crear un entorno seguro, ordenado y visual donde cualquier anomalía se note al instante.',
      'Hacer que los operarios limpien todo el día en vez de trabajar.',
      'Reducir personal botando todo lo viejo.',
    ],
    correctIndex: 1,
    explanation: '¡Correcto! 5S no es solo aseo: es gestión visual para que si falta una herramienta o hay una fuga, se detecte en segundos.',
    difficulty: 'fácil',
  },
  {
    id: 3,
    question: '¿Cuál de los siguientes es considerado el peor de los 8 desperdicios (Muda)?',
    options: [
      'Sobreproducción (fabricar más o antes de tiempo).',
      'Tener el piso sucio.',
      'Mover una herramienta 2 metros.',
      'Pintar una pared de color amarillo.',
    ],
    correctIndex: 0,
    explanation: '¡Muy bien! La sobreproducción es el peor desperdicio porque genera inventario excesivo, consume transporte, ocupa espacio y esconde los defectos.',
    difficulty: 'medio',
  },
  {
    id: 4,
    question: '¿Qué es un "Poka-Yoke"?',
    options: [
      'Un tipo de comida japonesa para celebrar metas.',
      'Un mecanismo diseñado para que sea físicamente imposible cometer un error involuntario.',
      'Una planilla donde se anotan las faltas del personal.',
      'Un sistema para acelerar las máquinas al máximo.',
    ],
    correctIndex: 1,
    explanation: '¡Excelente! Como el conector USB o la tarjeta SIM que solo encajan en una posición. Diseña el proceso para proteger a las personas de equivocarse.',
    difficulty: 'fácil',
  },
  {
    id: 5,
    question: 'Si en tu área tienes un problema que ocurre todas las semanas y cuesta millones, ¿qué herramienta de Nexus es la más adecuada?',
    options: [
      'Poner una cinta adhesiva rápida.',
      'Ignorarlo hasta fin de año.',
      'Abrir un Proyecto A3 para investigar la causa raíz con 5 Porqués e Ishikawa.',
      'Pedirle a la gente que trabaje el doble de rápido.',
    ],
    correctIndex: 2,
    explanation: '¡Perfecto! Los problemas crónicos y de alto impacto requieren el método científico del Reporte A3 para atacar la causa de raíz.',
    difficulty: 'fácil',
  },
  {
    id: 6,
    question: '¿Qué diferencia a un "Quick Win" de un proyecto tradicional?',
    options: [
      'Un Quick Win es de bajo costo, alta factibilidad y se ejecuta en menos de 48 horas sin burocracia.',
      'Un Quick Win requiere permiso del directorio general.',
      'Un Quick Win es solo para gerentes.',
      'Un Quick Win dura mínimo 6 meses.',
    ],
    correctIndex: 0,
    explanation: '¡Así es! Las victorias rápidas (Quick Wins) empoderan a las personas para arreglar pequeñas piedras en el zapato de forma inmediata.',
    difficulty: 'fácil',
  },
  {
    id: 7,
    question: '¿Para qué sirve la técnica de "Los 5 Porqués"?',
    options: [
      'Para culpar a 5 personas distintas por el mismo error.',
      'Para profundizar más allá del síntoma y descubrir la causa raíz de un problema.',
      'Para redactar un informe de 5 páginas.',
      'Para justificar un aumento de presupuesto.',
    ],
    correctIndex: 1,
    explanation: '¡Correcto! Preguntar "¿Por qué?" sucesivamente permite descubrir el fallo en el proceso o estándar, no en la persona.',
    difficulty: 'fácil',
  },
  {
    id: 8,
    question: '¿Qué describe el concepto Lean de "Jidoka" (Autonomatización)?',
    options: [
      'Reemplazar a todos los trabajadores por robots industriales.',
      'Detener automáticamente el proceso o máquina apenas se detecta una anomalía o defecto.',
      'Trabajar el doble de rápido para compensar los retrasos.',
      'Comprar maquinaria importada cada año.',
    ],
    correctIndex: 1,
    explanation: '¡Excelente! Jidoka dota a las máquinas y personas del poder de detener la línea ante un defecto para nunca enviar productos defectuosos al siguiente paso.',
    difficulty: 'medio',
  },
  {
    id: 9,
    question: '¿Cuál es el objetivo principal de aplicar "Heijunka"?',
    options: [
      'Nivelar y suavizar la producción en volumen y mezcla para evitar la sobrecarga y los tiempos muertos.',
      'Pintar las paredes de color verde para mejorar el estado de ánimo.',
      'Despedir al personal de bodega.',
      'Acumular la mayor cantidad de inventario posible en los pasillos.',
    ],
    correctIndex: 0,
    explanation: '¡Correcto! Heijunka equilibra la producción diaria según la demanda del cliente, eliminando el estrés de las olas de trabajo y los valles de ocio (Mura).',
    difficulty: 'medio',
  },
  {
    id: 10,
    question: 'Cuando un turno inventa una mejora excelente y la comparte con todas las demás líneas de la empresa, ¿qué principio Lean se está viviendo?',
    options: [
      'Muda (Desperdicio).',
      'Yokoten (Despliegue horizontal de buenas prácticas).',
      'Poka-Yoke (A prueba de errores).',
      'Takt Time (Ritmo de cliente).',
    ],
    correctIndex: 1,
    explanation: '¡Brillante! Yokoten es la práctica japonesa de difundir el conocimiento y las soluciones de un equipo a toda la organización para multiplicar los beneficios.',
    difficulty: 'fácil',
  },
];
