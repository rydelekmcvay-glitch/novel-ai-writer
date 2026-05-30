import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Settings, History, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'react-hot-toast';

const navItems = [
  { to: '/', icon: BookOpen, label: '我的书库' },
  { to: '/history', icon: History, label: '历史记录' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left nav bar */}
      <aside className="flex flex-col items-center w-16 border-r border-border bg-card py-4 gap-2 shrink-0">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-4">
          <PenLine className="w-5 h-5 text-primary" />
        </Link>

        {navItems.map(({ to, icon: Icon, label }) => {
          const active =
            to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              title={label}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(240 10% 12%)',
            color: 'hsl(0 0% 95%)',
            border: '1px solid hsl(240 3.7% 20%)',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#f59e0b', secondary: '#09090b' } },
        }}
      />
    </div>
  );
}
