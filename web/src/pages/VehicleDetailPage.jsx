import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import ActivityCard from '@/components/ActivityCard';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/useApi';

// A vehicle and its history of interventions, newest first.
export default function VehicleDetailPage({ backPath, activitiesPath }) {
  const { id } = useParams();
  const { data, error, loading } = useApi(`/vehicles/${id}`);

  if (loading && !data) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

  const { vehicle, history } = data;

  return (
    <section className="flex flex-col gap-4">
      <Button asChild variant="link" className="self-start px-0">
        <Link to={backPath}>
          <ChevronLeft />
          Vehículos
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl tracking-wide">{vehicle.plate}</CardTitle>
          <p className="text-muted-foreground">
            {vehicle.make} {vehicle.model} · {vehicle.company.name}
          </p>
          {vehicle.description && <p>{vehicle.description}</p>}
        </CardHeader>
      </Card>

      <h2 className="font-semibold">
        Historial de intervenciones <span className="text-muted-foreground">({history.length})</span>
      </h2>
      {history.length === 0 && <p className="text-muted-foreground">Este vehículo todavía no tiene intervenciones.</p>}
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
