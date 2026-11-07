import { LogOut } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/labels';

// Shell for every signed-in screen: header on top, the current page below.
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground shadow-sm">
        <Link to={homePathFor(user.role)}>
          <p className="font-bold">Brújula</p>
          <p className="text-sm opacity-90">
            {user.name} · {ROLE_LABELS[user.role]}
          </p>
        </Link>
        <Button variant="ghost" size="lg" onClick={logout} className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
          <LogOut />
          Salir
        </Button>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
