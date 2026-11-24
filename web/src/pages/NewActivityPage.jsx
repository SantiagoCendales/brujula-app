import { ChevronLeft, UserRound, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import ActivityTypePicker from '@/components/ActivityTypePicker';
import ErrorMessage from '@/components/ErrorMessage';
import NewVehicleFields, { EMPTY_NEW_VEHICLE, isNewVehicleValid } from '@/components/NewVehicleFields';
import ScheduleField from '@/components/ScheduleField';
import TechnicianDrawer from '@/components/TechnicianDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import VehicleCombobox from '@/components/VehicleCombobox';
import { request } from '@/lib/api';
import { compressImage, isNativeApp, takeNativePhoto } from '@/lib/device';
import { useApi } from '@/lib/useApi';
import { usePermissions } from '@/lib/usePermissions';

function Field({ id, label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function NewActivityPage({ basePath }) {
  const { requestId } = useParams();
  const source = useApi(requestId ? `/vehicle-requests/${requestId}` : null);

  if (requestId) {
    const item = source.data?.request;
    let message = source.error?.message;
    if (item?.status !== 'rejected' && item) message = 'Solo se pueden corregir solicitudes rechazadas.';
    if (item?.has_resubmission) message = 'Esta solicitud ya fue corregida y enviada nuevamente.';
    if (message) return (
      <section className="flex flex-col gap-4">
        <Button asChild variant="link" className="self-start px-0"><Link to={`${basePath}/vehicles`}>Volver a mis vehículos</Link></Button>
        <ErrorMessage>{message}</ErrorMessage>
      </section>
    );
    if (!item || String(item.id) !== requestId) return <p>Cargando solicitud…</p>;
    return <ActivityForm key={item.id} basePath={basePath} source={item} />;
  }
  return <ActivityForm basePath={basePath} />;
}

// Shared by clients ("Nueva solicitud") and coordinators ("Nueva actividad", can also assign and schedule).
function ActivityForm({ basePath, source = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoordinator = ['coordinator', 'admin'].includes(user.role);
  const access = usePermissions();
  const canCreate = access.permissions.includes('create_activity');
  const canAssign = isCoordinator && access.permissions.includes('assign_technician');
  const vehicles = useApi('/vehicles');
  const technicians = useApi(canAssign ? '/users?role=technician' : null);

  const [vehicleId, setVehicleId] = useState(null);
  const [type, setType] = useState(source?.type ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [scheduledFor, setScheduledFor] = useState(source ? new Date(source.scheduled_for) : null);
  const [technicianId, setTechnicianId] = useState(null);
  // A client can ask for a service on a plate that is not in its fleet yet; staff approve it later.
  const [newPlate, setNewPlate] = useState(Boolean(source));
  const [newVehicle, setNewVehicle] = useState(source ? {
    plate: source.plate, make: source.make, model: source.model, vin: source.vin ?? '',
    year: source.year == null ? '' : String(source.year), color: source.color ?? '',
  } : EMPTY_NEW_VEHICLE);
  const [ownershipPhoto, setOwnershipPhoto] = useState(null);
  const [reusePhoto, setReusePhoto] = useState(Boolean(source?.has_ownership_photo));
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const photoInput = useRef(null);
  const [location, setLocation] = useState(source?.location ?? '');
  const [city, setCity] = useState(source?.city ?? '');
  const [department, setDepartment] = useState(source?.department ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const technicianList = technicians.data?.users ?? [];
  const chosenTechnician = technicianList.find((technician) => technician.id === technicianId);
  const isComplete = newPlate
    ? isNewVehicleValid(newVehicle) && (ownershipPhoto || reusePhoto) && type && location.trim() && city.trim() && department.trim() && scheduledFor
    : vehicleId && type;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    if (newPlate) {
      await submitPlateRequest();
      return;
    }
    const body = { vehicle_id: vehicleId, type, description };
    if (isCoordinator) {
      body.scheduled_for = scheduledFor?.toISOString() ?? null;
      if (canAssign) body.technician_id = technicianId;
    }
    try {
      const { activity } = await request('/activities', { method: 'POST', body });
      navigate(`${basePath}/activities/${activity.id}`, { replace: true });
    } catch (apiError) {
      setError(apiError.message);
      setSaving(false);
    }
  }

  async function submitPlateRequest() {
    const body = {
      ...newVehicle,
      plate: newVehicle.plate.trim(),
      year: newVehicle.year ? Number(newVehicle.year) : null,
      type,
      description,
      location: location.trim(),
      city: city.trim(),
      department: department.trim(),
      scheduled_for: scheduledFor.toISOString(),
    };
    if (source) body.resubmitted_from_id = source.id;
    try {
      const form = new FormData();
      form.append('data', JSON.stringify(body));
      let photo = ownershipPhoto;
      if (reusePhoto) {
        try {
          photo = await request(`/vehicle-requests/${source.id}/ownership-photo`, { responseType: 'blob' });
        } catch (photoError) {
          throw new Error(`No se pudo recuperar la foto anterior: ${photoError.message}. Inténtalo de nuevo o adjunta una foto nueva.`);
        }
      }
      form.append('ownership_photo', photo, 'ownership.jpg');
      await request('/vehicle-requests', { method: 'POST', body: form });
      toast.success('Solicitud enviada. Te avisamos cuando validemos la placa.');
      navigate(`${basePath}/vehicles`, { replace: true });
    } catch (apiError) {
      setError(apiError.message);
      setSaving(false);
    }
  }

  async function selectPhoto(image) {
    if (!image) return;
    setError('');
    setOwnershipPhoto(null);
    setReusePhoto(false);
    setProcessingPhoto(true);
    try {
      setOwnershipPhoto(await compressImage(image));
    } catch {
      setOwnershipPhoto(null);
      setError('No se pudo procesar la foto de la tarjeta. Prueba con otra imagen.');
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function takePhoto() {
    if (!isNativeApp) {
      photoInput.current?.click();
      return;
    }
    try {
      await selectPhoto(await takeNativePhoto());
    } catch (photoError) {
      setError(photoError.message);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <Button asChild variant="link" className="self-start px-0">
        <Link to={source ? `${basePath}/vehicles` : basePath}>
          <ChevronLeft />
          Volver
        </Link>
      </Button>
      <h1 className="text-xl font-semibold">{source ? 'Corregir solicitud' : isCoordinator ? 'Nueva actividad' : 'Nueva solicitud'}</h1>
      {source?.review_note && <p className="rounded-lg bg-muted p-3 text-sm break-words">Motivo del rechazo: {source.review_note}</p>}
      <ErrorMessage>{access.error?.message}</ErrorMessage>
      {!access.loading && !access.error && !canCreate && <ErrorMessage>Tu rol no tiene permiso para crear actividades.</ErrorMessage>}

      {canCreate && <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {newPlate ? (
              <>
                <NewVehicleFields value={newVehicle} onChange={(patch) => setNewVehicle((current) => ({ ...current, ...patch }))} />
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Foto de la tarjeta de propiedad</p>
                  <p className="text-sm text-muted-foreground">Toma una foto legible para verificar los datos del vehículo.</p>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      selectPhoto(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <Button type="button" variant="outline" size="touch" onClick={takePhoto} disabled={processingPhoto || saving}>
                    {ownershipPhoto || reusePhoto ? 'Cambiar foto de la tarjeta' : 'Tomar foto de la tarjeta'}
                  </Button>
                  {processingPhoto && <p className="text-sm text-muted-foreground">Procesando foto…</p>}
                  {ownershipPhoto && <p className="text-sm text-muted-foreground">Foto nueva adjunta</p>}
                  {reusePhoto && <p className="text-sm text-muted-foreground">Se usará la foto anterior. Puedes cambiarla.</p>}
                  {source?.has_ownership_photo && !reusePhoto && !ownershipPhoto && !processingPhoto && (
                    <Button type="button" variant="link" className="self-start px-0" onClick={() => setReusePhoto(true)}>Usar la foto anterior</Button>
                  )}
                </div>
                {!source && <Button type="button" variant="link" className="self-start px-0" onClick={() => setNewPlate(false)}>
                  Elegir un vehículo de mi flota
                </Button>}
              </>
            ) : (
              <Field id="vehicle" label="Vehículo">
                <VehicleCombobox
                  id="vehicle"
                  vehicles={vehicles.data?.vehicles ?? []}
                  value={vehicleId}
                  onChange={setVehicleId}
                  showCompany={isCoordinator}
                />
                {!isCoordinator && (
                  <Button type="button" variant="link" className="self-start px-0" onClick={() => setNewPlate(true)}>
                    ¿Es una placa nueva? Solicítala aquí
                  </Button>
                )}
              </Field>
            )}

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

            {newPlate && (
              <>
                <Field id="department" label="Departamento">
                  <Input id="department" value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} className="h-12 bg-card text-base" />
                </Field>
                <Field id="city" label="Ciudad">
                  <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} className="h-12 bg-card text-base" />
                </Field>
                <Field id="location" label="Dirección exacta">
                  <Input
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    maxLength={200}
                    placeholder="Dirección donde está el vehículo"
                    className="h-12 bg-card text-base"
                  />
                </Field>
                <Field label="Fecha y hora">
                  <ScheduleField value={scheduledFor} onChange={setScheduledFor} required />
                </Field>
              </>
            )}

            {isCoordinator && (
              <>
                <Field label="Fecha programada">
                  <ScheduleField value={scheduledFor} onChange={setScheduledFor} />
                </Field>
                {canAssign && <Field label="Técnico">
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
                </Field>}
              </>
            )}

            <ErrorMessage>{error}</ErrorMessage>
            {!isComplete && (
              <p className="text-sm text-muted-foreground">
                {newPlate
                  ? 'Completa la placa, adjunta la foto y elige el servicio, departamento, ciudad, dirección, fecha y hora.'
                  : 'Elige el vehículo y el tipo de servicio para continuar.'}
              </p>
            )}
            <Button type="submit" size="touch" disabled={saving || processingPhoto || !isComplete}>
              {saving ? 'Guardando…' : source ? 'Enviar solicitud corregida' : newPlate ? 'Enviar solicitud' : 'Crear'}
            </Button>
          </form>
        </CardContent>
      </Card>}
    </section>
  );
}
