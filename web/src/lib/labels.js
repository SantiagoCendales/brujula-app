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
  receipt_recorded: 'Constancia de recibido registrada',
};

export function eventLabel(event) {
  return EVENT_TYPE_LABELS[event.type] ?? STATUS_LABELS[event.to_status] ?? event.type;
}

// Notification types a user can mute (they match the event `change`). The wording depends on the role that receives them.
const NOTIFICATION_TYPE_LABELS = {
  assigned: 'Nueva actividad asignada',
  returned: 'Te devolvieron un informe',
  created: 'Nueva solicitud de servicio',
  arrived: 'Un técnico llegó al sitio',
  finished: 'Un técnico envió un informe',
  resubmitted: 'Un técnico reenvió un informe corregido',
  validated: 'Informe validado: listo para entregar',
};
const CLIENT_NOTIFICATION_TYPE_LABELS = {
  arrived: 'El técnico llegó a tu vehículo',
  finished: 'El técnico terminó el trabajo',
  delivered: 'Tu informe está listo',
};

export function notificationTypeLabel(type, role) {
  return (role === 'client' && CLIENT_NOTIFICATION_TYPE_LABELS[type]) || NOTIFICATION_TYPE_LABELS[type] || type;
}

export const PHOTO_CATEGORY_LABELS = {
  plate: 'Frente con placa',
  odometer: 'Kilometraje',
  issue_found: 'Falla encontrada',
  issue_fixed: 'Falla solucionada',
  other: 'Otra',
};
