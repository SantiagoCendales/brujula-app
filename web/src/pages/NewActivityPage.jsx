import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { request } from '../lib/api.js';
import { localInputToIso } from '../lib/format.js';
import { ACTIVITY_TYPE_LABELS } from '../lib/labels.js';
import { useApi } from '../lib/useApi.js';

const inputClass = 'rounded-xl border border-slate-300 bg-white px-4 py-3 text-base';
const labelClass = 'flex flex-col gap-1 text-sm font-medium';

// Shared by clients ("Nueva solicitud") and coordinators ("Nueva actividad", can also assign and schedule).
export default function NewActivityPage({ basePath }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoordinator = ['coordinator', 'admin'].includes(user.role);
  const vehicles = useApi('/vehicles');
  const technicians = useApi(isCoordinator ? '/users?role=technician' : null);

  const [form, setForm] = useState({ vehicle_id: '', type: '', description: '', scheduled_for: '', technician_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field) {
    return (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = { vehicle_id: Number(form.vehicle_id), type: form.type, description: form.description };
    if (isCoordinator) {
      body.scheduled_for = localInputToIso(form.scheduled_for);
      body.technician_id = form.technician_id ? Number(form.technician_id) : null;
    }
    try {
      const { activity } = await request('/activities', { method: 'POST', body });
      navigate(`${basePath}/activities/${activity.id}`, { replace: true });
    } catch (apiError) {
      setError(apiError.message);
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <Link to={basePath} className="text-sm text-brand">
        ← Volver
      </Link>
      <h1 className="text-xl font-semibold">{isCoordinator ? 'Nueva actividad' : 'Nueva solicitud'}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className={labelClass}>
          Vehículo
          <select required value={form.vehicle_id} onChange={update('vehicle_id')} className={inputClass}>
            <option value="">Elegir vehículo…</option>
            {vehicles.data?.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} · {vehicle.make} {vehicle.model}
                {isCoordinator ? ` (${vehicle.company.name})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Tipo de servicio
          <select required value={form.type} onChange={update('type')} className={inputClass}>
            <option value="">Elegir tipo…</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Descripción
          <textarea
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={update('description')}
            placeholder="¿Qué hay que hacer o qué está fallando?"
            className={inputClass}
          />
        </label>

        {isCoordinator && (
          <>
            <label className={labelClass}>
              Fecha programada (opcional)
              <input type="datetime-local" value={form.scheduled_for} onChange={update('scheduled_for')} className={inputClass} />
            </label>
            <label className={labelClass}>
              Técnico (opcional, se puede asignar después)
              <select value={form.technician_id} onChange={update('technician_id')} className={inputClass}>
                <option value="">Sin asignar</option>
                {technicians.data?.users.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
          {saving ? 'Guardando…' : 'Crear'}
        </button>
      </form>
    </section>
  );
}
