import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import ReviewActions from '../execution/ReviewActions.jsx';
import TechnicianActions from '../execution/TechnicianActions.jsx';
import { apiUrl, request } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { ACTIVITY_TYPE_LABELS, EVENT_TYPE_LABELS, PHOTO_CATEGORY_LABELS, STATUS_LABELS } from '../lib/labels.js';
import { useApi } from '../lib/useApi.js';

const ASSIGNABLE_STATUSES = ['requested', 'assigned'];

function LocationValue({ location }) {
  if (!location) return '—';
  return (
    <>
      {formatDateTime(location.at)}{' '}
      <a
        href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-brand underline"
      >
        mapa
      </a>
    </>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
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

  // TODO(T9): replace the inline select with Sebas's <TechnicianSelect />.
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{activity.technician ? 'Reasignar técnico' : 'Asignar técnico'}</h2>
      <select
        required
        value={technicianId}
        onChange={(event) => setTechnicianId(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3"
      >
        <option value="">Elegir técnico…</option>
        {data?.users.map((technician) => (
          <option key={technician.id} value={technician.id}>
            {technician.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving || !technicianId} className="rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {saving ? 'Guardando…' : 'Asignar'}
      </button>
    </form>
  );
}

export default function ActivityDetailPage({ backPath }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, setData } = useApi(`/activities/${id}`);

  if (loading && !data) return <p className="text-slate-500">Cargando…</p>;
  if (error) return <p className="text-red-700">{error.message}</p>;

  const { activity } = data;
  const setActivity = (updated) => setData({ activity: updated });
  const canAssign = ['coordinator', 'admin'].includes(user.role) && ASSIGNABLE_STATUSES.includes(activity.status);
  const isHolder = user.role === 'technician' && activity.technician?.id === user.id;
  const isCapturing = isHolder && activity.status === 'on_site';

  return (
    <section className="flex flex-col gap-4">
      <Link to={backPath} className="text-sm text-brand">
        ← Volver
      </Link>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold">
            {activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}
          </h1>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{STATUS_LABELS[activity.status]}</span>
        </div>
        {activity.description && <p className="mt-2 text-slate-700">{activity.description}</p>}
        <div className="mt-3">
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
        </div>
      </div>

      {canAssign && <AssignForm activity={activity} onAssigned={setData} />}
      {isHolder && <TechnicianActions activity={activity} onChange={setActivity} />}
      <ReviewActions activity={activity} role={user.role} onChange={setActivity} />

      {!isCapturing && activity.report !== null && activity.report !== '' && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Informe</h2>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">{activity.report}</p>
        </div>
      )}

      {!isCapturing && activity.photos.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Fotos</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {activity.photos.map((photo) => (
              <figure key={photo.id}>
                <img src={apiUrl(photo.url)} alt={PHOTO_CATEGORY_LABELS[photo.category]} className="aspect-square w-full rounded-xl object-cover" />
                <figcaption className="mt-1 text-xs text-slate-600">{PHOTO_CATEGORY_LABELS[photo.category]}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {activity.events.length > 0 && (
        // TODO(T8): replace with Sebas's <EventTimeline events />.
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Historial</h2>
          <ol className="mt-3 flex flex-col gap-2 text-sm">
            {activity.events.map((event) => (
              <li key={event.id} className="border-l-2 border-brand pl-3">
                <p className="font-medium">
                  {event.to_status ? STATUS_LABELS[event.to_status] : (EVENT_TYPE_LABELS[event.type] ?? event.type)}
                </p>
                <p className="text-xs text-slate-500">
                  {event.user.name} · {formatDateTime(event.created_at)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
