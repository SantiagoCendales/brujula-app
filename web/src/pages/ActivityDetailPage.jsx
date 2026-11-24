import { ChevronLeft, UserRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ActivityComments from '@/components/ActivityComments';
import ErrorMessage from '@/components/ErrorMessage';
import EventTimeline from '@/components/EventTimeline';
import PhotoGrid from '@/components/PhotoGrid';
import ReceiptCard from '@/components/ReceiptCard';
import StatusBadge from '@/components/StatusBadge';
import TechnicianDrawer from '@/components/TechnicianDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewActions from '@/execution/ReviewActions';
import TechnicianActions from '@/execution/TechnicianActions';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';
import { usePermissions } from '@/lib/usePermissions';

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

function AssignDrawer({ activity, onAssigned }) {
  const { data } = useApi('/users?role=technician');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const actionLabel = activity.technician ? 'Reasignar' : 'Asignar';

  async function handleAssign(technicianId) {
    setSaving(true);
    setError('');
    try {
      const result = await request(`/activities/${activity.id}/assign`, {
        method: 'POST',
        body: { technician_id: technicianId },
      });
      onAssigned(result);
      return true;
    } catch (apiError) {
      setError(apiError.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <TechnicianDrawer
      technicians={data?.users ?? []}
      initialId={activity.technician?.id ?? null}
      title={`${actionLabel} técnico`}
      description={`${activity.vehicle.plate} · ${ACTIVITY_TYPE_LABELS[activity.type]}. El técnico recibe un aviso al instante.`}
      actionLabel={actionLabel}
      onConfirm={handleAssign}
      busy={saving}
      error={error}
      trigger={
        <Button size="touch" variant={activity.technician ? 'outline' : 'default'}>
          <UserRound />
          {actionLabel} técnico
        </Button>
      }
    />
  );
}

export default function ActivityDetailPage({ backPath }) {
  const { id } = useParams();
  const { user } = useAuth();
  const access = usePermissions();
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
  const canAssign = ['coordinator', 'admin'].includes(user.role) && access.permissions.includes('assign_technician') && ASSIGNABLE_STATUSES.includes(activity.status);
  const isHolder = user.role === 'technician' && activity.technician?.id === user.id;
  const isCapturing = isHolder && access.permissions.includes('record_field_work') && ['on_site', 'returned'].includes(activity.status);
  const hasPhotos = activity.photos.length > 0;
  const hasEvents = activity.events.length > 0;

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
              {user.role === 'technician' ? (
                <Link
                  to={`/technician/vehicles/${activity.vehicle.id}`}
                  state={{ fromActivityId: activity.id }}
                  className="text-primary underline underline-offset-2"
                  aria-label={`Ver datos e historial del vehículo ${activity.vehicle.plate}`}
                >
                  {activity.vehicle.plate}
                </Link>
              ) : activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}
            </CardTitle>
            <StatusBadge status={activity.status} />
          </div>
          {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
        </CardHeader>
      </Card>

      <Tabs defaultValue="summary" className="w-full flex flex-col gap-4">
        <TabsList className="w-full justify-start gap-2 overflow-x-auto px-2 pt-2 pb-4 group-data-[orientation=horizontal]/tabs:h-17">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="comments">Novedades</TabsTrigger>
          {hasPhotos && <TabsTrigger value="photos">Fotos ({activity.photos.length})</TabsTrigger>}
          {hasEvents && <TabsTrigger value="history">Historial</TabsTrigger>}
        </TabsList>

        <TabsContent value="summary" className="flex flex-col gap-4">
          <ErrorMessage>{access.error?.message}</ErrorMessage>
          <Card>
            <CardContent>
              <Row label="Empresa">{activity.company.name}</Row>
              <Row label="Vehículo">
                {activity.vehicle.make} {activity.vehicle.model}
              </Row>
              <Row label="Programada">{formatDateTime(activity.scheduled_for)}</Row>
              {activity.department && <Row label="Departamento">{activity.department}</Row>}
              {activity.city && <Row label="Ciudad">{activity.city}</Row>}
              {activity.location && <Row label={activity.city || activity.department ? 'Dirección' : 'Lugar'}>{activity.location}</Row>}
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
          {isHolder && <TechnicianActions activity={activity} onChange={setActivity} permissions={access.permissions} />}
          <ReceiptCard receipt={activity.receipt} />
          <ReviewActions activity={activity} role={user.role} permissions={access.permissions} onChange={setActivity} />

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

        <TabsContent value="comments">
          <ActivityComments key={activity.id} activityId={activity.id} userId={user.id} role={user.role} />
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
