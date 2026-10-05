import React from 'react';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user, companies, activeCompanyId } = useAuth();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-[#070D18]/90 backdrop-blur-md border-b border-slate-800/80 shrink-0">
      {/* Mobile Menu Button + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        <div className="md:hidden flex items-center gap-2">
          <img src="/nexus-logo.svg" alt="Nexus Lean" className="w-7 h-7" />
          <span className="font-bold text-sm text-white tracking-wide">
            Nexus <span className="text-cyan-400">Lean 2.0</span>
          </span>
        </div>
      </div>

      {/* Right Controls: Online status, Active Company badge */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Network Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
          }`}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Current Company Display (Desktop) */}
        {currentCompany && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="truncate max-w-[150px]">{currentCompany.name}</span>
          </div>
        )}

        {/* User initials bubble */}
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-cyan-300">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Header;
