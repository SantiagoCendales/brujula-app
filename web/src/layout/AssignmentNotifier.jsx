import { BellRing } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';

const VIBRATION_MS = 200;
const TOAST_DURATION_MS = 12_000;

function AssignmentToast({ activity, onView, onDismiss }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-lg">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BellRing className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Nueva actividad asignada</p>
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

// Shows a notification (and vibrates on phones) when an activity gets assigned to the signed-in technician,
// whatever screen they are on. Renders nothing itself.
export default function AssignmentNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const notifyIfAssignedToMe = useCallback(
    async (event) => {
      const isNewAssignment = event.status === 'assigned' && event.technician_id === user.id;
      if (user.role !== 'technician' || !isNewAssignment) return;

      navigator.vibrate?.(VIBRATION_MS);
      const { activity } = await request(`/activities/${event.activity_id}`).catch(() => ({ activity: null }));
      toast.custom(
        (toastId) => (
          <AssignmentToast
            activity={activity}
            onView={() => {
              toast.dismiss(toastId);
              navigate(`/technician/activities/${event.activity_id}`);
            }}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        { duration: TOAST_DURATION_MS },
      );
    },
    [user, navigate],
  );

  useActivityChanges(notifyIfAssignedToMe);
  return null;
}
