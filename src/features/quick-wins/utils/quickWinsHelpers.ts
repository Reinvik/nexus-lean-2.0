// Quick Wins Utility Functions and Constants

export const ensureArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return [val];
    }
  }
  return [];
};

export const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'Alto':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    case 'Medio':
      return 'bg-amber-50 text-amber-600 border-amber-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

export interface CategoryStyle {
  borderLeft: string;
  bg: string;
  text: string;
  lightBg: string;
  dotBg: string;
  label: string;
}

export const CATEGORIES: Record<string, CategoryStyle> = {
  operacional: {
    borderLeft: 'border-l-rose-500',
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    lightBg: 'bg-rose-50',
    dotBg: 'bg-rose-500',
    label: 'Operacional'
  },
  almacen: {
    borderLeft: 'border-l-orange-400',
    bg: 'bg-orange-400',
    text: 'text-orange-500',
    lightBg: 'bg-orange-50',
    dotBg: 'bg-orange-400',
    label: 'Almacén'
  },
  proceso: {
    borderLeft: 'border-l-amber-500',
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    lightBg: 'bg-amber-50',
    dotBg: 'bg-amber-500',
    label: 'Proceso'
  },
  sistemico: {
    borderLeft: 'border-l-blue-500',
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    lightBg: 'bg-blue-50',
    dotBg: 'bg-blue-500',
    label: 'Sistémico'
  },
  fisica: {
    borderLeft: 'border-l-emerald-500',
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    lightBg: 'bg-emerald-50',
    dotBg: 'bg-emerald-500',
    label: 'Física'
  },
  general: {
    borderLeft: 'border-l-slate-400',
    bg: 'bg-slate-400',
    text: 'text-slate-600',
    lightBg: 'bg-slate-50',
    dotBg: 'bg-slate-400',
    label: 'General'
  }
};

export const getCategoryStyles = (cat?: string | null): CategoryStyle => {
  if (!cat) return CATEGORIES.general;
  const key = cat.toLowerCase();
  return CATEGORIES[key] || CATEGORIES.general;
};

export interface CauseColumnDef {
  id: string;
  title: string;
  bg: string;
  border: string;
  headerBg: string;
  text: string;
}

export const CAUSES_COLUMNS: CauseColumnDef[] = [
  {
    id: 'infra',
    title: 'Infraestructura',
    bg: 'bg-slate-200/50',
    border: 'border-slate-300',
    headerBg: 'bg-slate-300',
    text: 'text-slate-800'
  },
  {
    id: 'nodef',
    title: 'No Definido',
    bg: 'bg-rose-50/50',
    border: 'border-rose-200',
    headerBg: 'bg-rose-100',
    text: 'text-rose-800'
  },
  {
    id: 'maldef',
    title: 'Mal Definido',
    bg: 'bg-amber-50/50',
    border: 'border-amber-200',
    headerBg: 'bg-amber-100',
    text: 'text-amber-800'
  },
  {
    id: 'nocumple',
    title: 'Definido, no se cumple',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-100',
    text: 'text-emerald-800'
  },
  {
    id: 'sistemico',
    title: 'Sistémico',
    bg: 'bg-indigo-50/50',
    border: 'border-indigo-200',
    headerBg: 'bg-indigo-100',
    text: 'text-indigo-800'
  }
];
