import { ChevronLeft, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import ActivityTypePicker from '@/components/ActivityTypePicker';
import ErrorMessage from '@/components/ErrorMessage';
import ScheduleField from '@/components/ScheduleField';
import TechnicianDrawer from '@/components/TechnicianDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  const [technicianId, setTechnicianId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const technicianList = technicians.data?.users ?? [];
  const chosenTechnician = technicianList.find((technician) => technician.id === technicianId);
  const isComplete = vehicleId && type;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = { vehicle_id: vehicleId, type, description };
    if (isCoordinator) {
      body.scheduled_for = scheduledFor?.toISOString() ?? null;
      body.technician_id = technicianId;
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
                <Field label="Técnico">
                  <div className="flex gap-2">
                    <TechnicianDrawer
                      technicians={technicianList}
                      initialId={technicianId}
                      title="Asignar técnico"
                      description="Opcional: también se puede asignar después. El técnico recibe un aviso al crear la actividad."
                      actionLabel="Asignar"
                      onConfirm={setTechnicianId}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 flex-1 justify-start rounded-xl bg-card px-4 text-base font-normal"
                        >
                          <UserRound className="text-muted-foreground" />
                          {chosenTechnician ? (
                            chosenTechnician.name
                          ) : (
                            <span className="text-muted-foreground">Asignar técnico (opcional)</span>
                          )}
                        </Button>
                      }
                    />
                    {chosenTechnician && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        className="size-12"
                        onClick={() => setTechnicianId(null)}
                        aria-label="Quitar técnico"
                      >
                        <X />
                      </Button>
                    )}
                  </div>
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
