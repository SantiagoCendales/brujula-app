import { ClipboardList, ListFilter, Search, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import ActivityCard from '@/components/ActivityCard';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import StatusFilter from '@/components/StatusFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';
import { usePermissions } from '@/lib/usePermissions';

const DEFAULT_EMPTY = {
  icon: ClipboardList,
  title: 'No hay actividades todavía',
  description: 'Cuando se cree una, aparece acá al instante.',
};
const SEARCH_DELAY_MS = 300;

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
  const [plateSearch, setPlateSearch] = useState('');
  const [plate, setPlate] = useState('');
  const access = usePermissions();
  const canCreate = newActivityPath && access.permissions.includes('create_activity');
  const normalizedPlateSearch = plateSearch.trim().toUpperCase();
  useEffect(() => {
    const timer = setTimeout(() => setPlate(normalizedPlateSearch), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [normalizedPlateSearch]);

  const query = new URLSearchParams(baseQuery);
  if (status) query.set('status', status);
  if (plate) query.set('plate', plate);
  const { data, error, loading, reload } = useApi(`/activities?${query}`);
  useActivityChanges(reload);
  const counts = useApi(showFilter ? '/activities/counts' : null);
  useActivityChanges(counts.reload);
  const activities = data?.activities.filter((activity) =>
    activity.vehicle.plate.toUpperCase().includes(normalizedPlateSearch),
  );
  const searching = normalizedPlateSearch !== plate || loading;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {canCreate && (
          <Button asChild size="lg">
            <Link to={newActivityPath}>{newActivityLabel}</Link>
          </Button>
        )}
      </div>

      {showFilter && <StatusFilter value={status} onChange={setStatus} counts={counts.data} />}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={plateSearch}
          onChange={(event) => setPlateSearch(event.target.value)}
          placeholder="Buscar por placa"
          aria-label="Buscar actividades por placa"
          maxLength={20}
          className="h-12 bg-card pl-10 text-base"
        />
      </div>

      <ErrorMessage>{error?.message}</ErrorMessage>
      <ErrorMessage>{access.error?.message}</ErrorMessage>
      {searching && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}
      {!searching && activities?.length === 0 &&
        (normalizedPlateSearch ? (
          <EmptyState
            icon={SearchX}
            title={`No encontramos «${plateSearch.trim()}»`}
            description="Revisa la placa o busca solo una parte."
          />
        ) : status ? (
          <EmptyState
            icon={ListFilter}
            title={`No hay actividades «${STATUS_LABELS[status]}»`}
            description="Prueba con otro estado o con «Todas»."
          />
        ) : (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description}>
            {canCreate && (
              <Button asChild size="lg">
                <Link to={newActivityPath}>{newActivityLabel}</Link>
              </Button>
            )}
          </EmptyState>
        ))}

      <ul className="flex flex-col gap-3">
        {!searching && activities?.map((activity) => (
          <li key={activity.id}>
            <ActivityCard activity={activity} to={`${basePath}/${activity.id}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
