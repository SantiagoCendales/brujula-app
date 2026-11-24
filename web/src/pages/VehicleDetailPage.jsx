import { ChevronLeft, ClipboardList } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ActivityCard from '@/components/ActivityCard';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

// A vehicle and its history of interventions, newest first.
export default function VehicleDetailPage({ backPath, activitiesPath }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { state } = useLocation();
  const { data, error, loading, reload } = useApi(`/vehicles/${id}`);
  useActivityChanges(reload);

  if (loading && !data) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

  const { vehicle, history } = data;
  const fromActivityId = user.role === 'technician' && Number.isSafeInteger(state?.fromActivityId) && state.fromActivityId > 0
    ? state.fromActivityId
    : null;

  return (
    <section className="flex flex-col gap-4">
      <Button asChild variant="link" className="self-start px-0">
        <Link to={fromActivityId ? `${activitiesPath}/${fromActivityId}` : backPath}>
          <ChevronLeft />
          {fromActivityId ? 'Volver a la actividad' : 'Vehículos'}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl tracking-wide">{vehicle.plate}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p><span className="text-muted-foreground">Empresa:</span> {vehicle.company.name}</p>
          <p><span className="text-muted-foreground">Marca:</span> {vehicle.make || '—'}</p>
          <p><span className="text-muted-foreground">Modelo:</span> {vehicle.model || '—'}</p>
          <p className="break-all"><span className="text-muted-foreground">VIN:</span> {vehicle.vin || '—'}</p>
          <p><span className="text-muted-foreground">Año:</span> {vehicle.year ?? '—'}</p>
          <p><span className="text-muted-foreground">Color:</span> {vehicle.color || '—'}</p>
          {vehicle.description && <p><span className="text-muted-foreground">Descripción:</span> {vehicle.description}</p>}
        </CardContent>
      </Card>

      <h2 className="font-semibold">
        Historial de intervenciones <span className="text-muted-foreground">({history.length})</span>
      </h2>
      {user.role === 'technician' && (
        <p className="text-sm text-muted-foreground">
          Si tienes el vehículo asignado, ves todo su historial; de lo contrario, solo tus intervenciones.
        </p>
      )}
      {history.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Sin intervenciones todavía"
          description="Cada servicio que se haga en este vehículo va a quedar registrado acá."
        />
      )}
      <ul className="flex flex-col gap-3">
        {history.map((activity) => (
          <li key={activity.id}>
            <ActivityCard activity={activity} to={`${activitiesPath}/${activity.id}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
