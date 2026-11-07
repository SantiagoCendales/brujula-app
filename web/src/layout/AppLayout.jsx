import { LogOut } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/labels';

const TABS = {
  coordinator: [
    { to: '/coordinator', label: 'Actividades' },
    { to: '/coordinator/vehicles', label: 'Vehículos' },
  ],
  technician: [
    { to: '/technician', label: 'Pendientes' },
    { to: '/technician/history', label: 'Mi historial' },
  ],
  cec: [
    { to: '/cec', label: 'Actividades' },
    { to: '/cec/vehicles', label: 'Vehículos' },
  ],
  client: [
    { to: '/client', label: 'Mis servicios' },
    { to: '/client/vehicles', label: 'Mis vehículos' },
  ],
};
TABS.admin = TABS.coordinator;

function NavTabs({ role }) {
  const { pathname } = useLocation();
  const tabs = TABS[role] ?? [];
  // The longest matching prefix wins, so /coordinator/vehicles/3 lights "Vehículos" and /coordinator/activities/3 "Actividades".
  const active = tabs
    .filter((tab) => pathname.startsWith(tab.to))
    .sort((first, second) => second.to.length - first.to.length)[0];

  return (
    <nav className="flex border-b bg-card">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={`flex-1 border-b-2 py-3 text-center font-medium ${
            tab === active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// Shell for every signed-in screen: header and tabs on top, the current page below.
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="sticky top-0 z-10 shadow-sm">
        <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
          <Link to={homePathFor(user.role)}>
            <p className="font-bold">Brújula</p>
            <p className="text-sm opacity-90">
              {user.name} · {ROLE_LABELS[user.role]}
            </p>
          </Link>
          <Button
            variant="ghost"
            size="lg"
            onClick={logout}
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          >
            <LogOut />
            Salir
          </Button>
        </header>
        <NavTabs role={user.role} />
      </div>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
