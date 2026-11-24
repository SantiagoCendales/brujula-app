const ROLE_CHANGES = {
  created: ['coordinator', 'admin'],
  arrived: ['coordinator', 'admin', 'client'],
  finished: ['coordinator', 'admin', 'cec', 'client'],
  resubmitted: ['coordinator', 'admin', 'cec'],
  validated: ['coordinator', 'admin'],
  delivered: ['client'],
  request_approved: ['client'],
};

// Types each role can mute (they match the event `change`). The technician's assignment and return notices
// are not configurable: missing one leaves work unattended.
const MUTABLE_TYPES = {
  admin: ['created', 'arrived', 'finished', 'resubmitted', 'validated', 'vehicle_request'],
  coordinator: ['created', 'arrived', 'finished', 'resubmitted', 'validated', 'vehicle_request'],
  cec: ['finished', 'resubmitted'],
  client: ['arrived', 'finished', 'delivered', 'request_approved', 'request_rejected'],
  technician: [],
};
const MANDATORY_TYPES = { technician: ['assigned', 'returned'] };

export const mutableTypesFor = (role) => MUTABLE_TYPES[role] ?? [];

export async function listPreferences(db, user) {
  const { rows } = await db.query('select type from muted_notification_types where user_id = $1', [user.id]);
  const muted = new Set(rows.map((row) => row.type));
  return [
    ...(MANDATORY_TYPES[user.role] ?? []).map((type) => ({ type, enabled: true, mandatory: true })),
    ...mutableTypesFor(user.role).map((type) => ({ type, enabled: !muted.has(type), mandatory: false })),
  ];
}

export async function createNotifications(db, { eventId, activityId, userId, type }) {
  const roles = ROLE_CHANGES[type] ?? [];
  const technician = ['assigned', 'returned'].includes(type);
  if (!roles.length && !technician) return;
  await db.query(
    `insert into notifications (user_id, event_id)
     select u.id, $1 from users u
     join activities a on a.id = $2
     where u.active and u.id <> $3 and (
       (u.role::text = any($4::text[])
         and (u.role <> 'client' or u.company_id = a.company_id)
         and ($5 <> 'created' or a.status = 'requested'))
       or ($6::boolean and u.role = 'technician' and u.id = a.technician_id)
     )`,
    [eventId, activityId, userId, roles, type, technician],
  );
}

export async function createRejectionNotifications(db, { requestId, userId }) {
  await db.query(
    `insert into notifications (user_id, vehicle_request_id)
     select u.id, r.id from vehicle_requests r
     join users u on u.company_id = r.company_id
     where r.id = $1 and u.active and u.role = 'client' and u.id <> $2`,
    [requestId, userId],
  );
}
