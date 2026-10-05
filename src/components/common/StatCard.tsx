import React from 'react';

export type StatCardVariant =
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'indigo'
  | 'purple'
  | 'yellow';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactElement | React.ElementType;
  variant?: StatCardVariant;
  accentColor?: string;
  type?: 'solid' | 'light';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant,
  accentColor,
  type = 'solid',
  className = '',
}) => {
  // Map accentColor to variant if variant was not specified
  const effectiveVariant: StatCardVariant =
    variant ||
    (accentColor === 'cyan'
      ? 'blue'
      : accentColor === 'emerald'
      ? 'green'
      : accentColor === 'amber'
      ? 'yellow'
      : accentColor === 'rose'
      ? 'red'
      : accentColor === 'indigo'
      ? 'indigo'
      : 'blue');
  // Solid Colors Variants (High Impact)
  const solidVariants: Record<StatCardVariant, string> = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30',
    green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30',
    orange: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/30',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30',
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/30',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/30',
    yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-yellow-500/30',
  };

  // Outlined/Light Variants (Subtle)
  const lightVariants: Record<StatCardVariant, string> = {
    blue: 'bg-white border-blue-100 text-slate-800',
    green: 'bg-white border-emerald-100 text-slate-800',
    orange: 'bg-white border-amber-100 text-slate-800',
    red: 'bg-white border-red-100 text-slate-800',
    indigo: 'bg-white border-indigo-100 text-slate-800',
    purple: 'bg-white border-purple-100 text-slate-800',
    yellow: 'bg-white border-yellow-100 text-slate-800',
  };

  const iconColors: Record<StatCardVariant, string> = {
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-emerald-500 bg-emerald-50',
    orange: 'text-amber-500 bg-amber-50',
    red: 'text-red-500 bg-red-50',
    indigo: 'text-indigo-500 bg-indigo-50',
    purple: 'text-purple-500 bg-purple-50',
    yellow: 'text-yellow-500 bg-yellow-50',
  };

  const renderIcon = (size: number) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, { size });
    }
    const IconComp = icon as React.ElementType;
    return <IconComp size={size} />;
  };

  if (type === 'solid') {
    const baseClass = solidVariants[effectiveVariant] || solidVariants.blue;
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${baseClass} ${className}`}
      >
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <p className="text-sm font-medium opacity-90 tracking-wide uppercase mb-1 font-sans">
              {title}
            </p>
            <h3 className="text-4xl font-bold tracking-tight mb-2 font-sans">{value}</h3>
          </div>
          {subtitle && (
            <p className="text-sm font-medium opacity-80 bg-white/10 w-fit px-2 py-1 rounded backdrop-blur-sm">
              {subtitle}
            </p>
          )}
        </div>
        {/* Decorative Background Icon */}
        <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12 scale-150 pointer-events-none">
          {renderIcon(100)}
        </div>
        {/* Decorative Gradient Circles */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl pointer-events-none" />
      </div>
    );
  }

  // Default 'light' or 'outlined' style
  const baseClass = lightVariants[effectiveVariant] || lightVariants.blue;
  const iconClass = iconColors[effectiveVariant] || iconColors.blue;

  return (
    <div
      className={`rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md ${baseClass} ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider font-sans">
            {title}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-sans">{value}</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconClass}`}>{renderIcon(24)}</div>
      </div>
      {subtitle && <div className="text-sm text-slate-500 font-medium">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
