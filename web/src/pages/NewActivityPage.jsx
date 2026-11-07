import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { request } from '@/lib/api';
import { localInputToIso } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS } from '@/lib/labels';
import { useApi } from '@/lib/useApi';

function Field({ id, label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

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
      <Button asChild variant="link" className="self-start px-0">
        <Link to={basePath}>
          <ChevronLeft />
          Volver
        </Link>
      </Button>
      <h1 className="text-xl font-semibold">{isCoordinator ? 'Nueva actividad' : 'Nueva solicitud'}</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field id="vehicle" label="Vehículo">
              <NativeSelect id="vehicle" size="touch" required value={form.vehicle_id} onChange={update('vehicle_id')} className="w-full">
                <NativeSelectOption value="">Elegir vehículo…</NativeSelectOption>
                {vehicles.data?.vehicles.map((vehicle) => (
                  <NativeSelectOption key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} · {vehicle.make} {vehicle.model}
                    {isCoordinator ? ` (${vehicle.company.name})` : ''}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field id="type" label="Tipo de servicio">
              <NativeSelect id="type" size="touch" required value={form.type} onChange={update('type')} className="w-full">
                <NativeSelectOption value="">Elegir tipo…</NativeSelectOption>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field id="description" label="Descripción">
              <Textarea
                id="description"
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={update('description')}
                placeholder="¿Qué hay que hacer o qué está fallando?"
                className="text-base"
              />
            </Field>

            {isCoordinator && (
              <>
                <Field id="scheduled" label="Fecha programada (opcional)">
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={form.scheduled_for}
                    onChange={update('scheduled_for')}
                    className="h-12 text-base"
                  />
                </Field>
                <Field id="technician" label="Técnico (opcional, se puede asignar después)">
                  <NativeSelect id="technician" size="touch" value={form.technician_id} onChange={update('technician_id')} className="w-full">
                    <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                    {technicians.data?.users.map((technician) => (
                      <NativeSelectOption key={technician.id} value={technician.id}>
                        {technician.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}

            <ErrorMessage>{error}</ErrorMessage>
            <Button type="submit" size="touch" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
