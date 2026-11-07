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
  // `change` (what happened), `actor_id` (who did it) and `technician_id` (who holds it now) let each app decide
  // whether to show a notification, without notifying people about their own actions.
  const event = {
    type: 'activity.changed',
    activity_id: change.activityId,
    status: change.status,
    change: change.change,
    actor_id: change.actorId,
    technician_id: change.technicianId,
  };
  for (const subscriber of subscribers) {
    if (canSee(subscriber.user, change)) subscriber.send(event);
  }
}

// Call after the change is committed, so whoever refetches sees the new data.
// `change` names what happened (created, assigned, arrived, finished, validated, returned, resubmitted, delivered,
// report_updated, photo_added, photo_deleted). `previousTechnicianId` lets a technician who just lost the activity
// (reassignment) refresh their list.
export async function notifyActivityChanged(db, activityId, { change, actorId, previousTechnicianId = null }) {
  const { rows } = await db.query('select company_id, technician_id, performed_by, status from activities where id = $1', [
    activityId,
  ]);
  const activity = rows[0];
  if (!activity) return;
  publish({
    activityId,
    companyId: activity.company_id,
    status: activity.status,
    change,
    actorId,
    technicianId: activity.technician_id,
    technicianIds: [activity.technician_id, activity.performed_by, previousTechnicianId].filter(Boolean),
  });
}
