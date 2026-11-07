// Every error has the same shape: { error: { code, message, details } }. See docs/api.md.
// `message` is shown to the user, so it is written in Spanish.
export class HttpError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_ERRORS = {
  23505: [409, 'duplicate', 'Ya existe un registro con esos datos'],
  23503: [400, 'invalid_reference', 'Alguno de los datos hace referencia a algo que no existe'],
  23514: [400, 'validation_error', 'Los datos no cumplen las reglas'],
};

function respond(res, status, code, message, details = null) {
  res.status(status).json({ error: { code, message, details } });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return respond(res, error.status, error.code, error.message, error.details);
  }
  if (error.name === 'MulterError') {
    return error.code === 'LIMIT_FILE_SIZE'
      ? respond(res, 413, 'file_too_large', 'La foto supera el tamaño máximo de 8 MB')
      : respond(res, 400, 'validation_error', 'El archivo enviado no es válido');
  }
  if (error.type === 'entity.parse.failed') {
    return respond(res, 400, 'validation_error', 'El cuerpo de la petición no es JSON válido');
  }
  if (error.type === 'entity.too.large') {
    return respond(res, 413, 'payload_too_large', 'La petición es demasiado grande');
  }
  const postgresError = POSTGRES_ERRORS[error.code];
  if (postgresError) {
    return respond(res, ...postgresError);
  }
  console.error(error);
  return respond(res, 500, 'internal_error', 'Error interno del servidor');
}
