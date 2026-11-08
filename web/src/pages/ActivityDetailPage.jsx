import { Check, ChevronLeft, UserRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';
import EventTimeline from '@/components/EventTimeline';
import PhotoGrid from '@/components/PhotoGrid';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewActions from '@/execution/ReviewActions';
import TechnicianActions from '@/execution/TechnicianActions';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

const ASSIGNABLE_STATUSES = ['requested', 'assigned'];

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function LocationValue({ location }) {
  if (!location) return '—';
  return (
    <>
      {formatDateTime(location.at)}{' '}
      <a
        href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        mapa
      </a>
    </>
  );
}

// Technicians as a list of big buttons in a bottom sheet, instead of a dropdown.
function AssignDrawer({ activity, onAssigned }) {
  const { data } = useApi('/users?role=technician');
  const [open, setOpen] = useState(false);
  const [technicianId, setTechnicianId] = useState(activity.technician?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const actionLabel = activity.technician ? 'Reasignar' : 'Asignar';
  const chosen = data?.users.find((technician) => technician.id === technicianId);

  async function handleAssign() {
    setSaving(true);
    setError('');
    try {
      const result = await request(`/activities/${activity.id}/assign`, {
        method: 'POST',
        body: { technician_id: technicianId },
      });
      onAssigned(result);
      setOpen(false);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="touch" variant={activity.technician ? 'outline' : 'default'}>
          <UserRound />
          {actionLabel} técnico
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-md flex-col">
          <DrawerHeader>
            <DrawerTitle>{actionLabel} técnico</DrawerTitle>
            <DrawerDescription>
              {activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}. El técnico recibe un aviso al instante.
            </DrawerDescription>
          </DrawerHeader>
          <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto px-4">
            {data?.users.map((technician) => {
              const selected = technician.id === technicianId;
              return (
                <li key={technician.id}>
                  <button
                    type="button"
                    onClick={() => setTechnicianId(technician.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-base ${
                      selected ? 'border-primary bg-primary/10' : 'bg-card'
                    }`}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold">
                      {technician.name.charAt(0)}
                    </span>
                    <span className="flex-1 font-medium">{technician.name}</span>
                    {selected && <Check className="size-5 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <DrawerFooter>
            <ErrorMessage>{error}</ErrorMessage>
            <Button size="touch" onClick={handleAssign} disabled={saving || !technicianId}>
              {saving ? 'Guardando…' : chosen ? `${actionLabel} a ${chosen.name}` : 'Elige un técnico'}
            </Button>
            <DrawerClose asChild>
              <Button size="lg" variant="ghost">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function ActivityDetailPage({ backPath }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, setData, reload } = useApi(`/activities/${id}`);
  const reloadIfThisActivity = useCallback(
    (event) => {
      if (event.activity_id === Number(id)) reload();
    },
    [id, reload],
  );
  useActivityChanges(reloadIfThisActivity);

  if (loading && !data) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

  const { activity } = data;
  const setActivity = (updated) => setData({ activity: updated });
  const canAssign = ['coordinator', 'admin'].includes(user.role) && ASSIGNABLE_STATUSES.includes(activity.status);
  const isHolder = user.role === 'technician' && activity.technician?.id === user.id;
  const isCapturing = isHolder && ['on_site', 'returned'].includes(activity.status);
  const hasPhotos = activity.photos.length > 0;
  const hasEvents = activity.events.length > 0;
  const tabCount = 1 + Number(hasPhotos) + Number(hasEvents);

  return (
    <section className="flex flex-col gap-4">
      <Button asChild variant="link" className="self-start px-0">
        <Link to={backPath}>
          <ChevronLeft />
          Volver
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">
              {activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}
            </CardTitle>
            <StatusBadge status={activity.status} />
          </div>
          {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
        </CardHeader>
      </Card>

      <Tabs defaultValue="summary" className="gap-4">
        {tabCount > 1 && (
          <TabsList className="h-11! w-full">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            {hasPhotos && <TabsTrigger value="photos">Fotos ({activity.photos.length})</TabsTrigger>}
            {hasEvents && <TabsTrigger value="history">Historial</TabsTrigger>}
          </TabsList>
        )}

        <TabsContent value="summary" className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <Row label="Empresa">{activity.company.name}</Row>
              <Row label="Vehículo">
                {activity.vehicle.make} {activity.vehicle.model}
              </Row>
              <Row label="Programada">{formatDateTime(activity.scheduled_for)}</Row>
              <Row label="Técnico asignado">{activity.technician?.name ?? '—'}</Row>
              <Row label="Ejecutada por">{activity.performed_by?.name ?? '—'}</Row>
              <Row label="Llegada">
                <LocationValue location={activity.arrival} />
              </Row>
              <Row label="Fin">
                <LocationValue location={activity.finish} />
              </Row>
            </CardContent>
          </Card>

          {canAssign && <AssignDrawer activity={activity} onAssigned={setData} />}
          {isHolder && <TechnicianActions activity={activity} onChange={setActivity} />}
          <ReviewActions activity={activity} role={user.role} onChange={setActivity} />

          {!isCapturing && activity.report && (
            <Card>
              <CardHeader>
                <CardTitle>Informe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{activity.report}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {hasPhotos && (
          <TabsContent value="photos">
            <Card>
              <CardContent>
                <PhotoGrid photos={activity.photos} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasEvents && (
          <TabsContent value="history">
            <EventTimeline events={activity.events} />
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
