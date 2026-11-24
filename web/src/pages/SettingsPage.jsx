import { Bell, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import { Card, CardContent } from '@/components/ui/card';

function SettingsLink({ to, Icon, children }) {
  return (
    <li>
      <Link to={to} className="block transition-transform active:scale-[0.99]">
        <Card size="sm">
          <CardContent className="flex min-h-12 items-center gap-3">
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-medium">{children}</span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const home = homePathFor(user.role);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <ul className="flex flex-col gap-3">
        <SettingsLink to={`${home}/settings/notifications`} Icon={Bell}>Notificaciones</SettingsLink>
        {['admin', 'coordinator'].includes(user.role) && (
          <SettingsLink to="/coordinator/permissions" Icon={ShieldCheck}>Permisos por rol</SettingsLink>
        )}
      </ul>
    </section>
  );
}
