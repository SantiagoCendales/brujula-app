const ROLE_CHANGES = {
  created: ['coordinator', 'admin'],
  arrived: ['coordinator', 'admin', 'client'],
  finished: ['coordinator', 'admin', 'cec'],
  resubmitted: ['coordinator', 'admin', 'cec'],
  validated: ['coordinator', 'admin'],
  delivered: ['client'],
};

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
