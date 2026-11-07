import { useEffect, useState } from 'react';
import ActivityCard from '@/components/ActivityCard';
import EventTimeline from '@/components/EventTimeline';
import StatusFilter from '@/components/StatusFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { request } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/labels';

const sampleActivities = [
  {
    id: 12,
    status: 'on_site',
    type: 'gps_install',
    description: 'Instalar GPS y probar señal',
    scheduled_for: '2026-11-07T14:00:00.000Z',
    created_at: '2026-11-07T13:00:00.000Z',
    company: { id: 1, name: 'Transportes Cóndor' },
    vehicle: { id: 1, plate: 'DEMO-101', make: 'Toyota', model: 'Hilux' },
    technician: { id: 3, name: 'Tomás Técnico' },
  },
  {
    id: 13,
    status: 'requested',
    type: 'camera_install',
    description: 'Instalar cámara de reversa y verificar imagen',
    scheduled_for: null,
    created_at: '2026-11-07T15:00:00.000Z',
    company: { id: 1, name: 'Transportes Cóndor' },
    vehicle: { id: 2, plate: 'DEMO-102', make: 'Toyota', model: 'Hilux' },
    technician: null,
  },
];

const sampleEvents = [
  {
    id: 5,
    type: 'assigned',
    from_status: 'requested',
    to_status: 'assigned',
    created_at: '2026-11-07T13:15:00.000Z',
    user: { id: 2, name: 'Laura Coordinadora' },
  },
  {
    id: 7,
    type: 'arrived',
    from_status: 'assigned',
    to_status: 'on_site',
    created_at: '2026-11-07T14:05:12.000Z',
    user: { id: 3, name: 'Tomás Técnico' },
  },
  {
    id: 8,
    type: 'photo_deleted',
    from_status: null,
    to_status: null,
    created_at: '2026-11-07T14:10:00.000Z',
    user: { id: 3, name: 'Tomás Técnico' },
  },
];

// API status screen (/status). Also the place to preview components while building them.
export default function Home() {
  const [health, setHealth] = useState({ loading: true });
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    request('/health')
      .then((data) => setHealth({ ok: true, data }))
      .catch((error) => setHealth({ ok: false, message: error.message }));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary">Brújula</h1>
        <p className="mt-2 text-muted-foreground">Coordinación y evidencia de servicios técnicos</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Estado de la API</CardTitle>
        </CardHeader>
        <CardContent>
          {health.loading && <p className="text-muted-foreground">Conectando…</p>}
          {health.ok === true && <p className="text-emerald-700">✅ API y base de datos conectadas</p>}
          {health.ok === false && <p className="text-destructive">❌ {health.message}</p>}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">Tarjetas de actividad</h2>
        <ul className="flex flex-col gap-3">
          {sampleActivities.map((activity) => (
            <li key={activity.id}>
              <ActivityCard activity={activity} to={`/coordinator/activities/${activity.id}`} />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Filtro de estados</h2>
        <StatusFilter value={selectedStatus} onChange={setSelectedStatus} />
        <p className="text-sm text-muted-foreground">
          Filtro elegido: {selectedStatus ? STATUS_LABELS[selectedStatus] : 'Todas'}
        </p>
      </section>

      <EventTimeline events={sampleEvents} />
    </main>
  );
}
