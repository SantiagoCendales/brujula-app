// Single entry point to the API: every screen calls `request`, never fetch directly.
// In the browser VITE_API_URL is empty and Vite proxies /api to the server. In the APK it points to the API URL.
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'No se pudo conectar con el servidor', null);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    if (!error) {
      // No JSON error body: the request never reached our API (e.g. the Vite proxy could not connect to it).
      throw new ApiError(response.status, 'network_error', `No se pudo conectar con la API (HTTP ${response.status}). ¿Está corriendo el servidor y es correcta la dirección en web/.env.local?`, null);
    }
    throw new ApiError(response.status, error.code, error.message, error.details);
  }
  return data;
}
