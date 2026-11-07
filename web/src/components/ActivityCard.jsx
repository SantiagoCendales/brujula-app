import { Link } from 'react-router';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';

export default function ActivityCard({ activity, to }) {
  const activityType = ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type;
  const activityDate = activity.scheduled_for ?? activity.created_at;

  return (
    <Link to={to} className="block transition-transform active:scale-[0.99]">
      <Card size="sm">
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">
                {activity.vehicle.plate} · {activityType}
              </p>
              <p className="text-sm text-muted-foreground">{activity.company.name}</p>
            </div>
            <StatusBadge status={activity.status} />
          </div>
          {activity.description && (
            <p className="mt-2 line-clamp-2 text-sm">{activity.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {activity.technician ? `Técnico: ${activity.technician.name} · ` : ''}
            {formatDateTime(activityDate)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}