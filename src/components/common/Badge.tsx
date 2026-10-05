import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

const BADGE_VARIANTS = {
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  slate: 'bg-slate-800 text-slate-300 border-slate-700',
  indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
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
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
