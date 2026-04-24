import { NavLink, Outlet } from 'react-router-dom';
import { Home, ShoppingCart, TrendingUp, Receipt, Menu, LogOut, Shield, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const allTabs = [
  { to: '/', icon: Home, label: 'Home', always: true },
  { to: '/purchase', icon: ShoppingCart, label: 'Purchase', adminOnly: true },
  { to: '/sale', icon: TrendingUp, label: 'Sale', adminOnly: true },
  { to: '/expense', icon: Receipt, label: 'Expense', adminOnly: true },
  { to: '/settings', icon: Menu, label: 'More', always: true },
];

export default function Layout() {
  const { isAdmin, signOut, user } = useAuth();
  const tabs = allTabs.filter(t => t.always || (t.adminOnly && isAdmin));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-1.5 text-xs">
          {isAdmin ? <Shield className="h-3.5 w-3.5 text-primary" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-medium">{isAdmin ? 'Admin' : 'Viewer'}</span>
          <span className="text-muted-foreground">· {user?.email}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={signOut} className="h-7 px-2">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
