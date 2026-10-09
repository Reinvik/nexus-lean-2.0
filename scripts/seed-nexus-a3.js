import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1enBnbGpqZmVvYnhscHRtc21hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc2Njc0MCwiZXhwIjoyMDgyMzQyNzQwfQ.HoelddG65nqo7fqJE1xFvYfmu0kCu2yNq6Zr3itlZiw';
const COMPANY_ID = '3d43353d-ed20-4626-8742-dca4f1d17757'; // Nexus

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const defaultPlansMeta = [
  { id: 'main', name: 'Plan Principal (5W2H)', description: 'Plan de acción para erradicar la causa raíz', isDefault: true, color: 'brand' },
  { id: 'containment', name: 'Plan de Contención', description: 'Acciones provisionales de contingencia operativa', isDefault: false, color: 'amber' },
  { id: 'standardization', name: 'Plan de Estandarización', description: 'Auditorías, POEs y aseguramiento de la sostenibilidad', isDefault: false, color: 'indigo' },
];

async function seed() {
  console.log('Seeding A3 mockup data for Nexus...');

  // 1. Proyecto 1: Lead Time en Despacho (Update 5842db0d-9897-445c-ba6e-d8c828a14743)
  const project1 = {
    id: '5842db0d-9897-445c-ba6e-d8c828a14743',
    company_id: COMPANY_ID,
    title: 'Optimización de Lead Time y Flujo de Despacho en Centro Logístico',
    status: 'En Proceso',
    responsible: 'Alexis Inzunza Vergara',
    date: '2026-09-15',
    background: '<p>En el último trimestre, los tiempos de ciclo en despacho promediaron <strong>14.5 horas</strong> contra el SLA objetivo de <strong>4 horas</strong>. Esta desviación provoca demoras recurrentes en entregas a clientes B2B clave, sobrecostos de flete expreso de urgencia (\$4.200.000 CLP/mes) y saturación física en los andenes de salida.</p>',
    current_condition: '<p>El mapeo de flujo de valor (VSM) actual revela que el <strong>68% del tiempo total</strong> corresponde a desperdicios (Muda): demoras por validación manual de pedidos en ERP y traslados innecesarios por falta de zonificación ABC en bodega. El indicador de cumplimiento On-Time In-Full (OTIF) actual es de apenas <strong>72.4%</strong>.</p>',
    goal: 'Reducir el Lead Time de despacho de 14.5 hrs a menos de 4.0 hrs y alcanzar un OTIF ≥ 98% antes del 30 de Noviembre de 2026 sin aumentar la dotación actual.',
    root_cause: 'Ausencia de preparación estandarizada por olas (picking zonificado) y desfase de datos en tiempo real entre el ERP y la operación física de bodega.',
    pareto_data: [
      { label: 'Espera por validación manual en ERP', value: 45 },
      { label: 'Búsqueda de SKUs sin señalética ABC', value: 30 },
      { label: 'Cuello de botella en filmado manual de pallets', value: 16 },
      { label: 'Discrepancias de inventario en picking', value: 10 },
      { label: 'Espera de camiones por congestión de andén', value: 6 },
    ],
    ishikawas: [
      {
        id: 1,
        problem: 'Demoras excesivas en despacho de pedidos (>14 hrs)',
        categories: {
          'Método': [
            'No existe picking por olas zonificado',
            'Validaciones redundantes en papel y en pantalla',
            'Falta de procedimiento operativo estándar (POE)'
          ],
          'Mano de Obra': [
            'Operadores nuevos sin inducción formal en radiofrecuencia',
            'Polivalencia insuficiente en horas pico de andén'
          ],
          'Maquinaria': [
            'Solo 2 transpaletas eléctricas operativas para 4 andenes',
            'Lentitud de conexión Wi-Fi en zona trasera de bodega'
          ],
          'Materiales': [
            'Cajas de embalaje con etiquetas poco legibles',
            'Desabastecimiento ocasional de film strech'
          ],
          'Medición': [
            'Lead time se medía una vez al mes a posteriori',
            'Sin indicador visual de avance por turno'
          ],
          'Medio Ambiente': [
            'Pasillos obstruidos por pallets de devolución pendientes'
          ]
        }
      }
    ],
    five_whys: [
      {
        id: 1,
        problem: '¿Por qué los despachos tardan 14.5 horas?',
        whys: [
          'Porque los pedidos quedan retenidos en la etapa de armado y consolidación.',
          'Porque los operadores recorren toda la bodega buscando productos dispersos.',
          'Porque no hay asignación de rutas ni zonificación ABC por rotación de productos.',
          'Porque los pedidos se imprimen por orden de llegada y no por lotes o familias lógicas.',
          'Porque el proceso logístico carecía de ingeniería de métodos y estandarización Lean.'
        ],
        rootCause: 'Falta de diseño de flujo continuo mediante picking por olas y falta de sincronización visual en piso de bodega.'
      }
    ],
    countermeasures: 'Implementación de picking por zonas con lectores de código de barras, reubicación de SKUs de alta rotación (ABC), y despliegue de tablero Andon de despacho.',
    execution_plan: 'Fase 1: Estandarización y reorganización física (Sep-Oct). Fase 2: Automatización digital y validación en ERP (Oct-Nov).',
    action_plans_meta: defaultPlansMeta,
    action_plan: [
      {
        id: 1001,
        planId: 'containment',
        what: 'Habilitar un andén preferente exclusivo para pedidos urgentes',
        why: 'Evitar sanciones contractuales inmediatas de clientes clave',
        who: 'Alexis Inzunza Vergara',
        when: '2026-09-20',
        where: 'Andén 1 - Centro de Distribución',
        how: 'Delimitación visual con conos amarillos y asignación de 1 transpaleta',
        howMuch: '$50.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 10011, title: 'Demarcar andén 1 con señalética temporal', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-18' },
          { id: 10012, title: 'Comunicar protocolo de urgencias a transportistas', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-09-20' }
        ]
      },
      {
        id: 1002,
        planId: 'main',
        what: 'Estandarizar el procedimiento operativo de picking por olas (POE-LOG-01)',
        why: 'Eliminar traslados innecesarios y ordenar secuencias de preparación',
        who: 'Alexis Inzunza Vergara',
        when: '2026-10-05',
        where: 'Bodega Central',
        how: 'Mapeo de recorrido óptimo en una página (One Point Lesson)',
        howMuch: '$120.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 10021, title: 'Levantar rutas actuales con los mejores preparadores', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-25' },
          { id: 10022, title: 'Redactar instructivo de trabajo estándar visual', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-30' },
          { id: 10023, title: 'Validar estándar con supervisor de operaciones', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-10-05' }
        ]
      },
      {
        id: 1003,
        planId: 'main',
        what: 'Reorganizar la zonificación ABC de bodega según rotación trimestral',
        why: 'Acercar los 50 SKUs con 80% de movimiento a los andenes de despacho',
        who: 'Vicente Osorio',
        when: '2026-10-15',
        where: 'Bodega Central - Racks A y B',
        how: 'Extracción de histórico de ventas y relocalización física de pallets',
        howMuch: '$350.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 10031, title: 'Calcular ranking de rotación ABC en Excel', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-10-08' },
          { id: 10032, title: 'Ejecutar traslados físicos de pallets durante el fin de semana', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-10-12' },
          { id: 10033, title: 'Actualizar ubicaciones en sistema ERP', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-14' }
        ]
      },
      {
        id: 1004,
        planId: 'main',
        what: 'Implementar lectores inalámbricos de código de barras con validación ERP',
        why: 'Eliminar el 100% de los errores de digitación y esperas de tipeo',
        who: 'Alejandro Oscar Ureta Perez',
        when: '2026-10-25',
        where: 'Muelle de Carga',
        how: 'Configurar 4 terminales portátiles conectados a la API de despacho',
        howMuch: '$1.450.000 CLP',
        status: 'in_progress',
        progress: 67,
        subtasks: [
          { id: 10041, title: 'Adquirir y configurar los 4 dispositivos portátiles', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-18' },
          { id: 10042, title: 'Programar endpoint de validación instantánea en ERP', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-22' },
          { id: 10043, title: 'Ejecutar prueba piloto con 50 pedidos reales', completed: false, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-10-25' }
        ]
      },
      {
        id: 1005,
        planId: 'main',
        what: 'Capacitar a los operarios en uso de terminales y protocolo Lean 5S',
        why: 'Asegurar la adherencia al estándar y velocidad en la operación',
        who: 'Equipo be lean',
        when: '2026-10-28',
        where: 'Sala de Capacitación & Terreno',
        how: 'Talleres prácticos de 30 minutos por turno de trabajo',
        howMuch: '$180.000 CLP',
        status: 'in_progress',
        progress: 50,
        subtasks: [
          { id: 10051, title: 'Realizar sesión práctica para Turno Mañana', completed: true, responsible: 'Equipo be lean', dueDate: '2026-10-26' },
          { id: 10052, title: 'Realizar sesión práctica para Turno Tarde', completed: false, responsible: 'Equipo be lean', dueDate: '2026-10-28' }
        ]
      },
      {
        id: 1006,
        planId: 'standardization',
        what: 'Estandarizar auditorías diarias escalonadas (Kamishibai) en andenes',
        why: 'Garantizar que el estándar de 4 horas se mantenga en el tiempo',
        who: 'Alexis Inzunza Vergara',
        when: '2026-11-10',
        where: 'Punto de Control de Despacho',
        how: 'Tablero visual con tarjetas rojas/verdes revisadas en inicio de turno',
        howMuch: '$80.000 CLP',
        status: 'pending',
        progress: 0,
        subtasks: [
          { id: 10061, title: 'Diseñar plantilla de tarjeta Kamishibai de 5 preguntas', completed: false, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-11-02' },
          { id: 10062, title: 'Instalar tablero acrílico en pared de andén', completed: false, responsible: 'Vicente Osorio', dueDate: '2026-11-05' },
          { id: 10063, title: 'Entrenar a supervisores en la rutina diaria de 3 minutos', completed: false, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-11-10' }
        ]
      }
    ],
    follow_up_notes: 'Evolución muy positiva: el Lead Time bajó drásticamente de 14.5 hrs a 4.2 hrs en la 7ma semana de implementación. Falta culminar la prueba piloto de lectores inalámbricos.',
    follow_up_data: [
      {
        id: 'chart-lt-despacho',
        kpiName: 'Lead Time de Despacho (Horas)',
        kpiGoal: 4.0,
        goalType: 'minimize',
        isPercentage: false,
        dataPoints: [
          { id: 'dp-1', date: '2026-08-25', value: 14.5 },
          { id: 'dp-2', date: '2026-09-01', value: 13.8 },
          { id: 'dp-3', date: '2026-09-08', value: 12.1 },
          { id: 'dp-4', date: '2026-09-15', value: 10.4 },
          { id: 'dp-5', date: '2026-09-22', value: 7.9 },
          { id: 'dp-6', date: '2026-09-29', value: 5.6 },
          { id: 'dp-7', date: '2026-10-06', value: 4.2 }
        ]
      },
      {
        id: 'chart-otif',
        kpiName: 'Cumplimiento de Entregas (OTIF %)',
        kpiGoal: 98.0,
        goalType: 'maximize',
        isPercentage: true,
        dataPoints: [
          { id: 'otif-1', date: '2026-08-25', value: 72.4 },
          { id: 'otif-2', date: '2026-09-01', value: 75.0 },
          { id: 'otif-3', date: '2026-09-08', value: 81.2 },
          { id: 'otif-4', date: '2026-09-15', value: 86.5 },
          { id: 'otif-5', date: '2026-09-22', value: 91.0 },
          { id: 'otif-6', date: '2026-09-29', value: 95.3 },
          { id: 'otif-7', date: '2026-10-06', value: 97.4 }
        ]
      }
    ]
  };

  // 2. Proyecto 2: Mermas y Scrap en Envasado
  const project2 = {
    id: '7b2a951c-4389-4a90-b188-7517c805eb31',
    company_id: COMPANY_ID,
    title: 'Reducción de Mermas y Scrap en Línea de Envasado 2',
    status: 'En Proceso',
    responsible: 'Vicente Osorio',
    date: '2026-09-22',
    background: '<p>Durante julio y agosto se registró una tasa promedio de mermas de film y producto del <strong>7.8%</strong> en la Línea 2 de envasado, superando el umbral corporativo de 1.5%. Esta desviación generó pérdidas directas de \$8.900.000 CLP en mermas acumuladas y 34 horas de detenciones no programadas por atochamientos.</p>',
    current_condition: '<p>El análisis de paradas muestra que el 62% del desperdicio proviene de sellado defectuoso y descalibre de temperatura en mordazas horizontales al cambiar de proveedor de bobina. El OEE actual de la línea se sitúa en <strong>64.2%</strong>.</p>',
    goal: 'Disminuir el porcentaje de scrap del 7.8% al 1.2% y elevar el OEE de línea del 64% al 85% para el 15 de Diciembre de 2026.',
    root_cause: 'Falta de control termográfico en mordazas y ausencia de estándar de ajuste de parámetros de sellado al realizar cambios de formato.',
    pareto_data: [
      { label: 'Sellado térmico defectuoso / microfugas', value: 52 },
      { label: 'Desalineación y arrugas de bobina film', value: 24 },
      { label: 'Sobrepeso o dosificación irregular', value: 12 },
      { label: 'Rotura de envase por caída en cinta', value: 8 },
      { label: 'Otros desajustes mecánicos', value: 4 },
    ],
    ishikawas: [
      {
        id: 1,
        problem: 'Scrap elevado (7.8%) en envasado',
        categories: {
          'Método': ['Parámetros de temperatura fijados al "ojo" por operador', 'Procedimiento de cambio de bobina sin checklist'],
          'Mano de Obra': ['Rotación frecuente de operadores novatos', 'Sin entrenamiento en calibración de mordazas'],
          'Maquinaria': ['Resistencias calefactoras con desgaste asimétrico', 'Sensor de fotocélula sucio'],
          'Materiales': ['Variación de espesor del film entre lotes de proveedores'],
          'Medición': ['Control de estanqueidad solo 1 vez por turno'],
          'Medio Ambiente': ['Humedad ambiente variable en sala de envasado']
        }
      }
    ],
    five_whys: [
      {
        id: 1,
        problem: '¿Por qué se produce scrap por microfugas en los paquetes?',
        whys: [
          'Porque la temperatura de la mordaza de sellado fluctúa durante la corrida.',
          'Porque el pirómetro analógico tiene desfase de ±15°C respecto a la superficie real.',
          'Porque las resistencias térmicas acumulan carbón y suciedad de film derretido.',
          'Porque no se realiza limpieza ni calibración preventiva programada en las mordazas.',
          'Porque no existía rutina de mantenimiento autónomo asignada a los operadores.'
        ],
        rootCause: 'Ausencia de mantenimiento autónomo básico de mordazas e instrumentación de medición térmica de precisión.'
      }
    ],
    countermeasures: 'Instalación de pirómetros digitales infrarrojos, matriz de parámetros por tipo de film y checklist de mantenimiento autónomo diario.',
    execution_plan: 'Calibración técnica e instalación de sensores (Oct). Estandarización y entrenamiento en piso (Nov).',
    action_plans_meta: defaultPlansMeta,
    action_plan: [
      {
        id: 2001,
        planId: 'containment',
        what: 'Establecer prueba de inmersión en agua cada 60 minutos en la línea',
        why: 'Detectar paquetes con microfugas antes de empacar en cajas maestras',
        who: 'Vicente Osorio',
        when: '2026-09-24',
        where: 'Mesa de Control de Envasado 2',
        how: 'Cámara de vacío simple con campana acrílica',
        howMuch: '$150.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 20011, title: 'Instalar campana de prueba de vacío en mesa de salida', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-09-23' },
          { id: 20012, title: 'Capacitar a inspectores de calidad en la pauta de prueba', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-09-24' }
        ]
      },
      {
        id: 2002,
        planId: 'main',
        what: 'Instalar controladores PID digitales y termocuplas de respuesta rápida',
        why: 'Mantener la temperatura de sellado estable con tolerancia ±2°C',
        who: 'Alejandro Oscar Ureta Perez',
        when: '2026-10-10',
        where: 'Panel de Control Envasadora 2',
        how: 'Reemplazo de controladores antiguos por controladores Omron de alta precisión',
        howMuch: '$890.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 20021, title: 'Comprar los 2 controladores PID con salida a relé de estado sólido', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-02' },
          { id: 20022, title: 'Realizar cableado e instalación en parada programada', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-07' },
          { id: 20023, title: 'Efectuar auto-tuning de sintonización PID a 180°C', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-10-10' }
        ]
      },
      {
        id: 2003,
        planId: 'main',
        what: 'Diseñar la tabla maestra de parámetros óptimos de sellado por proveedor de film',
        why: 'Eliminar el ajuste empírico y desajustes por cambio de turno',
        who: 'Vicente Osorio',
        when: '2026-10-22',
        where: 'Puesto de Mando Envasadora 2',
        how: 'Pruebas de tracción y termosellado con muestras de los 3 proveedores vigentes',
        howMuch: '$60.000 CLP',
        status: 'in_progress',
        progress: 67,
        subtasks: [
          { id: 20031, title: 'Realizar corridas de prueba a 170°C, 180°C y 190°C', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-10-15' },
          { id: 20032, title: 'Confeccionar panel acrílico visual plastificado junto a la máquina', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-10-20' },
          { id: 20033, title: 'Validar resistencia de sellado en laboratorio de calidad', completed: false, responsible: 'Equipo be lean', dueDate: '2026-10-22' }
        ]
      },
      {
        id: 2004,
        planId: 'standardization',
        what: 'Estandarizar la rutina de mantenimiento autónomo diario de mordazas de sellado',
        why: 'Evitar acumulación de restos plásticos y desgaste irregular',
        who: 'Equipo be lean',
        when: '2026-11-05',
        where: 'Línea de Envasado 2',
        how: 'Rutina de 5 minutos al término de cada turno con cepillo de bronce y alcohol isopropílico',
        howMuch: '$45.000 CLP',
        status: 'pending',
        progress: 0,
        subtasks: [
          { id: 20041, title: 'Redactar instructivo visual LUP (Lección de Un Punto)', completed: false, responsible: 'Equipo be lean', dueDate: '2026-10-28' },
          { id: 20042, title: 'Dotar kit de limpieza en carro porta-herramientas de la máquina', completed: false, responsible: 'Vicente Osorio', dueDate: '2026-11-02' },
          { id: 20043, title: 'Auditar cumplimiento de rutina durante 10 días seguidos', completed: false, responsible: 'Equipo be lean', dueDate: '2026-11-05' }
        ]
      }
    ],
    follow_up_notes: 'Gran reducción de scrap gracias a la instalación de los controladores PID digitales. La merma bajó de 7.8% a 2.3% en 4 semanas.',
    follow_up_data: [
      {
        id: 'chart-scrap-linea2',
        kpiName: 'Tasa de Scrap y Merma (%)',
        kpiGoal: 1.2,
        goalType: 'minimize',
        isPercentage: true,
        dataPoints: [
          { id: 'sc-1', date: '2026-09-01', value: 7.8 },
          { id: 'sc-2', date: '2026-09-08', value: 7.4 },
          { id: 'sc-3', date: '2026-09-15', value: 6.9 },
          { id: 'sc-4', date: '2026-09-22', value: 5.1 },
          { id: 'sc-5', date: '2026-09-29', value: 3.4 },
          { id: 'sc-6', date: '2026-10-06', value: 2.3 }
        ]
      },
      {
        id: 'chart-oee-linea2',
        kpiName: 'OEE Línea de Envasado 2 (%)',
        kpiGoal: 85.0,
        goalType: 'maximize',
        isPercentage: true,
        dataPoints: [
          { id: 'oee-1', date: '2026-09-01', value: 64.2 },
          { id: 'oee-2', date: '2026-09-08', value: 66.0 },
          { id: 'oee-3', date: '2026-09-15', value: 69.5 },
          { id: 'oee-4', date: '2026-09-22', value: 74.0 },
          { id: 'oee-5', date: '2026-09-29', value: 79.8 },
          { id: 'oee-6', date: '2026-10-06', value: 83.1 }
        ]
      }
    ]
  };

  // 3. Proyecto 3: Despliegue de 5S y Mantenimiento Autónomo (TPM)
  const project3 = {
    id: '9d3c829e-1502-4e78-9e54-8c887413fa21',
    company_id: COMPANY_ID,
    title: 'Despliegue de 5S y Mantenimiento Autónomo (TPM) en Planta Productiva',
    status: 'Cerrado',
    responsible: 'Equipo be lean',
    date: '2026-08-10',
    background: '<p>Diagnóstico inicial de planta evidenció desorden generalizado en áreas comunes de trabajo, acumulación de herramientas en cajas personales y tiempos muertos promedio de <strong>45 minutos diarios por operario</strong> buscando insumos y llaves mecánicas. Se reportaron 4 incidentes menores de tropiezos.</p>',
    current_condition: '<p>La primera auditoría diagnóstica de 5S arrojó un puntaje global de <strong>41.5%</strong> de cumplimiento. Herramientas sin sombraje, derrames de aceite sin bandeja de retención y pasillos sin delimitación reglamentaria.</p>',
    goal: 'Alcanzar una calificación ≥ 90% en la auditoría corporativa de 5S y reducir a menos de 5 minutos el tiempo diario de búsqueda de herramientas al 30 de Septiembre de 2026.',
    root_cause: 'Falta de delimitación de puestos de trabajo, ausencia de tableros sombreados y falta de hábito estructurado de orden y limpieza diaria.',
    pareto_data: [
      { label: 'Herramientas fuera de lugar / extraviadas', value: 48 },
      { label: 'Cajas y pallets obstaculizando pasillos', value: 26 },
      { label: 'Derrames de lubricantes no limpiados', value: 14 },
      { label: 'Piezas obsoletas acumuladas en estantes', value: 8 },
      { label: 'Otros desórdenes menores', value: 4 },
    ],
    ishikawas: [
      {
        id: 1,
        problem: 'Bajo cumplimiento de orden y limpieza en planta (41%)',
        categories: {
          'Método': ['Sin pauta de 5 minutos de orden al cerrar el turno', 'No hay criterios claros de descarte (Tarjetas Rojas)'],
          'Mano de Obra': ['Creencia de que la limpieza le corresponde solo a personal externo', 'Falta de reconocimiento a áreas destacadas'],
          'Maquinaria': ['Fugas menores de aceite en mangueras hidráulicas sin reparar'],
          'Materiales': ['Exceso de repuestos dados de baja en las esquinas del taller'],
          'Medición': ['Sin radar 5S ni auditorías cruzadas entre áreas'],
          'Medio Ambiente': ['Iluminación deficiente en zona de almacenamiento de herramientas']
        }
      }
    ],
    five_whys: [
      {
        id: 1,
        problem: '¿Por qué los operarios pierden 45 min diarios buscando herramientas?',
        whys: [
          'Porque las herramientas no regresan a un lugar común al terminar cada tarea.',
          'Porque no hay un lugar específico asignado ni identificado para cada herramienta.',
          'Porque nunca se instalaron tableros de sombra en las islas de trabajo.',
          'Porque no existía un programa formal de 5S en la empresa.',
          'Porque la cultura operativa estaba orientada solo a apagar incendios y no a la estandarización.'
        ],
        rootCause: 'Falta de sistema visual de ordenamiento (Seiton) y compromiso estandarizado de la supervisión con las 5S.'
      }
    ],
    countermeasures: 'Campaña de tarjetas rojas (Seiri), instalación de tableros de sombra (Seiton), rutina de 5 min diarios (Seiso) y auditorías quincenales (Shitsuke).',
    execution_plan: 'Jornada Seiri (Ago). Diseño de tableros y pintura de pisos (Sep). Auditorías y certificación (Oct).',
    action_plans_meta: defaultPlansMeta,
    action_plan: [
      {
        id: 3001,
        planId: 'main',
        what: 'Ejecutar jornada intensiva de Tarjetas Rojas (Seiri) en toda la planta',
        why: 'Separar y descartar todos los objetos, herramientas rotas y sobrantes obsoletos',
        who: 'Equipo be lean',
        when: '2026-08-20',
        where: 'Nave de Producción y Talleres',
        how: 'Jornada de 4 horas con involucramiento de todos los operadores y jefaturas',
        howMuch: '$200.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 30011, title: 'Imprimir 200 tarjetas rojas numeradas', completed: true, responsible: 'Equipo be lean', dueDate: '2026-08-15' },
          { id: 30012, title: 'Habilitar zona temporal de cuarentena para descarte', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-08-18' },
          { id: 30013, title: 'Retirar 1.8 toneladas de chatarra y materiales dados de baja', completed: true, responsible: 'Equipo be lean', dueDate: '2026-08-20' }
        ]
      },
      {
        id: 3002,
        planId: 'main',
        what: 'Construir e instalar 6 tableros de herramientas sombreados (Seiton)',
        why: 'Garantizar que cada herramienta tenga un único lugar visible',
        who: 'Vicente Osorio',
        when: '2026-09-05',
        where: 'Líneas 1, 2, 3 y Taller Mecánico',
        how: 'Tableros perforados con siluetas cortadas en vinilo de alto tráfico',
        howMuch: '$650.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 30021, title: 'Definir set estándar de llaves y herramientas por puesto', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-08-26' },
          { id: 30022, title: 'Montar tableros y pegar siluetas amarillas identificatorias', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-09-01' },
          { id: 30023, title: 'Inventariar y codificar cada herramienta con grabado láser', completed: true, responsible: 'Vicente Osorio', dueDate: '2026-09-05' }
        ]
      },
      {
        id: 3003,
        planId: 'main',
        what: 'Demarcar pasillos de tránsito, zonas de acopio y áreas de seguridad',
        why: 'Evitar invasión de pasillos y delimitar flujo seguro de personas y grúas',
        who: 'Alexis Inzunza Vergara',
        when: '2026-09-15',
        where: 'Pisos de Planta Principal',
        how: 'Pintura epóxica de alta resistencia (amarillo tráfico y franjas cebra)',
        howMuch: '$780.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 30031, title: 'Limpiar y decapar superficies con hidrolavadora', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-10' },
          { id: 30032, title: 'Trazar y pintar 350 metros lineales de demarcación', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-15' }
        ]
      },
      {
        id: 3004,
        planId: 'standardization',
        what: 'Estandarizar la rutina diaria de 5 minutos de limpieza e inspección (Seiso)',
        why: 'Mantener la planta impecable sin necesidad de jornadas extraordinarias',
        who: 'Equipo be lean',
        when: '2026-09-25',
        where: 'Todas las estaciones de trabajo',
        how: 'Alarma musical a las 16:55 hrs para activar la rutina de 5 minutos',
        howMuch: '$120.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 30041, title: 'Diseñar checklist visual de 4 puntos por máquina', completed: true, responsible: 'Equipo be lean', dueDate: '2026-09-18' },
          { id: 30042, title: 'Programar señal sonora de aviso en sistema de audio', completed: true, responsible: 'Alejandro Oscar Ureta Perez', dueDate: '2026-09-22' },
          { id: 30043, title: 'Entrenar a supervisores en la validación del cierre de turno', completed: true, responsible: 'Equipo be lean', dueDate: '2026-09-25' }
        ]
      },
      {
        id: 3005,
        planId: 'standardization',
        what: 'Institucionalizar auditorías quincenales y publicar panel de reconocimiento visual (Shitsuke)',
        why: 'Fomentar la sana competencia y disciplina operativa continua',
        who: 'Equipo be lean',
        when: '2026-09-30',
        where: 'Mural de Entrada Principal',
        how: 'Evaluación por radar 5S y entrega del trofeo itinerante a la mejor línea',
        howMuch: '$150.000 CLP',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 30051, title: 'Diseñar pauta de evaluación digital de 25 preguntas', completed: true, responsible: 'Equipo be lean', dueDate: '2026-09-26' },
          { id: 30052, title: 'Realizar la primera auditoría cruzada con líderes de turno', completed: true, responsible: 'Equipo be lean', dueDate: '2026-09-29' },
          { id: 30053, title: 'Premiar al equipo ganador con desayuno y diploma en mural', completed: true, responsible: 'Alexis Inzunza Vergara', dueDate: '2026-09-30' }
        ]
      }
    ],
    follow_up_notes: 'Proyecto culminado con éxito rotundo. La auditoría final alcanzó 94.2% de cumplimiento y el tiempo perdido en búsqueda de herramientas se redujo a menos de 2 minutos.',
    follow_up_data: [
      {
        id: 'chart-5s-score',
        kpiName: 'Calificación Auditoría 5S (%)',
        kpiGoal: 90.0,
        goalType: 'maximize',
        isPercentage: true,
        dataPoints: [
          { id: 'score-1', date: '2026-08-10', value: 41.5 },
          { id: 'score-2', date: '2026-08-20', value: 54.0 },
          { id: 'score-3', date: '2026-08-31', value: 68.2 },
          { id: 'score-4', date: '2026-09-10', value: 78.5 },
          { id: 'score-5', date: '2026-09-20', value: 87.0 },
          { id: 'score-6', date: '2026-09-30', value: 94.2 }
        ]
      },
      {
        id: 'chart-tool-time',
        kpiName: 'Tiempo Perdido en Búsqueda de Herramientas (Min/Día)',
        kpiGoal: 2.0,
        goalType: 'minimize',
        isPercentage: false,
        dataPoints: [
          { id: 't-1', date: '2026-08-10', value: 45.0 },
          { id: 't-2', date: '2026-08-20', value: 38.0 },
          { id: 't-3', date: '2026-08-31', value: 24.0 },
          { id: 't-4', date: '2026-09-10', value: 12.0 },
          { id: 't-5', date: '2026-09-20', value: 5.0 },
          { id: 't-6', date: '2026-09-30', value: 1.8 }
        ]
      }
    ]
  };

  // Upsert Project 1
  console.log('Upserting Project 1...');
  const { error: err1 } = await supabase.from('a3_projects').upsert(project1);
  if (err1) {
    console.error('Error upserting project 1:', err1);
  } else {
    console.log('✅ Project 1 successfully saved!');
  }

  // Upsert Project 2
  console.log('Upserting Project 2...');
  const { error: err2 } = await supabase.from('a3_projects').upsert(project2);
  if (err2) {
    console.error('Error upserting project 2:', err2);
  } else {
    console.log('✅ Project 2 successfully saved!');
  }

  // Upsert Project 3
  console.log('Upserting Project 3...');
  const { error: err3 } = await supabase.from('a3_projects').upsert(project3);
  if (err3) {
    console.error('Error upserting project 3:', err3);
  } else {
    console.log('✅ Project 3 successfully saved!');
  }

  console.log('Done seeding Nexus A3 projects!');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
