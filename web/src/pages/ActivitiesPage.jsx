import { ClipboardList, ListFilter } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import ActivityCard from '@/components/ActivityCard';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import StatusFilter from '@/components/StatusFilter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

const DEFAULT_EMPTY = {
  icon: ClipboardList,
  title: 'No hay actividades todavía',
  description: 'Cuando se cree una, aparece acá al instante.',
};

// One list screen for every role; the API already returns only what each role may see.
export default function ActivitiesPage({
  title,
  baseQuery = '',
  basePath,
  newActivityPath,
  newActivityLabel,
  showFilter = true,
  initialStatus = '',
  empty = DEFAULT_EMPTY,
}) {
  const [status, setStatus] = useState(initialStatus);
  const query = new URLSearchParams(baseQuery);
  if (status) query.set('status', status);
  const { data, error, loading, reload } = useApi(`/activities?${query}`);
  useActivityChanges(reload);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {newActivityPath && (
          <Button asChild size="lg">
            <Link to={newActivityPath}>{newActivityLabel}</Link>
          </Button>
        )}
      </div>

      {showFilter && <StatusFilter value={status} onChange={setStatus} />}

      <ErrorMessage>{error?.message}</ErrorMessage>
      {loading && !data && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}
      {data?.activities.length === 0 &&
        (status ? (
          <EmptyState
            icon={ListFilter}
            title={`No hay actividades «${STATUS_LABELS[status]}»`}
            description="Prueba con otro estado o con «Todas»."
          />
        ) : (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description}>
            {newActivityPath && (
              <Button asChild size="lg">
                <Link to={newActivityPath}>{newActivityLabel}</Link>
              </Button>
            )}
          </EmptyState>
        ))}

      <ul className="flex flex-col gap-3">
        {data?.activities.map((activity) => (
          <li key={activity.id}>
            <ActivityCard activity={activity} to={`${basePath}/${activity.id}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
