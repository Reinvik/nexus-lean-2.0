import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

const BADGE_VARIANTS = {
  cyan: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  amber: 'bg-amber-100 text-amber-900 border-amber-300',
  rose: 'bg-rose-100 text-rose-900 border-rose-300',
  slate: 'bg-slate-200 text-slate-900 border-slate-300',
  indigo: 'bg-indigo-100 text-indigo-900 border-indigo-300',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold border rounded-full shadow-2xs',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
