import { useEffect, useState } from 'react';
import ActivityCard from '@/components/ActivityCard';
import EventTimeline from '@/components/EventTimeline';
import PhotoChecklist from '@/components/PhotoChecklist';
import PhotoGrid from '@/components/PhotoGrid';
import ReportField from '@/components/ReportField';
import StatusFilter from '@/components/StatusFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { request } from '@/lib/api';
import { PHOTO_CATEGORY_LABELS, STATUS_LABELS } from '@/lib/labels';
import { REQUIRED_PHOTOS } from '@/lib/rules';

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

const samplePhotoCounts = { plate: 1, issue_found: 1 };
const samplePhotoItems = Object.entries(PHOTO_CATEGORY_LABELS).map(([category, label]) => ({
  category,
  label,
  required: REQUIRED_PHOTOS.includes(category),
  count: samplePhotoCounts[category] ?? 0,
}));

const samplePhotos = [
  { id: 201, category: 'plate', url: 'https://placehold.co/640x480/png?text=Demo+frente' },
  { id: 202, category: 'odometer', url: 'https://placehold.co/640x480/png?text=Demo+tablero' },
  { id: 203, category: 'issue_found', url: 'https://placehold.co/640x480/png?text=Demo+hallazgo' },
  { id: 204, category: 'issue_fixed', url: 'https://placehold.co/640x480/png?text=Demo+solucion' },
];

// API status screen (/status). Also the place to preview components while building them.
export default function Home() {
  const [health, setHealth] = useState({ loading: true });
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sampleReport, setSampleReport] = useState('');
  const [sampleReportDirty, setSampleReportDirty] = useState(false);

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

      <section className="space-y-3">
        <h2 className="font-semibold">Checklist de fotos</h2>
        <PhotoChecklist
          items={samplePhotoItems}
          uploadingCategory={null}
          onCapture={(category) => console.log('Photo category:', category)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Campo de informe</h2>
        <ReportField
          value={sampleReport}
          onChange={(value) => {
            setSampleReport(value);
            setSampleReportDirty(true);
          }}
          dirty={sampleReportDirty}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Galería de fotos</h2>
        <PhotoGrid photos={samplePhotos} />
      </section>
    </main>
  );
}
