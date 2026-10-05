import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Zap,
  Activity,
  FileText,
  Users,
  Building2,
  Bot,
  Settings,
  WifiOff,
} from 'lucide-react';
import type { ElementType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ElementType;
  badge?: string;
  moduleCode?: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Tarjetas 5S',
    href: '/5s-cards',
    icon: ClipboardList,
    moduleCode: '5s',
  },
  {
    name: 'Auditorías 5S',
    href: '/5s-audits',
    icon: ShieldCheck,
    moduleCode: 'audits',
  },
  {
    name: 'Quick Wins',
    href: '/quick-wins',
    icon: Zap,
    moduleCode: 'quick_wins',
  },
  {
    name: 'Proyectos A3',
    href: '/a3-projects',
    icon: FileText,
    moduleCode: 'a3',
  },
  {
    name: 'VSM (Cadena Valor)',
    href: '/vsm',
    icon: Activity,
    moduleCode: 'vsm',
  },
  {
    name: 'Responsables',
    href: '/responsables',
    icon: Users,
  },
  {
    name: 'Consultor Lean IA',
    href: '/consultant',
    icon: Bot,
    badge: 'AI',
  },
];

export const OFFLINE_NAV_ITEMS: NavItem[] = [
  {
    name: 'Modo Offline',
    href: '/offline',
    icon: WifiOff,
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Usuarios',
    href: '/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    name: 'Empresas',
    href: '/admin/companies',
    icon: Building2,
    ownerOnly: true,
  },
  {
    name: 'Configuración',
    href: '/admin/settings',
    icon: Settings,
    adminOnly: true,
  },
];
