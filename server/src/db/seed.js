import { unlink } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { isMainModule } from '../lib/isMainModule.js';
import { pool, withTransaction } from './pool.js';

// All data is made up (hackathon rule): no real plates, names or clients.
const COMPANIES = { condor: 'Transportes Cóndor', ceiba: 'Distribuidora La Ceiba' };

const USERS = [
  { key: 'admin', name: 'Ana Admin', email: 'admin@brujula.test', role: 'admin' },
  { key: 'coordinator', name: 'Carlos Coordinador', email: 'coordinador@brujula.test', role: 'coordinator' },
  { key: 'technician1', name: 'Tomás Técnico', email: 'tecnico1@brujula.test', role: 'technician' },
  { key: 'technician2', name: 'Teresa Técnica', email: 'tecnico2@brujula.test', role: 'technician' },
  { key: 'technician3', name: 'Tito Técnico', email: 'tecnico3@brujula.test', role: 'technician' },
  { key: 'cec', name: 'Celia CEC', email: 'cec@brujula.test', role: 'cec' },
  { key: 'clientCondor', name: 'Camila Cóndor', email: 'cliente.condor@brujula.test', role: 'client', company: 'condor' },
  { key: 'clientCeiba', name: 'Ciro Ceiba', email: 'cliente.ceiba@brujula.test', role: 'client', company: 'ceiba' },
];

const VEHICLES = [
  { key: 'condor1', company: 'condor', plate: 'DEMO-101', make: 'Toyota', model: 'Hilux' },
  { key: 'condor2', company: 'condor', plate: 'DEMO-102', make: 'Isuzu', model: 'NPR' },
  { key: 'ceiba1', company: 'ceiba', plate: 'DEMO-201', make: 'Hino', model: 'Serie 300' },
  { key: 'ceiba2', company: 'ceiba', plate: 'DEMO-202', make: 'Nissan', model: 'Frontier' },
];

const ACTIVITIES = [
  { vehicle: 'condor1', createdBy: 'clientCondor', type: 'inspection', description: 'El GPS no reporta posición desde ayer.' },
  { vehicle: 'condor2', createdBy: 'coordinator', technician: 'technician1', type: 'gps_install', description: 'Instalar GPS y verificar que reporte en plataforma.' },
  { vehicle: 'ceiba1', createdBy: 'coordinator', technician: 'technician2', type: 'camera_install', description: 'Instalar cámara frontal y revisar grabación.' },
];

async function deletePhotoFiles(db) {
  const { rows } = await db.query('select storage_key from photos');
  for (const { storage_key: storageKey } of rows) {
    try {
      await unlink(path.join(config.uploadsDir, storageKey));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

// Empties the database and loads the demo data. Returns the ids by key, for the tests.
export async function seed({ password = process.env.SEED_PASSWORD ?? 'brujula123' } = {}) {
  const passwordHash = await bcrypt.hash(password, 10);

  return withTransaction(async (db) => {
    await deletePhotoFiles(db);
    await db.query('truncate activity_events, photos, activities, vehicles, users, companies restart identity cascade');

    const ids = { companies: {}, users: {}, vehicles: {}, activities: [] };

    for (const [key, name] of Object.entries(COMPANIES)) {
      const { rows } = await db.query('insert into companies (name) values ($1) returning id', [name]);
      ids.companies[key] = rows[0].id;
    }

    for (const user of USERS) {
      const { rows } = await db.query(
        `insert into users (company_id, name, email, password_hash, role)
         values ($1, $2, $3, $4, $5) returning id`,
        [user.company ? ids.companies[user.company] : null, user.name, user.email, passwordHash, user.role],
      );
      ids.users[user.key] = rows[0].id;
    }

    for (const vehicle of VEHICLES) {
      const { rows } = await db.query(
        'insert into vehicles (company_id, plate, make, model) values ($1, $2, $3, $4) returning id',
        [ids.companies[vehicle.company], vehicle.plate, vehicle.make, vehicle.model],
      );
      ids.vehicles[vehicle.key] = rows[0].id;
    }

    for (const activity of ACTIVITIES) {
      const company = VEHICLES.find((vehicle) => vehicle.key === activity.vehicle).company;
      const createdBy = ids.users[activity.createdBy];
      const technicianId = activity.technician ? ids.users[activity.technician] : null;
      const { rows } = await db.query(
        `insert into activities (company_id, vehicle_id, type, description, status, created_by, technician_id)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [
          ids.companies[company],
          ids.vehicles[activity.vehicle],
          activity.type,
          activity.description,
          technicianId ? 'assigned' : 'requested',
          createdBy,
          technicianId,
        ],
      );
      const activityId = rows[0].id;
      ids.activities.push(activityId);

      await db.query(
        `insert into activity_events (activity_id, user_id, type, to_status) values ($1, $2, 'created', 'requested')`,
        [activityId, createdBy],
      );
      if (technicianId) {
        await db.query(
          `insert into activity_events (activity_id, user_id, type, from_status, to_status, data)
           values ($1, $2, 'assigned', 'requested', 'assigned', $3)`,
          [activityId, ids.users.coordinator, { technician_id: technicianId }],
        );
      }
    }

    return ids;
  });
}

if (isMainModule(import.meta.url)) {
  if (config.isProduction && !process.argv.includes('--force')) {
    console.error('Seeding wipes the whole database. In production it must be run with --force.');
    process.exit(1);
  }
  try {
    await seed();
    console.log('Demo data loaded. Users are listed in the README (password: SEED_PASSWORD or brujula123).');
  } finally {
    await pool.end();
  }
}
