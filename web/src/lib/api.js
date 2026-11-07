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
    throw new ApiError(response.status, error?.code ?? 'unknown_error', error?.message ?? 'Error inesperado', error?.details ?? null);
  }
  return data;
}
