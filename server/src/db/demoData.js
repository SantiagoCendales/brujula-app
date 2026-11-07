import { randomUUID } from 'node:crypto';
import { savePhotoFile } from '../lib/photos.js';
import { placeholderPng } from './placeholderImage.js';

// Extra data so every role has something to show: activities in every status, vehicle history and photos.
// All made up (hackathon rule). Loaded by `npm run db:seed`; the tests use only the base data.

const HOUR_MS = 60 * 60 * 1000;
const PHOTO_SPACING_MS = 5 * 60 * 1000;
const REQUIRED = ['plate', 'odometer', 'issue_found', 'issue_fixed'];

const DEMO_VEHICLES = [
  { key: 'condor3', company: 'condor', plate: 'DEMO-103', make: 'Mitsubishi', model: 'Canter' },
  { key: 'ceiba3', company: 'ceiba', plate: 'DEMO-203', make: 'Ford', model: 'Ranger' },
];

const PHOTO_COLORS = {
  plate: [71, 85, 105],
  odometer: [217, 119, 6],
  issue_found: [220, 38, 38],
  issue_fixed: [5, 150, 105],
  other: [100, 116, 139],
};

// Each activity is described by its timeline, in hours ago. Status, who holds it, who performed it
// and the audit events are all derived from it, so they are always consistent.
const DEMO_ACTIVITIES = [
  {
    vehicle: 'ceiba3',
    type: 'uninstall',
    createdBy: 'clientCeiba',
    description: 'Retirar el GPS: la unidad se vende.',
    timeline: { created: 2 },
  },
  {
    vehicle: 'condor3',
    type: 'camera_install',
    createdBy: 'coordinator',
    technician: 'technician2',
    description: 'Instalar cámara interior y verificar la grabación en la nube.',
    timeline: { created: 6, assigned: 5.5, arrived: 0.75 },
    photos: ['plate', 'odometer'],
    report: 'Cámara montada en el parabrisas. Falta probar la grabación.',
  },
  {
    vehicle: 'ceiba2',
    type: 'sensor_install',
    createdBy: 'clientCeiba',
    technician: 'technician3',
    description: 'Instalar sensor de combustible en el tanque principal.',
    timeline: { created: 30, assigned: 26, arrived: 5, finished: 3 },
    photos: REQUIRED,
    report: 'Se instaló el sensor de nivel y se calibró con el tanque lleno. Reporta correctamente en plataforma.',
  },
  {
    vehicle: 'condor1',
    type: 'maintenance',
    createdBy: 'coordinator',
    technician: 'technician1',
    description: 'Mantenimiento preventivo del GPS y revisión del cableado.',
    timeline: { created: 50, assigned: 49, arrived: 28, finished: 26, validated: 20 },
    photos: REQUIRED,
    report: 'Conector de alimentación sulfatado. Se limpió, se aisló y se fijó el cableado. El GPS reporta cada 30 s.',
  },
  {
    vehicle: 'ceiba1',
    type: 'gps_install',
    createdBy: 'clientCeiba',
    technician: 'technician2',
    description: 'Instalación de GPS en unidad nueva.',
    timeline: { created: 200, assigned: 198, arrived: 170, finished: 168, validated: 150, delivered: 146 },
    photos: [...REQUIRED, 'other'],
    report: 'GPS instalado detrás del tablero con la antena en el techo. Corte de motor remoto probado y funcionando.',
  },
  {
    vehicle: 'condor2',
    type: 'inspection',
    createdBy: 'clientCondor',
    technician: 'technician1',
    description: 'El cliente reporta que la cámara se apaga en carretera.',
    timeline: { created: 360, assigned: 358, arrived: 340, finished: 338, validated: 320, delivered: 316 },
    photos: REQUIRED,
    report: 'Fusible de la cámara flojo por la vibración. Se reemplazó el portafusible. Prueba de 20 km sin cortes.',
  },
];

const STEPS = ['created', 'assigned', 'arrived', 'finished', 'validated', 'delivered'];

