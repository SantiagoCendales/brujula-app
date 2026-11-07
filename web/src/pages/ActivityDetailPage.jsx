import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';
import EventTimeline from '@/components/EventTimeline';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import ReviewActions from '@/execution/ReviewActions';
import TechnicianActions from '@/execution/TechnicianActions';
import { apiUrl, request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS, PHOTO_CATEGORY_LABELS } from '@/lib/labels';
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

function AssignForm({ activity, onAssigned }) {
  const { data } = useApi('/users?role=technician');
  const [technicianId, setTechnicianId] = useState(activity.technician?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request(`/activities/${activity.id}/assign`, {
        method: 'POST',
        body: { technician_id: Number(technicianId) },
      });
      onAssigned(result);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{activity.technician ? 'Reasignar técnico' : 'Asignar técnico'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <NativeSelect
            size="touch"
            required
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Elegir técnico…</NativeSelectOption>
            {data?.users.map((technician) => (
              <NativeSelectOption key={technician.id} value={technician.id}>
                {technician.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <ErrorMessage>{error}</ErrorMessage>
          <Button type="submit" size="touch" disabled={saving || !technicianId}>
            {saving ? 'Guardando…' : 'Asignar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ActivityDetailPage({ backPath }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, setData } = useApi(`/activities/${id}`);

  if (loading && !data) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <ErrorMessage>{error.message}</ErrorMessage>;

  const { activity } = data;
  const setActivity = (updated) => setData({ activity: updated });
  const canAssign = ['coordinator', 'admin'].includes(user.role) && ASSIGNABLE_STATUSES.includes(activity.status);
  const isHolder = user.role === 'technician' && activity.technician?.id === user.id;
  const isCapturing = isHolder && ['on_site', 'returned'].includes(activity.status);

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

      {canAssign && <AssignForm activity={activity} onAssigned={setData} />}
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

      {!isCapturing && activity.photos.length > 0 && (
        // TODO(T12): replace with Sebas's <PhotoGrid photos /> (thumbnails that open full screen).
        <Card>
          <CardHeader>
            <CardTitle>Fotos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {activity.photos.map((photo) => (
              <figure key={photo.id}>
                <img
                  src={apiUrl(photo.url)}
                  alt={PHOTO_CATEGORY_LABELS[photo.category]}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">{PHOTO_CATEGORY_LABELS[photo.category]}</figcaption>
              </figure>
            ))}
          </CardContent>
        </Card>
      )}

      {activity.events.length > 0 && (
        <EventTimeline events={activity.events} />
      )}
    </section>
  );
}
