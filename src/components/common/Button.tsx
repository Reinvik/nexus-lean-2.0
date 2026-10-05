import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-[0.98]',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold active:scale-[0.98]',
  danger:
    'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold active:scale-[0.98]',
  ghost:
    'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white',
  outline:
    'bg-transparent hover:bg-slate-800/50 text-cyan-400 border border-cyan-500/40 font-semibold',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-xs rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-xl gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
