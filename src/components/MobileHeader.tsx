import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, LayoutDashboard, ClipboardList, FilePlus, LogOut, BookOpen } from 'lucide-react';
import logo from '@/assets/logo.png';

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isElevated, role, signOut } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/requisitions', label: isElevated ? 'All Requisitions' : 'My Requisitions', icon: ClipboardList },
    { to: '/requisitions/new', label: 'New Request', icon: FilePlus },
    ...(role === 'accountant' ? [{ to: '/cashbook', label: 'Cashbook', icon: BookOpen }] : []),
  ];

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Brainstake" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-heading font-bold">Brainstake</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <nav className="px-3 pb-3 space-y-1 animate-fade-in">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 w-full"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </nav>
      )}
    </header>
  );
}
