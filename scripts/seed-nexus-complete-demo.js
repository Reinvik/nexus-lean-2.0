import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1enBnbGpqZmVvYnhscHRtc21hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc2Njc0MCwiZXhwIjoyMDgyMzQyNzQwfQ.HoelddG65nqo7fqJE1xFvYfmu0kCu2yNq6Zr3itlZiw';
const NEXUS_COMPANY_ID = '3d43353d-ed20-4626-8742-dca4f1d17757'; // STRICTLY NEXUS ONLY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function runSeed() {
  console.log('🚀 Starting Complete Lean Demo Data Seeding for NEXUS (Company ID: ' + NEXUS_COMPANY_ID + ')...');

  // =========================================================================
  // 1. GEMBA ROUTES
  // =========================================================================
  console.log('\n--- 1. Seeding Gemba Routes ---');
  const route1Id = 'a1111111-1111-4111-a111-111111111111';
  const route2Id = 'a2222222-2222-4222-a222-222222222222';

  const gembaRoutes = [
    {
      id: route1Id,
      company_id: NEXUS_COMPANY_ID,
      name: 'Ruta Operacional: Planta de Procesos & Envasado',
      area: 'Planta Principal',
      description: 'Recorrido estandarizado de supervisión activa enfocado en flujo continuo, seguridad de máquinas y detección de las 8 Mudas (TIMWOODS).',
      focus_theme: 'Flujo Continuo, Seguridad y 8 Desperdicios (TIMWOODS)',
      estimated_duration_min: 45,
      is_active: true,
      stations: [
        {
          id: 'st-01',
          name: 'Estación 1: Recepción y Pesaje de Materia Prima',
          area: 'Bodega de Insumos',
          standardNotes: 'Balanza con certificado de calibración al día, pasillo libre de obstáculos, control visual FIFO por colores.',
          standardImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
          orderIndex: 1,
        },
        {
          id: 'st-02',
          name: 'Estación 2: Línea de Mezclado y Dosificación',
          area: 'Producción',
          standardNotes: 'Bandejas de contención bajo válvulas dosificadoras, pauta de limpieza visible y uso obligatorio de EPP.',
          standardImageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
          orderIndex: 2,
        },
        {
          id: 'st-03',
          name: 'Estación 3: Línea 2 de Envasado y Termosellado',
          area: 'Envasado',
          standardNotes: 'Control termográfico de mordazas a 180°C ±2°C, sin colas de film sobrante, sensor de corte limpio.',
          standardImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          orderIndex: 3,
        },
        {
          id: 'st-04',
          name: 'Estación 4: Control de Calidad y Cuarentena',
          area: 'Control de Calidad',
          standardNotes: 'Cámara de prueba de vacío operativa, tarjetas de aprobación verde/rojo según ensayo de estanqueidad.',
          standardImageUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
          orderIndex: 4,
        },
      ],
    },
    {
      id: route2Id,
      company_id: NEXUS_COMPANY_ID,
      name: 'Ruta Logística: Centro de Distribución & Andenes',
      area: 'Centro Logístico',
      description: 'Auditoría en terreno del flujo de despacho, ergonomía de armado de pedidos, tiempos de picking y seguridad en muelle de carga.',
      focus_theme: 'Tiempos de Ciclo de Picking, Zonificación 5S y Ergonomía',
      estimated_duration_min: 35,
      is_active: true,
      stations: [
        {
          id: 'st-11',
          name: 'Estación 1: Racks de Alta Rotación (Zona ABC)',
          area: 'Bodega Central',
          standardNotes: 'Demarcación epóxica amarilla respetada, rotulación de SKUs visible a 3 metros, sin pallets sobresalientes.',
          standardImageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
          orderIndex: 1,
        },
        {
          id: 'st-12',
          name: 'Estación 2: Mesa de Consolidación y Embalaje',
          area: 'Picking & Packing',
          standardNotes: 'Dispensadores de film a altura ergonómica, terminal de radiofrecuencia en base de carga, basurero de cartón.',
          standardImageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
          orderIndex: 2,
        },
        {
          id: 'st-13',
          name: 'Estación 3: Andenes 1 y 2 de Carga a Camiones',
          area: 'Muelle de Salida',
          standardNotes: 'Cuñas de rueda instaladas en camión, semáforo de andén en verde, revisión visual de precinto de seguridad.',
          standardImageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
          orderIndex: 3,
        },
      ],
    },
  ];

  for (const r of gembaRoutes) {
    const { error } = await supabase.from('gemba_routes').upsert(r);
    if (error) console.error('Error upserting route:', r.name, error);
    else console.log('✅ Route upserted:', r.name);
  }

  // =========================================================================
  // 2. GEMBA WALKS
  // =========================================================================
  console.log('\n--- 2. Seeding Gemba Walks ---');
  const walk1Id = 'b1111111-1111-4111-b111-111111111111';
  const walk2Id = 'b2222222-2222-4222-b222-222222222222';
  const walk3Id = 'b3333333-3333-4333-b333-333333333333';

  const gembaWalks = [
    {
      id: walk1Id,
      company_id: NEXUS_COMPANY_ID,
      route_id: route1Id,
      title: 'Gemba Walk Semanal: Inspección de Flujo y Seguridad en Envasado',
      area: 'Planta Principal',
      walker_id: 'ee6ac592-6cc3-4b64-98c8-49760daa89fc',
      walker_name: 'Alexis Inzunza Vergara',
      companion_names: ['Vicente Osorio', 'Equipo be lean'],
      scheduled_date: '2026-10-15',
      status: 'completada',
      start_time: '2026-10-15T09:30:00Z',
      end_time: '2026-10-15T10:25:00Z',
      focus_theme: 'Detección de Mudas y Estandarización de Puestos de Envasado',
      summary_notes: 'Excelente disposición del equipo operativo. Se constata avance sólido en el orden 5S de herramientas. Detectamos pérdidas de tiempo en cambio de bobinas que se pactaron resolver en terreno. Se levantaron 4 compromisos formales con los operadores.',
      coaching_notes: 'Felicitar a operador Juan Pérez por mantener la mesa de trabajo despejada. Apoyar a la supervisión en dotar de llaves Allen fijas a cada envasadora para evitar traslados.',
    },
    {
      id: walk2Id,
      company_id: NEXUS_COMPANY_ID,
      route_id: route2Id,
      title: 'Gemba Matutino: Tiempos de Picking y Despacho en Andén',
      area: 'Centro Logístico',
      walker_id: 'ce70f2db-80d3-439b-9db5-0fc9483769ee',
      walker_name: 'Vicente Osorio',
      companion_names: ['Alexis Inzunza Vergara'],
      scheduled_date: '2026-10-19',
      status: 'en_curso',
      start_time: '2026-10-19T10:00:00Z',
      end_time: null,
      focus_theme: 'Eliminación de traslados innecesarios y ergonomía en andén',
      summary_notes: 'Recorrido en desarrollo evaluando el nuevo sistema de preparación por olas y la señalética de racks ABC.',
      coaching_notes: 'Observar cómo interactúan los preparadores con las nuevas terminales de radiofrecuencia.',
    },
    {
      id: walk3Id,
      company_id: NEXUS_COMPANY_ID,
      route_id: route1Id,
      title: 'Gemba de Liderazgo: Auditoría Gemba de Seguridad y 5S',
      area: 'Planta Principal',
      walker_id: '54968f07-eb05-45d0-b059-8adab37fad2c',
      walker_name: 'Equipo be lean',
      companion_names: ['Alejandro Oscar Ureta Perez', 'Alexis Inzunza Vergara'],
      scheduled_date: '2026-10-24',
      status: 'programada',
      start_time: null,
      end_time: null,
      focus_theme: 'Verificación de barreras de seguridad y orden en taller de mantenimiento',
      summary_notes: null,
      coaching_notes: null,
    },
  ];

  for (const w of gembaWalks) {
    const { error } = await supabase.from('gemba_walks').upsert(w);
    if (error) console.error('Error upserting walk:', w.title, error);
    else console.log('✅ Walk upserted:', w.title);
  }

  // =========================================================================
  // 3. GEMBA FINDINGS (HALLAZGOS CON PACTOS DE COMPROMISO / HANDSHAKE)
  // =========================================================================
  console.log('\n--- 3. Seeding Gemba Findings ---');
  const gembaFindings = [
    {
      id: 'c1111111-1111-4111-c111-111111111111',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk1Id,
      station_name: 'Estación 3: Línea 2 de Envasado y Termosellado',
      operator_name: 'Juan Pérez (Operador Línea 2)',
      finding_type: 'desperdicio_muda',
      muda_category: 'espera',
      description: 'El operario pierde entre 12 a 15 minutos en cada cambio de bobina de film porque las llaves de ajuste están en un carro compartido al otro extremo de la sala.',
      immediate_action: 'Instalar soporte magnético con set dedicado de llaves Allen fijado a la estructura de la máquina.',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      audio_note_url: JSON.stringify({
        isHandshake: true,
        daysAgreed: 3,
        dueDate: '2026-10-18',
        leaderSupport: 'Adquirir y codificar juego de llaves con cable acerado de seguridad',
        completedAt: '2026-10-18T16:30:00Z',
        afterImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      }),
      derived_type: 'quick_win',
      status: 'cerrado',
    },
    {
      id: 'c2222222-2222-4222-c222-222222222222',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk1Id,
      station_name: 'Estación 2: Línea de Mezclado y Dosificación',
      operator_name: 'Carlos Muñoz (Líder Dosificación)',
      finding_type: 'seguridad',
      muda_category: 'movimiento',
      description: 'Goteo intermitente de solución de limpieza bajo la válvula 3 genera riesgo de resbalón y caída al mismo nivel para los operadores.',
      immediate_action: 'Colocar bandeja de contención móvil provisional y cinta antideslizante en zona de tránsito.',
      image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80',
      audio_note_url: JSON.stringify({
        isHandshake: true,
        daysAgreed: 5,
        dueDate: '2026-10-21',
        leaderSupport: 'Gestionar reemplazo de sello de teflón de la válvula con equipo de mantenimiento',
        completedAt: null,
        afterImageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      }),
      derived_type: 'five_s',
      status: 'en_proceso',
    },
    {
      id: 'c3333333-3333-4333-c333-333333333333',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk1Id,
      station_name: 'Estación 1: Recepción y Pesaje de Materia Prima',
      operator_name: 'Marta Valenzuela (Bodeguera Recepción)',
      finding_type: 'reconocimiento_positivo',
      muda_category: null,
      description: 'Marta diseñó e implementó por cuenta propia un código de colores con tarjetas plastificadas para rotar materias primas bajo estricto orden FIFO en cámara de frío.',
      immediate_action: 'Reconocimiento verbal inmediato y publicación de foto de felicitación en el panel de comunicación visual Lean.',
      image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      audio_note_url: null,
      derived_type: 'ninguna',
      status: 'cerrado',
    },
    {
      id: 'c4444444-4444-4444-c444-444444444444',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk1Id,
      station_name: 'Estación 4: Control de Calidad y Cuarentena',
      operator_name: 'Lorena Silva (Analista de Calidad)',
      finding_type: 'calidad',
      muda_category: 'defectos',
      description: 'Microfugas recurrentes detectadas en lote #402 por temperatura inestable de mordaza horizontal en envasadora.',
      immediate_action: 'Detener corrida y verificar curva térmica del pirómetro PID digital instalado en el proyecto A3.',
      image_url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
      audio_note_url: null,
      derived_type: 'a3',
      status: 'cerrado',
    },
    {
      id: 'c5555555-5555-4555-c555-555555555555',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk2Id,
      station_name: 'Estación 1: Racks de Alta Rotación (Zona ABC)',
      operator_name: 'Roberto Gómez (Preparador Picking)',
      finding_type: 'desperdicio_muda',
      muda_category: 'transporte',
      description: 'Preparadores recorren 85 metros de ida y vuelta para retirar etiquetas adhesivas de despacho al final del pasillo 4.',
      immediate_action: 'Reubicar la impresora de etiquetas en la cabecera del rack A para reducir el 80% de los desplazamientos.',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      audio_note_url: JSON.stringify({
        isHandshake: true,
        daysAgreed: 4,
        dueDate: '2026-10-23',
        leaderSupport: 'Tendido de punto de red y alimentación eléctrica en cabecera de rack',
        completedAt: null,
        afterImageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
      }),
      derived_type: 'quick_win',
      status: 'en_proceso',
    },
    {
      id: 'c6666666-6666-4666-c666-666666666666',
      company_id: NEXUS_COMPANY_ID,
      walk_id: walk2Id,
      station_name: 'Estación 3: Andenes 1 y 2 de Carga a Camiones',
      operator_name: 'Felipe Soto (Operador de Andén)',
      finding_type: 'estandar',
      muda_category: 'movimiento',
      description: 'Falta cartel visual con estándar de aseguramiento de cuñas mecánicas antes de autorizar la apertura de cortina del camión.',
      immediate_action: 'Diseñar Lección de Un Punto (LUP) e instalar en el marco exterior del andén 1 y 2.',
      image_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      audio_note_url: null,
      derived_type: 'five_s',
      status: 'abierto',
    },
  ];

  for (const f of gembaFindings) {
    const { error } = await supabase.from('gemba_findings').upsert(f);
    if (error) console.error('Error upserting finding:', f.station_name, error);
    else console.log('✅ Finding upserted:', f.station_name, `(${f.finding_type})`);
  }

  // =========================================================================
  // 4. TARJETAS 5S (FIVE_S_CARDS) CON NÚMERO CORRELATIVO Y CONTENIDO LEAN
  // =========================================================================
  console.log('\n--- 4. Seeding 5S Cards for Nexus ---');
  const fiveSCards = [
    {
      id: 'd1111111-1111-4111-d111-111111111111',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-001',
      findings: 'Cables eléctricos y mangueras neumáticas en el suelo cruzando el pasillo peatonal de Línea 1',
      area: 'Línea de Envasado 1',
      category: 'Seguridad',
      priority: 'Alta',
      responsible: 'Vicente Osorio',
      status: 'En Proceso',
      description: 'Representa un riesgo grave de tropiezo para los operadores y daño por aplastamiento de transpaletas. Acción: colocar pasacables industrial y elevar mangueras con canaletas.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
      after_image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      after_image_urls: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-05T08:30:00Z',
    },
    {
      id: 'd2222222-2222-4222-d222-222222222222',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-002',
      findings: 'Herramientas de cambio rápido (llaves de dados y calibres) dispersas en mesón de ajuste sin sombraje',
      area: 'Taller de Mantenimiento',
      category: 'Seiton',
      priority: 'Media',
      responsible: 'Equipo be lean',
      status: 'Cerrado',
      description: 'Los mecánicos demoraban 20 minutos buscando llaves para cambio de formato en envasadora.',
      closure_comment: 'Tablero perforado con siluetas amarillas instalado con éxito. Tiempo de búsqueda reducido a cero.',
      image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80'],
      after_image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      after_image_urls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-02T10:00:00Z',
      close_date: '2026-10-09T18:00:00Z',
    },
    {
      id: 'd3333333-3333-4333-d333-333333333333',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-003',
      findings: 'Cajas de cartón corrugado dañadas y piezas plásticas rotas acumuladas en rack B-04',
      area: 'Bodega Central',
      category: 'Seiri',
      priority: 'Alta',
      responsible: 'Alexis Inzunza Vergara',
      status: 'Cerrado',
      description: 'Ocupaban 3 posiciones de pallet de alta rotación generando desorden y riesgo de incendio.',
      closure_comment: 'Aplicación de tarjeta roja de descarte, retiro de 420 kg de cartón a centro de reciclaje.',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'],
      after_image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
      after_image_urls: ['https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-09-28T14:15:00Z',
      close_date: '2026-10-04T17:00:00Z',
    },
    {
      id: 'd4444444-4444-4444-d444-444444444444',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-004',
      findings: 'Derrame de aceite lubricante bajo la reductora de la cinta transportadora 2 sin bandeja de retención',
      area: 'Nave de Producción',
      category: 'Seiso',
      priority: 'Alta',
      responsible: 'Alejandro Oscar Ureta Perez',
      status: 'En Proceso',
      description: 'Pérdida continua que ensucia el piso y degrada el rodamiento de la cinta. Acción: limpieza con absorbente ecológico y apriete de empaquetaduras.',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'],
      after_image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      after_image_urls: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-11T11:00:00Z',
    },
    {
      id: 'd5555555-5555-4555-d555-555555555555',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-005',
      findings: 'Falta demarcación de cajón de estacionamiento para transpaletas eléctricas en andén de salida',
      area: 'Centro de Distribución',
      category: 'Seiketsu',
      priority: 'Media',
      responsible: 'Alexis Inzunza Vergara',
      status: 'Abierto',
      description: 'Las transpaletas quedan estacionadas bloqueando la puerta de emergencia y la salida de camiones.',
      image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-14T16:45:00Z',
    },
    {
      id: 'd6666666-6666-4666-d666-666666666666',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-006',
      findings: 'Extintor de incendio PQS de 10 kg tapado por bultos de film termocontraíble',
      area: 'Almacén de Materiales',
      category: 'Seguridad',
      priority: 'Alta',
      responsible: 'Alexis Inzunza Vergara',
      status: 'Cerrado',
      description: 'Riesgo crítico de seguridad ante conato de incendio por bloqueo del acceso al extintor.',
      closure_comment: 'Área despejada en 5 minutos y perímetro de 1 metro pintado con franjas cebra reglamentarias.',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'],
      after_image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
      after_image_urls: ['https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-08T09:10:00Z',
      close_date: '2026-10-08T10:00:00Z',
    },
    {
      id: 'd7777777-7777-4777-d777-777777777777',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-007',
      findings: 'Ausencia de pauta visual de 5 minutos de limpieza e inspección (Seiso) al término de turno',
      area: 'Línea de Mezclado',
      category: 'Shitsuke',
      priority: 'Media',
      responsible: 'Vicente Osorio',
      status: 'Abierto',
      description: 'El turno siguiente pierde 15 minutos retirando polvo antes de poder comenzar la producción.',
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-16T12:00:00Z',
    },
    {
      id: 'd8888888-8888-4888-d888-888888888888',
      company_id: NEXUS_COMPANY_ID,
      card_number: '5S-008',
      findings: 'Repuestos críticos de mordazas de sellado sin etiquetado de dimensiones ni código de pieza',
      area: 'Taller Mecánico',
      category: 'Seiton',
      priority: 'Baja',
      responsible: 'Alejandro Oscar Ureta Perez',
      status: 'En Proceso',
      description: 'Dificulta la sustitución rápida durante paradas no programadas. Acción: rotular gavetas con código de parte y stock mínimo/máximo.',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      image_urls: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'],
      created_at: '2026-10-12T15:30:00Z',
    },
  ];

  for (const c of fiveSCards) {
    const { error } = await supabase.from('five_s_cards').upsert(c);
    if (error) console.error('Error upserting 5S card:', c.card_number, error);
    else console.log('✅ 5S Card upserted:', c.card_number, c.findings.slice(0, 40) + '...');
  }

  // =========================================================================
  // 5. QUICK WINS (KAIZEN RÁPIDO) CON MÉTRICAS E IMPACTO REAL
  // =========================================================================
  console.log('\n--- 5. Seeding Quick Wins for Nexus ---');
  const quickWins = [
    {
      id: 'e1111111-1111-4111-e111-111111111111',
      company_id: NEXUS_COMPANY_ID,
      title: 'Dispensadores de film strech con corte automático en mesa de empaque',
      description: 'Los operadores cortaban el film con cuchillos cartoneros manuales, provocando mermas de plástico y riesgo de cortes en dedos.',
      proposed_solution: 'Instalar dispensador industrial fijo con cuchilla oculta de guillotina protegida.',
      impact: 'Alto',
      impact_score: 9,
      effort_score: 2,
      category: 'Ergonomía & Seguridad',
      responsible: 'Alexis Inzunza Vergara',
      date: '2026-10-05',
      deadline: '2026-10-12',
      status: 'done',
      completed_at: '2026-10-12T17:00:00Z',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      completion_image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
      completion_comment: 'Dispensador instalado en mesa 1 y 2. Redujo 25% el tiempo de embalaje y eliminó el riesgo de cortes.',
    },
    {
      id: 'e2222222-2222-4222-e222-222222222222',
      company_id: NEXUS_COMPANY_ID,
      title: 'Codificación con colores de tuberías de aire comprimido y agua purificada',
      description: 'Confusión en mantenimiento al purgar líneas durante el lavado general de sala de procesos.',
      proposed_solution: 'Aplicar anillos adhesivos de vinilo de alto tráfico según norma chilena (Azul = Aire, Verde = Agua).',
      impact: 'Medio',
      impact_score: 7,
      effort_score: 2,
      category: 'Gestión Visual',
      responsible: 'Alejandro Oscar Ureta Perez',
      date: '2026-10-08',
      deadline: '2026-10-14',
      status: 'done',
      completed_at: '2026-10-14T15:30:00Z',
      image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=800&q=80',
      completion_image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      completion_comment: 'Tuberías 100% identificadas en sala de máquinas y líneas 1 y 2.',
    },
    {
      id: 'e3333333-3333-4333-e333-333333333333',
      company_id: NEXUS_COMPANY_ID,
      title: 'Carro rodante ergonómico porta-bobinas para cambio en Envasadora 2',
      description: 'Las bobinas de film pesan 32 kg y requerían ser cargadas a pulso por dos operarios hasta el soporte superior.',
      proposed_solution: 'Fabricar carro con elevador de tornillo sinfín accionado por pedal para montaje a nivel de máquina.',
      impact: 'Alto',
      impact_score: 9,
      effort_score: 5,
      category: 'SMED / Ergonomía',
      responsible: 'Vicente Osorio',
      date: '2026-10-12',
      deadline: '2026-10-25',
      status: 'in_progress',
      image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      completion_comment: null,
    },
    {
      id: 'e4444444-4444-4444-e444-444444444444',
      company_id: NEXUS_COMPANY_ID,
      title: 'Plantilla de corte calibrada para sellado de cajas maestras de cartón',
      description: 'Variabilidad en el traslape de cinta adhesiva generaba cajas abiertas durante el apilamiento en pallets.',
      proposed_solution: 'Diseñar plantilla acrílica guía con marcas visuales de 5 cm de traslape estándar.',
      impact: 'Medio',
      impact_score: 6,
      effort_score: 2,
      category: 'Estandarización',
      responsible: 'Equipo be lean',
      date: '2026-10-10',
      deadline: '2026-10-16',
      status: 'done',
      completed_at: '2026-10-16T11:20:00Z',
      image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
      completion_image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
      completion_comment: 'Reclamos por cajas abiertas cayeron a cero en auditoría semanal.',
    },
    {
      id: 'e5555555-5555-4555-e555-555555555555',
      company_id: NEXUS_COMPANY_ID,
      title: 'Checklist digital pre-operacional en tablet de andén de despacho',
      description: 'Pautas en papel se extraviaban o completaban al final del día sin valor preventivo.',
      proposed_solution: 'Formulario web responsive directo en la tablet del supervisor de andén.',
      impact: 'Alto',
      impact_score: 8,
      effort_score: 4,
      category: 'Digitalización Lean',
      responsible: 'Alexis Inzunza Vergara',
      date: '2026-10-14',
      deadline: '2026-10-30',
      status: 'in_progress',
      image_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      completion_comment: null,
    },
    {
      id: 'e6666666-6666-4666-e666-666666666666',
      company_id: NEXUS_COMPANY_ID,
      title: 'Estaciones de segregación de residuos ecológicos en puntos de generación',
      description: 'Los operarios debían caminar hasta el patio trasero para depositar restos de film limpio y zunchos plásticos.',
      proposed_solution: 'Instalar 3 recipientes rotulados con ruedas en la cabecera de cada línea.',
      impact: 'Bajo',
      impact_score: 5,
      effort_score: 1,
      category: 'Sostenibilidad & 5S',
      responsible: 'Vicente Osorio',
      date: '2026-10-15',
      deadline: '2026-11-05',
      status: 'idea',
      image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      completion_comment: null,
    },
  ];

  for (const q of quickWins) {
    const { error } = await supabase.from('quick_wins').upsert(q);
    if (error) console.error('Error upserting quick win:', q.title, error);
    else console.log('✅ Quick Win upserted:', q.title);
  }

  // =========================================================================
  // 6. VALUE STREAM MAPPING (VSM_PROJECTS)
  // =========================================================================
  console.log('\n--- 6. Seeding / Updating VSM Projects for Nexus ---');
  const vsmProjects = [
    {
      id: '33195de3-270c-4035-b388-c925a7a0b684',
      company_id: NEXUS_COMPANY_ID,
      name: 'VSM Operacional: Cadena de Despacho y Logística B2B',
      responsible: 'Alexis Inzunza Vergara',
      status: 'current',
      lead_time: '4.2 horas',
      process_time: '48 minutos',
      efficiency: '19.0%',
      takt_time: '12 min/pallet',
      description: 'Mapeo del flujo de valor desde la recepción de la orden en ERP hasta la carga física en andén. El cuello de botella principal se ubicaba en la consolidación manual de pallets.',
      date: '2026-09-20',
    },
    {
      id: '6dec9d59-5407-4fae-b41d-fa0749461b26',
      company_id: NEXUS_COMPANY_ID,
      name: 'VSM Productivo: Línea de Dosificación y Envasado 2',
      responsible: 'Vicente Osorio',
      status: 'current',
      lead_time: '2.5 días',
      process_time: '115 minutos',
      efficiency: '9.5%',
      takt_time: '45 seg/unidad',
      description: 'Flujo de valor desde mezcla inicial de insumos hasta almacenamiento en bodega. Detecta alto inventario intermedio en espera de liberación de análisis microbiológico.',
      date: '2026-09-28',
    },
    {
      id: '326f6f79-2c93-495d-ae77-54e7c4d2833f',
      company_id: NEXUS_COMPANY_ID,
      name: 'VSM Futuro: Flujo Continuo One-Piece Flow en Empaque',
      responsible: 'Equipo be lean',
      status: 'completed',
      lead_time: '1.2 horas',
      process_time: '42 minutos',
      efficiency: '58.3%',
      takt_time: '10 min/pallet',
      description: 'Diseño del estado futuro con células en U, sincronización de transporte mediante carros Kanban y eliminación del 65% del inventario en proceso (WIP).',
      date: '2026-10-10',
    },
  ];

  for (const v of vsmProjects) {
    const { error } = await supabase.from('vsm_projects').upsert(v);
    if (error) console.error('Error upserting VSM project:', v.name, error);
    else console.log('✅ VSM Project upserted:', v.name);
  }

  console.log('\n🎉 ALL NEXUS LEAN DEMO DATA SUCCESSFULLY SEEDED!');
}

runSeed().catch((err) => {
  console.error('Fatal error running seed script:', err);
  process.exit(1);
});
