import { useState } from 'react';
import { Link } from 'react-router';
import ErrorMessage from '@/components/ErrorMessage';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS, STATUS_LABELS } from '@/lib/labels';
import { useApi } from '@/lib/useApi';

const FILTER_STATUSES = ['requested', 'assigned', 'on_site', 'report_ready', 'validated', 'delivered'];

// One list screen for every role; the API already returns only what each role may see.
// TODO(T6, T7): replace the inline card and filter chips with Sebas's <ActivityCard /> and <StatusFilter />.
export default function ActivitiesPage({
  title,
  baseQuery = '',
  basePath,
  newActivityPath,
  newActivityLabel,
  showFilter = true,
  initialStatus = '',
  secondaryLink,
}) {
  const [status, setStatus] = useState(initialStatus);
  const query = new URLSearchParams(baseQuery);
  if (status) query.set('status', status);
  const { data, error, loading } = useApi(`/activities?${query}`);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {newActivityPath && (
          <Button asChild size="lg">
            <Link to={newActivityPath}>{newActivityLabel}</Link>
          </Button>
        )}
        {secondaryLink && (
          <Button asChild variant="link">
            <Link to={secondaryLink.to}>{secondaryLink.label}</Link>
          </Button>
        )}
      </div>

      {showFilter && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {['', ...FILTER_STATUSES].map((value) => (
            <Button
              key={value || 'all'}
              variant={status === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(value)}
              className="shrink-0 rounded-full"
            >
              {value ? STATUS_LABELS[value] : 'Todas'}
            </Button>
          ))}
        </div>
      )}

      <ErrorMessage>{error?.message}</ErrorMessage>
      {loading && !data && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}
      {data?.activities.length === 0 && <p className="text-muted-foreground">No hay actividades.</p>}

      <ul className="flex flex-col gap-3">
        {data?.activities.map((activity) => (
          <li key={activity.id}>
            <Link to={`${basePath}/${activity.id}`} className="block transition-transform active:scale-[0.99]">
              <Card size="sm">
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.company.name}</p>
                    </div>
                    <StatusBadge status={activity.status} />
                  </div>
                  {activity.description && <p className="mt-2 line-clamp-2 text-sm">{activity.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {activity.technician ? `Técnico: ${activity.technician.name} · ` : ''}
                    {formatDateTime(activity.scheduled_for ?? activity.created_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
