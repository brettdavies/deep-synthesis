import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Layout: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Deep Synthesis</Link>
          <nav className="flex space-x-1">
            <Button 
              variant={isActive('/') ? "default" : "ghost"} 
              asChild
            >
              <Link to="/">Home</Link>
            </Button>
            <Button 
              variant={isActive('/library') ? "default" : "ghost"} 
              asChild
            >
              <Link to="/library">Library</Link>
            </Button>
            <Button 
              variant={isActive('/settings') ? "default" : "ghost"} 
              asChild
            >
              <Link to="/settings">Settings</Link>
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
      
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>Deep Synthesis - Research Report Generator</p>
          <p className="mt-1">All data is stored locally in your browser</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 