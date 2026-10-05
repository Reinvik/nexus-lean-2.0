# Nexus Lean 2.0 (Excelencia Operacional)

Nexus Lean 2.0 es la evolución de alto rendimiento de la plataforma de excelencia operacional y mejora continua Nexus Lean.

Esta versión mantiene el **100% de la identidad de diseño**, flujos y funcionalidades clave de la versión original, pero construida bajo una **arquitectura modular (*Feature-Driven*)**, tipado estricto con TypeScript, división de código inteligente (*code-splitting*) y sincronización offline de alto desempeño.

---

## 🚀 Mejoras Principales respecto a la versión 1.0

| Característica | Nexus Lean 1.0 | Nexus Lean 2.0 |
| :--- | :--- | :--- |
| **Arquitectura** | Monolítica (`FiveS.jsx` de 2.830 líneas) | Modular por características (`src/features/*`) |
| **Lenguaje** | Mezcla híbrida de `.jsx` y `.tsx` duplicados | **100% TypeScript estricto** de extremo a extremo |
| **Estado Global** | `DataContext.jsx` centralizado de 400+ líneas | Hooks atómicos (`useFiveSCards`, `useAudits`, etc.) |
| **Fluidez y Re-renders** | Re-renderizado masivo al escribir o filtrar | Aislado por componente, carga en milisegundos |
| **Offline / PWA** | IndexedDB manual con transacciones crudas | **Dexie.js** con tipado de entidades y cola de sincronización |
| **Carga Inicial** | Bundles pesados descargados de golpe | **Lazy Loading granular** (modales y gráficos bajo demanda) |
| **Tiempo de Build** | Lento y con advertencias de tamaño | **Build en ~10 segundos** con chunks optimizados |

---

## 📂 Estructura del Código

```text
nexus-lean-2.0/
├── public/                 # Logos, iconos PWA y manifiesto
├── src/
│   ├── components/
│   │   ├── common/         # StatCard, Button, Badge, Modal, LoadingScreen
│   │   └── layout/         # Sidebar, Header, MainLayout, ProtectedRoute
│   ├── config/             # navigation.ts (rutas, permisos y menús)
│   ├── context/            # AuthContext.tsx (autenticación y tenant)
│   ├── features/
│   │   ├── auth/           # Login con pantalla dividida y quotes Lean
│   │   ├── dashboard/      # Métricas ejecutivas y accesos directos
│   │   ├── fives/          # Tarjetas 5S (Item, Filtros, Modal, Hook, Servicio)
│   │   ├── audits/         # Auditorías 5S (Radar de Madurez, Evaluación, KPIs)
│   │   ├── quick-wins/     # Matriz Kaizen de mejoras rápidas
│   │   ├── a3/             # Proyectos A3 y resolución de problemas PDCA
│   │   ├── vsm/            # Mapeo de flujo de valor y Takt Time
│   │   ├── responsables/   # Panel de asignaciones por colaborador
│   │   ├── consultant/     # Consultor IA con Gemini
│   │   ├── offline/        # Centro de sincronización y cola local Dexie
│   │   └── admin/          # Gestión de Usuarios y Empresas
│   ├── lib/
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── db.ts           # Base de datos local Dexie (IndexedDB)
│   │   └── utils.ts        # Funciones auxiliares y formateadores
│   ├── types/              # Modelos y contratos de TypeScript
│   ├── App.tsx             # Enrutamiento protegido y Toaster
│   ├── index.css           # Tema oscuro Nexus con degradados cyan/índigo
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts          # Configuración Vite + PWA + Puerto 3204
```

---

## 🛠️ Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo (Puerto 3204)
npm run dev

# Compilar para producción (TypeScript check + Vite bundle)
npm run build

# Previsualizar build de producción
npm run preview
```
