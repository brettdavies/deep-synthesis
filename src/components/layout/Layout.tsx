import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import SidebarNav from './SidebarNav';

const Layout: React.FC = () => {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <aside className="w-64 border-r border-sidebar-border flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-background)' }}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="text-xl font-bold text-sidebar-foreground hover:text-sidebar-muted">
              Deep Synthesis
            </Link>
          </div>
          
          <SidebarNav />
          
          <div className="p-4 border-t border-sidebar-border mt-auto">
            <p className="text-sm text-gray-400 text-center">
              All data is stored locally
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background text-foreground overflow-auto h-screen">
        <div className="p-6 h-full flex justify-center">
          <div className="w-full max-w-[90%] h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout; 