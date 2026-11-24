import { Check, MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import ErrorMessage from '@/components/ErrorMessage';
import ScheduleField from '@/components/ScheduleField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { ACTIVITY_TYPE_LABELS, VEHICLE_REQUEST_STATUS_LABELS } from '@/lib/labels';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 1000;
const REJECTED_VISIBLE_DAYS = 14;
const DAY_MS = 86_400_000;

function ApproveDrawer({ item, busy, error, onApprove }) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(item.city ?? '');
  const [department, setDepartment] = useState(item.department ?? '');
  const [location, setLocation] = useState(item.location);
  const [scheduledFor, setScheduledFor] = useState(new Date(item.scheduled_for));

  async function handleApprove() {
    const body = {
      city: city.trim(), department: department.trim(), location: location.trim(), scheduled_for: scheduledFor.toISOString(),
    };
    if (await onApprove(body)) setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="touch" disabled={busy}><Check />Aprobar</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>Aprobar placa nueva</DrawerTitle>
            <DrawerDescription>Revisa y ajusta la ubicación y la programación según la disponibilidad. El cliente recibirá un aviso.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`department-${item.id}`}>Departamento</Label>
              <Input id={`department-${item.id}`} value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} className="h-12 text-base" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`city-${item.id}`}>Ciudad</Label>
              <Input id={`city-${item.id}`} value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} className="h-12 text-base" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`location-${item.id}`}>Dirección exacta</Label>
              <Input id={`location-${item.id}`} value={location} onChange={(event) => setLocation(event.target.value)} maxLength={200} className="h-12 text-base" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fecha y hora</Label>
              <ScheduleField value={scheduledFor} onChange={setScheduledFor} required />
            </div>
            <ErrorMessage>{error}</ErrorMessage>
          </div>
          <DrawerFooter>
            <Button size="touch" onClick={handleApprove} disabled={busy || !city.trim() || !department.trim() || !location.trim() || !scheduledFor}>
              {busy ? 'Guardando…' : 'Aprobar y avisar al cliente'}
            </Button>
            <DrawerClose asChild><Button size="lg" variant="ghost">Cancelar</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RejectDrawer({ busy, onReject }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  async function handleReject() {
    if (await onReject(note)) setOpen(false);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="touch" variant="outline" disabled={busy}>
          <X />
          Rechazar
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-md flex-col">
          <DrawerHeader>
            <DrawerTitle>Rechazar solicitud</DrawerTitle>
            <DrawerDescription>Explica el motivo. El cliente recibe un aviso y ve tu nota.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Textarea
              aria-label="Motivo del rechazo"
              rows={4}
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej.: la placa no corresponde a tu flota"
              className="text-base"
            />
          </div>
          <DrawerFooter>
            <Button size="touch" variant="destructive" onClick={handleReject} disabled={busy || note.trim().length < MIN_NOTE_LENGTH}>
              {busy ? 'Rechazando…' : 'Rechazar con este motivo'}
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

function Detail({ label, children }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function OwnershipPhoto({ item }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function showPhoto() {
    setLoading(true);
    setError('');
    try {
      const photo = await request(`/vehicle-requests/${item.id}/ownership-photo`, { responseType: 'blob' });
      setUrl(URL.createObjectURL(photo));
    } catch (photoError) {
      setError(photoError.message);
    } finally {
      setLoading(false);
    }
  }

  if (!item.has_ownership_photo) {
    return <p className="text-sm text-muted-foreground">Esta solicitud no tiene foto de la tarjeta de propiedad.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {url ? (
        <img src={url} alt={`Tarjeta de propiedad del vehículo ${item.plate}`} className="max-h-96 w-full rounded-lg object-contain" />
      ) : (
        <Button type="button" variant="outline" size="touch" disabled={loading} onClick={showPhoto}>
          {loading ? 'Cargando foto…' : 'Ver tarjeta de propiedad'}
        </Button>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}

function RequestCard({ item, staff, busy, error, onApprove, onReject }) {
  const vehicle = [item.make, item.model].filter(Boolean).join(' ');
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-semibold tracking-wide">{item.plate}</p>
            {staff && <p className="truncate text-sm text-muted-foreground">{item.company.name}</p>}
          </div>
          {!staff && <Badge variant="outline">{VEHICLE_REQUEST_STATUS_LABELS[item.status]}</Badge>}
        </div>
        <dl className="flex flex-col gap-1">
          {vehicle && <Detail label="Vehículo">{vehicle}</Detail>}
          {item.vin && <Detail label="VIN">{item.vin}</Detail>}
          {item.year && <Detail label="Año">{item.year}</Detail>}
          {item.color && <Detail label="Color">{item.color}</Detail>}
          <Detail label="Servicio">{ACTIVITY_TYPE_LABELS[item.type] ?? item.type}</Detail>
          {item.department && <Detail label="Departamento">{item.department}</Detail>}
          {item.city && <Detail label="Ciudad">{item.city}</Detail>}
          <Detail label={item.city || item.department ? 'Dirección' : 'Lugar'}>
            <span className="inline-flex items-center gap-1"><MapPin className="size-4 shrink-0" />{item.location}</span>
          </Detail>
          <Detail label="Fecha y hora">{formatDateTime(item.scheduled_for)}</Detail>
          {staff && <Detail label="Solicitó">{item.requested_by.name}</Detail>}
        </dl>
        {item.description && <p className="text-sm">{item.description}</p>}
        <OwnershipPhoto item={item} />
        {item.status === 'rejected' && item.review_note && (
          <p className="rounded-lg bg-muted p-3 text-sm">Motivo: {item.review_note}</p>
        )}
        {staff && item.previous_review_note && (
          <p className="rounded-lg bg-muted p-3 text-sm">Motivo del rechazo anterior: {item.previous_review_note}</p>
        )}
        {!staff && item.status === 'rejected' && (
          item.has_resubmission
            ? <p className="text-sm text-muted-foreground">Solicitud corregida y enviada nuevamente.</p>
            : <Button asChild size="touch"><Link to={`/client/new/${item.id}`}>Corregir y reenviar</Link></Button>
        )}
        {staff && (
          <div className="flex flex-col gap-2">
            <ApproveDrawer item={item} busy={busy} error={error} onApprove={onApprove} />
            <RejectDrawer busy={busy} onReject={onReject} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Plate requests: staff review the pending ones; a client follows its own (pending and recently rejected).
// Renders nothing when there is nothing to show.
export default function VehicleRequests({ staff = false }) {
  const { data, error, reload } = useApi('/vehicle-requests');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  useActivityChanges(reload);

  const cutoff = Date.now() - REJECTED_VISIBLE_DAYS * DAY_MS;
  const visible = (data?.requests ?? []).filter((item) => {
    if (item.status === 'pending') return true;
    return !staff && item.status === 'rejected' && new Date(item.reviewed_at).getTime() >= cutoff;
  });

  async function review(item, action, body) {
    setBusyId(item.id);
    setActionError('');
    try {
      await request(`/vehicle-requests/${item.id}/${action}`, { method: 'POST', body });
      reload();
      return true;
    } catch (requestError) {
      setActionError(requestError.message);
      reload();
      return false;
    } finally {
      setBusyId(null);
    }
  }

  if (!error && visible.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="vehicle-requests-title">
      <h2 id="vehicle-requests-title" className="font-semibold">
        {staff ? `Solicitudes de placa nueva (${visible.length})` : 'Solicitudes de placa nueva'}
      </h2>
      <ErrorMessage>{error?.message || actionError}</ErrorMessage>
      <ul className="flex flex-col gap-3">
        {visible.map((item) => (
          <li key={item.id}>
            <RequestCard
              item={item}
              staff={staff}
              busy={busyId === item.id}
              error={actionError}
              onApprove={(body) => review(item, 'approve', body)}
              onReject={(note) => review(item, 'reject', { note })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