const STATUS_AFTER = {
  created: 'requested',
  assigned: 'assigned',
  arrived: 'on_site',
  finished: 'report_ready',
  validated: 'validated',
  delivered: 'delivered',
};

function actorOf(step, activity, ids) {
  if (step === 'created') return ids.users[activity.createdBy];
  if (step === 'arrived' || step === 'finished') return ids.users[activity.technician];
  if (step === 'validated') return ids.users.cec;
  return ids.users.coordinator;
}

export async function seedDemoData(db, ids, now = Date.now()) {
  for (const vehicle of DEMO_VEHICLES) {
    const { rows } = await db.query(
      'insert into vehicles (company_id, plate, make, model) values ($1, $2, $3, $4) returning id',
      [ids.companies[vehicle.company], vehicle.plate, vehicle.make, vehicle.model],
    );
    ids.vehicles[vehicle.key] = rows[0].id;
  }

  const photoBytes = {};
  const demoActivityIds = [];

  for (const [index, activity] of DEMO_ACTIVITIES.entries()) {
    const at = (step) => (activity.timeline[step] === undefined ? null : new Date(now - activity.timeline[step] * HOUR_MS));
    const steps = STEPS.filter((step) => activity.timeline[step] !== undefined);
    const status = STATUS_AFTER[steps.at(-1)];
    const technicianId = activity.technician ? ids.users[activity.technician] : null;
    const holdsIt = status === 'assigned' || status === 'on_site';
    const site = { lat: 9.9281 + index * 0.011, lng: -84.0907 - index * 0.009 };
    const vehicleId = ids.vehicles[activity.vehicle];
    const { rows: vehicleRows } = await db.query('select company_id from vehicles where id = $1', [vehicleId]);
    const companyId = vehicleRows[0].company_id;

    const { rows } = await db.query(
      `insert into activities (
         company_id, vehicle_id, type, description, status, created_by, technician_id, performed_by,
         arrived_at, arrival_lat, arrival_lng, arrival_accuracy_m,
         finished_at, finish_lat, finish_lng, finish_accuracy_m,
         report, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       returning id`,
      [
        companyId,
        vehicleId,
        activity.type,
        activity.description,
        status,
        ids.users[activity.createdBy],
        holdsIt ? technicianId : null,
        at('arrived') ? technicianId : null,
        at('arrived'),
        at('arrived') ? site.lat : null,
        at('arrived') ? site.lng : null,
        at('arrived') ? 8 + index : null,
        at('finished'),
        at('finished') ? site.lat + 0.0002 : null,
        at('finished') ? site.lng + 0.0002 : null,
        at('finished') ? 10 + index : null,
        activity.report ?? '',
        at('created'),
        at(steps.at(-1)),
      ],
    );
    const activityId = rows[0].id;
    demoActivityIds.push(activityId);

    let previousStatus = null;
    for (const step of steps) {
      await db.query(
        `insert into activity_events (activity_id, user_id, type, from_status, to_status, data, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          activityId,
          actorOf(step, activity, ids),
          step,
          previousStatus,
          STATUS_AFTER[step],
          step === 'assigned' ? { technician_id: technicianId } : null,
          at(step),
        ],
      );
      previousStatus = STATUS_AFTER[step];
    }

    for (const [photoIndex, category] of (activity.photos ?? []).entries()) {
      photoBytes[category] ??= placeholderPng(PHOTO_COLORS[category]);
      const storageKey = `${companyId}/${activityId}/${randomUUID()}.png`;
      await savePhotoFile(storageKey, photoBytes[category]);
      await db.query(
        `insert into photos (activity_id, category, storage_key, mime_type, size_bytes, uploaded_by, uploaded_at)
         values ($1, $2, $3, 'image/png', $4, $5, $6)`,
        [
          activityId,
          category,
          storageKey,
          photoBytes[category].length,
          technicianId,
          new Date(at('arrived').getTime() + (photoIndex + 1) * PHOTO_SPACING_MS),
        ],
      );
    }
  }

  return demoActivityIds;
}
