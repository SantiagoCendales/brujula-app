import { Bell, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import BrujulaLogo from '@/components/BrujulaLogo';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toaster } from '@/components/ui/sonner';
import ActivityNotifier from '@/layout/ActivityNotifier';
import NotificationsPanel from '@/layout/NotificationsPanel';
import { ROLE_LABELS } from '@/lib/labels';
import { useActivityChanges, useLiveStatus } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

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
  const isSettings = pathname === '/coordinator/settings' || pathname === '/coordinator/permissions';
  const active = isSettings ? undefined : tabs
    .filter((tab) => pathname.startsWith(tab.to))
    .sort((first, second) => second.to.length - first.to.length)[0];

  return (
    <nav aria-label="Navegación principal" className="flex gap-2 border-b bg-muted px-2 pt-2 pb-4">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={tab === active ? 'page' : undefined}
          className={`relative flex min-h-11 flex-1 items-center justify-center rounded-full border px-2 text-center font-medium transition-colors before:pointer-events-none before:absolute before:inset-x-3 before:top-[calc(100%+3px)] before:h-1.5 before:rounded-full before:blur-[3px] focus-visible:outline-2 focus-visible:outline-ring ${
            tab === active
              ? 'border-transparent bg-primary/95 font-semibold text-primary-foreground before:bg-foreground/40'
              : 'border-border bg-background text-foreground before:bg-foreground/20 hover:bg-muted'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function NotificationsButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useApi('/notifications/unread-count');
  useActivityChanges(reload);
  useEffect(() => { reload(); }, [pathname, reload]);

  function closeAfterRead() {
    setOpen(false);
    reload();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="relative size-12 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
          aria-label={data?.count ? `Notificaciones, ${data.count} sin leer` : 'Notificaciones'}
        >
          <Bell />
          {data?.count > 0 && (
            <span className="absolute top-0 right-0 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">
              {data.count > 99 ? '99+' : data.count}
            </span>
          )}
          {error && <span className="sr-only">No se pudo cargar el contador.</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <ErrorMessage>{error?.message}</ErrorMessage>
        <NotificationsPanel onOpenActivity={closeAfterRead} />
      </PopoverContent>
    </Popover>
  );
}

function LiveIndicator() {
  const status = useLiveStatus();
  const isLive = status === 'live';
  return (
    <span className="flex items-center gap-1.5 text-xs opacity-90" title={isLive ? 'Recibiendo cambios en tiempo real' : 'Sin conexión en vivo'}>
      <span className={`size-2 rounded-full ${isLive ? 'animate-pulse bg-emerald-300' : 'bg-amber-300'}`} />
      {isLive ? 'En vivo' : 'Reconectando…'}
    </span>
  );
}

// Shell for every signed-in screen: header and tabs on top, the current page below.
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="sticky top-0 z-10 shadow-sm">
        <header className="flex items-center justify-between bg-primary px-4 pt-[calc(0.75rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] pb-3 text-primary-foreground">
          <Link to={homePathFor(user.role)} className="flex min-w-0 items-center gap-3">
            <BrujulaLogo className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-bold">
                Brújula <LiveIndicator />
              </p>
              <p className="truncate text-sm opacity-90">
                {user.name} · {ROLE_LABELS[user.role]}
              </p>
            </div>
          </Link>
          <div className="flex items-center">
            <NotificationsButton />
            {['admin', 'coordinator'].includes(user.role) && (
              <Button asChild variant="ghost" size="icon-lg" className="size-12 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                <Link to="/coordinator/settings" aria-label="Configuración"><Settings /></Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              onClick={logout}
              aria-label="Salir"
              className="size-12 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            >
              <LogOut />
            </Button>
          </div>
        </header>
        <NavTabs role={user.role} />
      </div>
      <main className="p-4 pb-[calc(1rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]">
        <Outlet />
      </main>
      <Toaster
        position="top-center"
        offset={{ top: 'calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))' }}
        mobileOffset={{ top: 'calc(0.75rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))', left: 12, right: 12 }}
      />
      <ActivityNotifier />
    </div>
  );
}
