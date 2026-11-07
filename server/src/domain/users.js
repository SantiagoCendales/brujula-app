// Public shape of a user. Never includes password_hash.
export function toUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, company_id: row.company_id };
}
