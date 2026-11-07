// Spanish labels for the English values the API returns. Source of truth: docs/api.md.

export const ROLE_LABELS = {
  admin: 'Admin',
  coordinator: 'Coordinador',
  technician: 'Técnico',
  cec: 'CEC',
  client: 'Cliente',
};

export const STATUS_LABELS = {
  requested: 'Solicitada',
  assigned: 'Asignada',
  on_site: 'En sitio',
  report_ready: 'Informe listo',
  validated: 'Validada',
  returned: 'Devuelta',
  delivered: 'Entregada',
};

export const ACTIVITY_TYPE_LABELS = {
  gps_install: 'Instalación GPS',
  camera_install: 'Instalación cámara',
  sensor_install: 'Instalación sensor',
  maintenance: 'Mantenimiento',
  inspection: 'Revisión',
  uninstall: 'Desinstalación',
};

// Events whose label says more than the status they lead to. Any other event uses STATUS_LABELS of `to_status`.
export const EVENT_TYPE_LABELS = {
  returned: 'Informe devuelto',
  resubmitted: 'Reenviada a validación',
  correction: 'Informe corregido',
  photo_added: 'Foto agregada',
  photo_deleted: 'Foto eliminada',
};

export function eventLabel(event) {
  return EVENT_TYPE_LABELS[event.type] ?? STATUS_LABELS[event.to_status] ?? event.type;
}

export const PHOTO_CATEGORY_LABELS = {
  plate: 'Frente con placa',
  odometer: 'Kilometraje',
  issue_found: 'Falla encontrada',
  issue_fixed: 'Falla solucionada',
  other: 'Otra',
};
