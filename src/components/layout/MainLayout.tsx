import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen md:h-screen w-full bg-slate-50 flex-col md:flex-row md:overflow-hidden">
      {/* Mobile Header - Fixed at top */}
      <div className="md:hidden bg-[#050B14] text-white h-16 flex items-center justify-between px-4 shrink-0 z-30 shadow-md border-b border-[#1E293B] sticky top-0">
        <div className="flex items-center gap-2">
          <img src="/nexus-logo.svg" alt="Nexus Lean" className="w-auto h-8" />
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
