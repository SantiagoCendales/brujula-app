import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { request } from '@/lib/api';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';

const VIBRATION_MS = 200;
const TOAST_DURATION_MS = 10_000;

// Shows a toast (and vibrates on phones) when an activity gets assigned to the signed-in technician,
// whatever screen they are on. Renders nothing.
export default function AssignmentNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const notifyIfAssignedToMe = useCallback(
    async (event) => {
      const isNewAssignment = event.status === 'assigned' && event.technician_id === user.id;
      if (user.role !== 'technician' || !isNewAssignment) return;

      navigator.vibrate?.(VIBRATION_MS);
      const { activity } = await request(`/activities/${event.activity_id}`).catch(() => ({ activity: null }));
      toast('Nueva actividad asignada', {
        description: activity ? `${activity.vehicle.plate} · ${ACTIVITY_TYPE_LABELS[activity.type]}` : undefined,
        duration: TOAST_DURATION_MS,
        action: { label: 'Ver', onClick: () => navigate(`/technician/activities/${event.activity_id}`) },
      });
    },
    [user, navigate],
  );

  useActivityChanges(notifyIfAssignedToMe);
  return null;
}
