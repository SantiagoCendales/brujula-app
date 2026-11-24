import { BellRing, CarFront, CircleCheckBig, CircleX, FileCheck, Inbox, MapPin, PackageCheck, Undo2 } from 'lucide-react';
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

// Name of whoever performed the activity, with a generic fallback if the activity could not be loaded.
const technicianName = (activity, fallback) => activity?.performed_by?.name ?? fallback;

// Who sent the report back (CEC or admin), from the audit log.
const returnedBy = (activity) => activity?.events.findLast((event) => event.type === 'returned')?.user.name;

// What each role gets notified about. The first matching rule wins; nobody is notified of their own actions.
// `title` is a string or a function of the activity. `type` is what the user can mute in Configuración.
const RULES = [
  {
    roles: ['technician'],
    type: 'assigned',
    matches: (event, me) => ['created', 'assigned'].includes(event.change) && event.technician_id === me.id,
    title: 'Nueva actividad asignada',
    Icon: BellRing,
  },
  {
    roles: ['technician'],
    type: 'returned',
    matches: (event, me) => event.change === 'returned' && event.technician_id === me.id,
    title: (activity) => (returnedBy(activity) ? `${returnedBy(activity)} devolvió tu informe` : 'Te devolvieron un informe'),
    Icon: Undo2,
  },
  {
    roles: ['coordinator', 'admin'],
    type: 'arrived',
    matches: (event) => event.change === 'arrived',
    title: (activity) => `${technicianName(activity, 'Un técnico')} llegó al sitio`,
    Icon: MapPin,
  },
  {
    roles: ['coordinator', 'admin'],
    type: 'created',
    matches: (event) => event.change === 'created' && event.status === 'requested',
    title: 'Nueva solicitud de servicio',
    Icon: Inbox,
  },
  {
    roles: ['coordinator'],
    type: 'finished',
    matches: (event) => event.change === 'finished',
    title: (activity) => `${technicianName(activity, 'Un técnico')} envió el informe`,
    Icon: FileCheck,
  },
  {
    roles: ['coordinator'],
    type: 'resubmitted',
    matches: (event) => event.change === 'resubmitted',
    title: (activity) => `${technicianName(activity, 'Un técnico')} reenvió el informe corregido`,
    Icon: FileCheck,
  },
  {
    roles: ['coordinator', 'admin'],
    type: 'validated',
    matches: (event) => event.change === 'validated',
    title: 'Informe validado: listo para entregar',
    Icon: PackageCheck,
  },
  {
    roles: ['cec', 'admin'],
    type: 'finished',
    matches: (event) => event.change === 'finished',
    title: (activity) => `${technicianName(activity, 'Un técnico')} envió un informe para validar`,
    Icon: FileCheck,
  },
  {
    roles: ['cec', 'admin'],
    type: 'resubmitted',
    matches: (event) => event.change === 'resubmitted',
    title: (activity) => `${technicianName(activity, 'Un técnico')} corrigió un informe`,
    Icon: FileCheck,
  },
  {
    roles: ['client'],
    type: 'arrived',
    matches: (event) => event.change === 'arrived',
    title: (activity) => `${technicianName(activity, 'El técnico')} llegó a tu vehículo`,
    Icon: MapPin,
  },
  {
    roles: ['client'],
    type: 'finished',
    matches: (event) => event.change === 'finished',
    title: (activity) => `${technicianName(activity, 'El técnico')} terminó el trabajo`,
    Icon: CircleCheckBig,
  },
  {
    roles: ['client'],
    type: 'delivered',
    matches: (event) => event.change === 'delivered',
    title: 'Tu informe está listo',
    Icon: PackageCheck,
  },
  {
    roles: ['coordinator', 'admin'],
    type: 'vehicle_request',
    matches: (event) => event.change === 'vehicle_request_created',
    title: 'Solicitud de placa nueva',
    Icon: CarFront,
    viewLabel: 'Ver solicitud',
    path: (home) => `${home}/vehicles`,
  },
  {
    roles: ['client'],
    type: 'request_approved',
    matches: (event) => event.change === 'request_approved',
    title: 'Aprobaron tu placa nueva',
    Icon: CircleCheckBig,
  },
  {
    roles: ['client'],
    type: 'request_rejected',
    matches: (event) => event.change === 'vehicle_request_rejected',
    title: 'Rechazaron tu solicitud de placa nueva',
    Icon: CircleX,
    viewLabel: 'Ver solicitud',
    path: (home) => `${home}/vehicles`,
  },
];

function NotificationToast({ Icon, title, activity, viewLabel, onView, onDismiss }) {
  return (
    // Sonner gives custom toasts no width on wide screens, so the card takes Sonner's own --width (capped on phones).
    <div className="flex w-(--width) max-w-full items-start gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-lg">
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
              {activity.company.name}
              {activity.scheduled_for && ` · ${formatDateTime(activity.scheduled_for)}`}
            </p>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="lg" onClick={onView}>
            {viewLabel}
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

      const [{ activity }, { preferences }] = await Promise.all([
        // Plate request changes belong to no activity yet.
        event.activity_id
          ? request(`/activities/${event.activity_id}`).catch(() => ({ activity: null }))
          : { activity: null },
        request('/notifications/preferences').catch(() => ({ preferences: [] })),
      ]);
      // Muting only silences the pop-up and vibration; the bell keeps the history.
      if (preferences.some((preference) => preference.type === rule.type && !preference.enabled)) return;

      navigator.vibrate?.(VIBRATION_MS);
      const home = homePathFor(user.role);
      const detailPath = rule.path ? rule.path(home) : `${home}/activities/${event.activity_id}`;
      toast.custom(
        (toastId) => (
          <NotificationToast
            Icon={rule.Icon}
            title={typeof rule.title === 'function' ? rule.title(activity) : rule.title}
            activity={activity}
            viewLabel={rule.viewLabel ?? 'Ver actividad'}
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
