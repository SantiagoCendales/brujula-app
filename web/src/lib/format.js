const dateTimeFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso) {
  return iso ? dateTimeFormat.format(new Date(iso)) : '—';
}

// <input type="datetime-local"> gives local time without zone; the API expects ISO 8601 in UTC.
export function localInputToIso(value) {
  return value ? new Date(value).toISOString() : null;
}
