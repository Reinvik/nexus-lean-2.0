import React from 'react';
import { Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderWithFilterProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const HeaderWithFilter: React.FC<HeaderWithFilterProps> = ({
  title,
  subtitle,
  children,
  className = '',
  compact = false,
}) => {
  const { user, companies, globalFilterCompanyId, setGlobalFilterCompanyId } = useAuth();

  // Only SuperAdmin (platform owner) can see and switch between all companies
  const canSwitchCompanies = Boolean(user?.isGlobalAdmin);

  return (
    <header
      className={`page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
        compact ? 'mb-2 pb-0 border-b-0' : 'mb-6 border-b border-gray-100 pb-4'
      } ${className}`}
    >
      <div>
        <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-800 tracking-tight font-sans`}>{title}</h2>
        {subtitle && <p className={`text-gray-500 font-medium ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>{subtitle}</p>}
      </div>

      {/* Unified Toolbar Container */}
      <div className={`flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1 ${compact ? 'h-[40px]' : 'h-[50px]'}`}>
        {/* 1. Action Buttons - Passed as children */}
        <div className="flex items-center px-1">{children}</div>

        {/* Divider (Only if selector is visible) */}
        {canSwitchCompanies && companies.length > 0 && children && (
          <div className="h-5 w-px bg-slate-200 mx-1"></div>
        )}

        {/* 2. Company Selector */}
        {canSwitchCompanies && companies.length > 0 && (
          <div className="relative group">
            <div className={`flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-lg transition-colors hover:bg-slate-50 cursor-pointer ${compact ? 'min-w-[170px]' : 'min-w-[200px]'}`}>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
                <Building size={compact ? 15 : 16} />
              </div>
              <select
                value={globalFilterCompanyId || ''}
                onChange={(e) => setGlobalFilterCompanyId(e.target.value || null)}
                className="bg-transparent border-none text-xs md:text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none w-full p-0 py-0.5 truncate appearance-none"
              >
                {[...new Map(companies.map((item) => [item.id, item])).values()].map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {/* Custom Arrow */}
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderWithFilter;
