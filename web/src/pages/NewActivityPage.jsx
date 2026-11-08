import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ActivityTypePicker from '@/components/ActivityTypePicker';
import ErrorMessage from '@/components/ErrorMessage';
import ScheduleField from '@/components/ScheduleField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import VehicleCombobox from '@/components/VehicleCombobox';
import { request } from '@/lib/api';
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

  const [vehicleId, setVehicleId] = useState(null);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState(null);
  const [technicianId, setTechnicianId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isComplete = vehicleId && type;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = { vehicle_id: vehicleId, type, description };
    if (isCoordinator) {
      body.scheduled_for = scheduledFor?.toISOString() ?? null;
      body.technician_id = technicianId ? Number(technicianId) : null;
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field id="vehicle" label="Vehículo">
              <VehicleCombobox
                id="vehicle"
                vehicles={vehicles.data?.vehicles ?? []}
                value={vehicleId}
                onChange={setVehicleId}
                showCompany={isCoordinator}
              />
            </Field>

            <Field label="Tipo de servicio">
              <ActivityTypePicker value={type} onChange={setType} />
            </Field>

            <Field id="description" label="Descripción">
              <Textarea
                id="description"
                rows={4}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="¿Qué hay que hacer o qué está fallando?"
                className="text-base"
              />
            </Field>

            {isCoordinator && (
              <>
                <Field label="Fecha programada">
                  <ScheduleField value={scheduledFor} onChange={setScheduledFor} />
                </Field>
                <Field id="technician" label="Técnico (opcional, se puede asignar después)">
                  <NativeSelect
                    id="technician"
                    size="touch"
                    value={technicianId}
                    onChange={(event) => setTechnicianId(event.target.value)}
                    className="w-full"
                  >
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
            {!isComplete && <p className="text-sm text-muted-foreground">Elige el vehículo y el tipo de servicio para continuar.</p>}
            <Button type="submit" size="touch" disabled={saving || !isComplete}>
              {saving ? 'Guardando…' : 'Crear'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
