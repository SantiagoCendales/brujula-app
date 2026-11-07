// Live updates over Server-Sent Events. Each signed-in screen keeps one connection open; when an activity
// changes, the users allowed to see it get a small event ({ activity_id, status }) and refetch through the API,
// which applies the usual permissions.
// In memory: it only reaches connections to this same server process. Running several instances would need
// a shared channel (for example Postgres LISTEN/NOTIFY).

const subscribers = new Set();

export function subscribe(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

function canSee(user, change) {
  if (user.role === 'client') return user.company_id === change.companyId;
  if (user.role === 'technician') return change.technicianIds.includes(user.id);
  return true;
}

function publish(change) {
  const event = { type: 'activity.changed', activity_id: change.activityId, status: change.status };
  for (const subscriber of subscribers) {
    if (canSee(subscriber.user, change)) subscriber.send(event);
  }
}

// Call after the change is committed, so whoever refetches sees the new data.
// `previousTechnicianId` lets a technician who just lost the activity (reassignment) refresh their list.
export async function notifyActivityChanged(db, activityId, { previousTechnicianId = null } = {}) {
  const { rows } = await db.query('select company_id, technician_id, performed_by, status from activities where id = $1', [
    activityId,
  ]);
  const activity = rows[0];
  if (!activity) return;
  publish({
    activityId,
    companyId: activity.company_id,
    status: activity.status,
    technicianIds: [activity.technician_id, activity.performed_by, previousTechnicianId].filter(Boolean),
  });
}
