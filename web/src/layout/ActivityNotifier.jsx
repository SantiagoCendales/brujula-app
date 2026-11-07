import { BellRing, FileCheck, Inbox, MapPin, PackageCheck, Undo2 } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/roles';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';

const VIBRATION_MS = 200;
const TOAST_DURATION_MS = 12_000;

// What each role gets notified about. The first matching rule wins; nobody is notified of their own actions.
const RULES = [
  {
    roles: ['technician'],
    matches: (event, me) => ['created', 'assigned'].includes(event.change) && event.technician_id === me.id,
    title: 'Nueva actividad asignada',
    Icon: BellRing,
  },
  {
    roles: ['technician'],
    matches: (event, me) => event.change === 'returned' && event.technician_id === me.id,
    title: 'El CEC devolvió un informe',
    Icon: Undo2,
  },
  {
    roles: ['coordinator', 'admin'],
    matches: (event) => event.change === 'arrived',
    title: 'Un técnico llegó al sitio',
    Icon: MapPin,
  },
  {
    roles: ['coordinator', 'admin'],
    matches: (event) => event.change === 'created' && event.status === 'requested',
    title: 'Nueva solicitud de servicio',
    Icon: Inbox,
  },
  {
    roles: ['coordinator', 'admin'],
    matches: (event) => event.change === 'validated',
    title: 'Informe validado: listo para entregar',
    Icon: PackageCheck,
  },
  {
    roles: ['cec', 'admin'],
    matches: (event) => event.change === 'finished',
    title: 'Nuevo informe para validar',
    Icon: FileCheck,
  },
  {
    roles: ['cec', 'admin'],
    matches: (event) => event.change === 'resubmitted',
    title: 'Informe corregido para validar',
    Icon: FileCheck,
  },
  {
    roles: ['client'],
    matches: (event) => event.change === 'arrived',
    title: 'El técnico llegó a tu vehículo',
    Icon: MapPin,
  },
  {
    roles: ['client'],
    matches: (event) => event.change === 'delivered',
    title: 'Tu informe está listo',
    Icon: PackageCheck,
  },
];

function NotificationToast({ Icon, title, activity, onView, onDismiss }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-lg">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {activity && (
          <>
            <p className="mt-0.5 truncate text-sm">
              <span className="font-mono font-semibold tracking-wide">{activity.vehicle.plate}</span>
              <span className="text-muted-foreground"> · {ACTIVITY_TYPE_LABELS[activity.type]}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {activity.performed_by?.name ?? activity.company.name}
              {activity.scheduled_for && ` · ${formatDateTime(activity.scheduled_for)}`}
            </p>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="lg" onClick={onView}>
            Ver actividad
          </Button>
          <Button size="lg" variant="ghost" onClick={onDismiss}>
            Después
          </Button>
        </div>
      </div>
    </div>
  );
}

// Shows a notification (and vibrates on phones) for the live changes that matter to the signed-in role,
// whatever screen they are on. Renders nothing itself.
export default function ActivityNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const notify = useCallback(
    async (event) => {
      if (event.actor_id === user.id) return;
      const rule = RULES.find((candidate) => candidate.roles.includes(user.role) && candidate.matches(event, user));
      if (!rule) return;

      navigator.vibrate?.(VIBRATION_MS);
      const { activity } = await request(`/activities/${event.activity_id}`).catch(() => ({ activity: null }));
      const detailPath = `${homePathFor(user.role)}/activities/${event.activity_id}`;
      toast.custom(
        (toastId) => (
          <NotificationToast
            Icon={rule.Icon}
            title={rule.title}
            activity={activity}
            onView={() => {
              toast.dismiss(toastId);
              navigate(detailPath);
            }}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: TOAST_DURATION_MS },
      );
    },
    [user, navigate],
  );

  useActivityChanges(notify);
  return null;
}
