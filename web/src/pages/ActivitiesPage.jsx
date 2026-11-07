import { useState } from 'react';
import { Link } from 'react-router';
import { formatDateTime } from '../lib/format.js';
import { ACTIVITY_TYPE_LABELS, STATUS_LABELS } from '../lib/labels.js';
import { useApi } from '../lib/useApi.js';

const FILTER_STATUSES = ['requested', 'assigned', 'on_site', 'report_ready', 'validated', 'delivered'];

// One list screen for every role; the API already returns only what each role may see.
// TODO(T6, T7): replace the inline card and filter chips with Sebas's <ActivityCard /> and <StatusFilter />.
export default function ActivitiesPage({ title, baseQuery = '', basePath, newActivityPath, newActivityLabel, showFilter = true }) {
  const [status, setStatus] = useState('');
  const query = new URLSearchParams(baseQuery);
  if (status) query.set('status', status);
  const { data, error, loading } = useApi(`/activities?${query}`);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {newActivityPath && (
          <Link to={newActivityPath} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            {newActivityLabel}
          </Link>
        )}
      </div>

      {showFilter && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {['', ...FILTER_STATUSES].map((value) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setStatus(value)}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                status === value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'
              }`}
            >
              {value ? STATUS_LABELS[value] : 'Todas'}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-slate-500">Cargando…</p>}
      {error && <p className="text-red-700">{error.message}</p>}
      {data?.activities.length === 0 && <p className="text-slate-500">No hay actividades.</p>}

      <ul className="flex flex-col gap-3">
        {data?.activities.map((activity) => (
          <li key={activity.id}>
            <Link to={`${basePath}/${activity.id}`} className="block rounded-2xl bg-white p-4 shadow-sm active:scale-[0.99]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {activity.vehicle.plate} · {ACTIVITY_TYPE_LABELS[activity.type]}
                  </p>
                  <p className="text-sm text-slate-600">{activity.company.name}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {STATUS_LABELS[activity.status]}
                </span>
              </div>
              {activity.description && <p className="mt-2 line-clamp-2 text-sm text-slate-700">{activity.description}</p>}
              <p className="mt-2 text-xs text-slate-500">
                {activity.technician ? `Técnico: ${activity.technician.name} · ` : ''}
                {formatDateTime(activity.scheduled_for ?? activity.created_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
