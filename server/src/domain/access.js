// SQL conditions that limit what each role can see. Every query over activities or vehicles must use them.
// They push their values onto the query's `params` array and reference them by position.

export function activityScope(user, params, alias = 'a') {
  if (user.role === 'client') {
    params.push(user.company_id);
    return `${alias}.company_id = $${params.length}`;
  }
  if (user.role === 'technician') {
    params.push(user.id);
    const me = `$${params.length}`;
    // What they hold now, what they performed, and the full history of vehicles they are assigned to right now.
    return `(${alias}.technician_id = ${me}
      or ${alias}.performed_by = ${me}
      or ${alias}.vehicle_id in (select assigned_now.vehicle_id from activities assigned_now where assigned_now.technician_id = ${me}))`;
  }
  return 'true';
}

export function vehicleScope(user, params, alias = 'v') {
  if (user.role === 'client') {
    params.push(user.company_id);
    return `${alias}.company_id = $${params.length}`;
  }
  if (user.role === 'technician') {
    params.push(user.id);
    const me = `$${params.length}`;
    return `exists (select 1 from activities mine
      where mine.vehicle_id = ${alias}.id and (mine.technician_id = ${me} or mine.performed_by = ${me}))`;
  }
  return 'true';
}
