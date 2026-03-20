import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart3, FileText, Shield, Users, ClipboardList, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function MobileNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  const links = [
    { to: '/', label: 'Dashboard', icon: BarChart3 },
    { to: '/status', label: 'Status', icon: ClipboardList },
    { to: '/apply', label: 'Apply', icon: FileText },
    ...(role === 'de' ? [{ to: '/de', label: 'DE Panel', icon: Users }] : []),
    ...(role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl">
        {/* Main Nav Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.ico" alt="MultiChoice Africa" className="h-8 w-auto" />
            <span className="font-display font-bold text-lg text-foreground hidden sm:inline">MultiChoice</span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* User Actions - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-1" /> Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm">
                  <LogIn className="h-4 w-4 mr-1" /> Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <nav className="border-t bg-card px-4 py-2 space-y-1 md:hidden">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t">
              {user ? (
                <div className="space-y-1">
                  <p className="px-3 text-xs text-muted-foreground truncate">{user.email}</p>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary"
                >
                  <LogIn className="h-4 w-4" /> Sign In
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
