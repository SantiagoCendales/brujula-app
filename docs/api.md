# Contrato de la API de Brújula

Este documento es el acuerdo entre el front y el back. Si una ruta cambia, se actualiza acá en el mismo commit.

Las secciones marcadas con ✅ ya funcionan. Las marcadas con 🔜 todavía no están implementadas: se pueden armar pantallas con los ejemplos de respuesta.

En el front, las etiquetas en español de cada valor ya están en `web/src/lib/labels.js` (`STATUS_LABELS`, `ROLE_LABELS`, `ACTIVITY_TYPE_LABELS`, `PHOTO_CATEGORY_LABELS`).

**Idioma:** el código, las rutas, los campos y los valores van en inglés. Los textos que ve el usuario van en español: el front traduce los valores (`on_site` → "En sitio") y muestra tal cual el `message` de los errores.

## Convenciones

- **Base:** `/api`. En desarrollo el front llama a `/api/...` y Vite lo reenvía al servidor (`localhost:3001`).
- **Autenticación:** header `Authorization: Bearer <token>` en todas las rutas, salvo `POST /auth/login`, `GET /health` y las imágenes (ver [Fotos](#fotos)).
- **JSON** en `snake_case` (`company_id`, `created_at`).
- **IDs:** números.
- **Fechas:** texto ISO 8601 en UTC (`"2026-11-07T15:30:00.000Z"`). El front las muestra en hora local.

### Errores

Todos los errores tienen la misma forma:

```json
{ "error": { "code": "invalid_status", "message": "La actividad no está en un estado que permita esta acción", "details": null } }
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `validation_error` | Falta un campo o tiene un formato inválido. `details` dice cuál |
| 401 | `unauthenticated` | No hay token, venció o el usuario fue desactivado. El front vuelve al login |
| 401 | `invalid_credentials` | Correo o contraseña incorrectos en el login |
| 403 | `forbidden` | Tu rol no puede hacer esa acción |
| 404 | `not_found` | No existe **o no tenés acceso** (ver [Visibilidad](#roles-y-visibilidad)) |
| 409 | `invalid_status` | La acción no corresponde al estado actual (por ejemplo, "Llegué" dos veces) |
| 409 | `duplicate` | Ya existe (por ejemplo, una placa repetida) |
| 413 | `file_too_large` | La foto supera los 8 MB |
| 422 | `incomplete_report` | "Terminé" sin informe o sin las fotos obligatorias |

## Roles y visibilidad

| Rol (`role`) | En pantalla | Qué actividades ve |
|---|---|---|
| `admin` | Admin | Todas |
| `coordinator` | Coordinador | Todas |
| `cec` | CEC | Todas |
| `technician` | Técnico | Las que **tiene ahora** (`technician_id`), las que **ejecutó** (`performed_by`) y el historial completo de los vehículos que tiene asignados ahora. Solo puede actuar sobre las que tiene ahora |
| `client` | Cliente | Solo las de su empresa. El informe y las fotos, desde `validated` |

Lo que no te corresponde responde **404 y no 403**, para que nadie pueda averiguar probando IDs qué existe de otras empresas.

## Estados (`status`)

`requested` → `assigned` → `on_site` → `report_ready` → `validated` → `delivered`

| Valor | En pantalla |
|---|---|
| `requested` | Solicitada |
| `assigned` | Asignada |
| `on_site` | En sitio |
| `report_ready` | Informe listo |
| `validated` | Validada |
| `returned` | Devuelta (el CEC la devolvió al técnico para corregir) |
| `delivered` | Entregada al cliente |

| Acción | De → A | Quién | Requisitos y efectos |
|---|---|---|---|
| Crear | → `requested`, o `assigned` si viene `technician_id` | client, coordinator | El cliente solo usa vehículos de su empresa y no puede asignar |
| Asignar | `requested` o `assigned` → `assigned` | coordinator | Técnico activo. Se puede reasignar |
| Llegué | `assigned` → `on_site` | técnico que la tiene | GPS. La hora la pone el servidor. Guarda `performed_by` |
| Terminé | `on_site` → `report_ready` | técnico que la tiene | GPS, informe no vacío y las 4 fotos obligatorias. Vacía `technician_id` |
| Validar | `report_ready` → `validated` | cec | — |
| Devolver | `report_ready` → `returned` | cec | Nota obligatoria. Vuelve al técnico que la ejecutó (`technician_id` = `performed_by`) |
| Corregir | (sigue en `returned`) | técnico que la tiene | Editar el informe o las fotos. Cada cambio deja un evento (`correction`, `photo_added`, `photo_deleted`) |
| Reenviar | `returned` → `report_ready` | técnico que la tiene | Mismos requisitos que Terminé, pero sin GPS: la llegada y el fin originales quedan como evidencia. Vacía `technician_id` |
| Entregar | `validated` → `delivered` | coordinator | — |

Cada cambio de estado deja un **evento** con quién, cuándo, de qué estado a cuál y datos extra. Los eventos no se editan ni se borran.

Ruta alterna: `report_ready` → `returned` → `report_ready` (se puede repetir hasta que el CEC valide). El cliente sigue viendo `report_ready` durante la devolución y no ve el informe ni las fotos hasta la validación.

## Rutas

### Salud

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/health` | `{ "ok": true, "database": "connected" }` |

### Autenticación ✅

| Método | Ruta | Quién | Recibe | Devuelve |
|---|---|---|---|---|
| POST | `/auth/login` | todos | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | con sesión | — | `{ user }` |

```json
"user": { "id": 3, "name": "Tomás Técnico", "email": "tecnico1@brujula.test", "role": "technician", "company_id": null }
```

El token dura 12 horas.

### Permisos por rol ✅

Admin puede configurar todos los roles; Coordinador solo Cliente, Técnico y CEC. La gestión de permisos no se puede desactivar. Solo se pueden desactivar o reactivar acciones que el rol ya tenía autorizadas: no se conceden permisos nuevos ni se cambian los filtros de empresa, asignación, estado o autoría. Cada cambio queda registrado con actor y fecha. El servidor comprueba el permiso en cada acción, incluso para sesiones existentes.

| Método | Ruta | Quién | Recibe / devuelve |
|---|---|---|---|
| GET | `/permissions/me` | con sesión | `{ permissions: ["create_activity", …] }`: acciones habilitadas del rol |
| GET | `/permissions` | admin, coordinator | `{ permissions: [{ role, permission, enabled }] }`: solo roles que puede administrar |
| PATCH | `/permissions` | admin, coordinator | `{ role, permission, enabled }` → `{ ok: true }`; una combinación no autorizada para el rol responde 404 |

| Permiso | Acciones |
|---|---|
| `create_activity` | Crear solicitud o actividad |
| `create_vehicle` | Crear vehículo |
| `assign_technician` | Asignar o reasignar, incluso al crear una actividad |
| `record_field_work` | Llegada, informe, fotos y constancia de recibido |
| `finish_report` | Terminar o reenviar el informe |
| `review_report` | Validar o devolver el informe |
| `deliver_report` | Entregar el informe |

### Catálogos ✅

| Método | Ruta | Quién | Devuelve |
|---|---|---|---|
| GET | `/catalogs` | con sesión | `{ activity_types, photo_categories, required_photos, statuses }` |
| GET | `/companies` | internos (el cliente recibe solo la suya) | `{ companies: [{ id, name }] }` |
| GET | `/users?role=technician` | coordinator | `{ users: [user] }`: técnicos activos, para el selector de asignación |

```json
{
  "activity_types": ["gps_install", "camera_install", "sensor_install", "maintenance", "inspection", "uninstall"],
  "photo_categories": ["plate", "odometer", "issue_found", "issue_fixed", "other"],
  "required_photos": ["plate", "odometer", "issue_found", "issue_fixed"],
  "statuses": ["requested", "assigned", "on_site", "report_ready", "validated", "returned", "delivered"]
}
```

| Tipo de actividad | En pantalla | | Categoría de foto | En pantalla |
|---|---|---|---|---|
| `gps_install` | Instalación GPS | | `plate` | Frente con placa |
| `camera_install` | Instalación cámara | | `odometer` | Kilometraje |
| `sensor_install` | Instalación sensor | | `issue_found` | Falla encontrada |
| `maintenance` | Mantenimiento | | `issue_fixed` | Falla solucionada |
| `inspection` | Revisión | | `other` | Otra |
| `uninstall` | Desinstalación | | | |

### Vehículos ✅

| Método | Ruta | Quién | Recibe | Devuelve |
|---|---|---|---|---|
| GET | `/vehicles?plate=DEMO&company_id=1` | todos, con filtro por rol | Filtros opcionales. `plate` busca coincidencias parciales | `{ vehicles: [vehicle] }` |
| GET | `/vehicles/:id` | todos, con filtro por rol | — | `{ vehicle, history: [activity_summary] }` |
| POST | `/vehicles` | coordinator | `{ company_id, plate, make?, model?, description? }` | `201 { vehicle }` |

```json
"vehicle": {
  "id": 1, "plate": "DEMO-101", "make": "Toyota", "model": "Hilux", "description": "",
  "vin": null, "year": null, "color": null,
  "company": { "id": 1, "name": "Transportes Cóndor" }
}
```

La placa se guarda en mayúsculas y es única. `vin`, `year` y `color` son opcionales y llegan en `null` si no están registrados; por ahora las rutas no permiten modificarlos. El técnico ve vehículos asociados a actividades asignadas o ejecutadas por él; el historial completo está disponible para los vehículos que tiene asignados actualmente y, para los demás, solo ve sus propias intervenciones.

### Solicitudes de placa nueva ✅

Un cliente no crea vehículos: cuando un carro entra a su flota pide el servicio con **placa nueva** e informa las características (placa, marca, modelo, VIN, año y color), el tipo de servicio, departamento, ciudad, dirección exacta, fecha y hora preferidas. Un coordinador o admin puede ajustarlos antes de **aprobar** según la disponibilidad; se crean el vehículo y la actividad `requested` con los datos definitivos y se avisa al cliente. Al **rechazarla** debe dejar una nota que ve el cliente.

| Método | Ruta | Quién | Recibe | Devuelve |
|---|---|---|---|---|
| GET | `/vehicle-requests?status=pending` | client (las de su empresa), coordinator, admin | `status` opcional: `pending`, `approved` o `rejected` | `{ requests: [request] }`, de la más reciente a la más antigua |
| GET | `/vehicle-requests/:id` | client de la empresa, coordinator, admin | — | `{ request }`; solicitud ajena o inaccesible responde 404 |
| POST | `/vehicle-requests` | client, con el permiso `create_activity` | `multipart/form-data`: `data` con JSON `{ plate, make?, model?, vin?, year?, color?, type, description?, department, city, location, scheduled_for, resubmitted_from_id? }` y archivo obligatorio `ownership_photo` (JPEG, PNG o WebP, máximo 8 MB) | `201 { request }` |
| GET | `/vehicle-requests/:id/ownership-photo` | client de la empresa, coordinator, admin | — | Imagen; solicitud ajena o foto inexistente responde 404 |
| POST | `/vehicle-requests/:id/approve` | coordinator, admin, con `create_vehicle` y `create_activity` | `{ department?, city?, location?, scheduled_for? }`: ajustes opcionales | `{ request }` con datos originales, `vehicle_id` y `activity_id` |
| POST | `/vehicle-requests/:id/reject` | coordinator, admin, con `create_vehicle` | `{ note }` (3 a 1000 caracteres) | `{ request }` |

```json
"request": {
  "id": 4, "status": "pending", "plate": "NUE123", "make": "Renault", "model": "Master",
  "vin": "9BWZZZ377VT004251", "year": 2024, "color": "Blanco",
  "type": "gps_install", "description": "Instalar GPS", "department": "Cundinamarca",
  "city": "Bogotá", "location": "Calle 1 # 2-3",
  "scheduled_for": "2030-01-15T19:00:00.000Z", "review_note": null, "resubmitted_from_id": null,
  "previous_review_note": null, "has_resubmission": false, "vehicle_id": null, "activity_id": null,
  "created_at": "2026-11-23T22:00:00.000Z", "reviewed_at": null, "has_ownership_photo": true,
  "company": { "id": 1, "name": "Transportes Cóndor" },
  "requested_by": { "id": 7, "name": "Camila Cóndor" }, "reviewed_by": null
}
```

- Técnico y CEC no acceden a la lista (`403`). La placa se guarda en mayúsculas y sin espacios; `year` es opcional, entero entre 0 y 9999; `vin` y `color` también son opcionales. La foto se conserva fuera del repositorio y solo se entrega con sesión autorizada; solicitudes anteriores pueden no tenerla.
- Una placa que ya está en la flota del cliente responde `409 plate_exists`; una pendiente repetida de su empresa, `409 request_pending`. Si la placa pertenece a **otra empresa** la solicitud se acepta igual, para no revelarla; al aprobar, `409 plate_exists` avisa al personal, que puede rechazarla.
- Una solicitud ya revisada responde `409 invalid_status` al aprobar o rechazar.
- Para corregir una solicitud rechazada de su empresa, el cliente envía una nueva con `resubmitted_from_id` y todos los datos y la foto (el front puede reutilizar la foto anterior o reemplazarla). La anterior no se modifica; la nueva muestra al personal el motivo anterior. Cada solicitud rechazada puede reenviarse una sola vez; otra tentativa responde `409 already_resubmitted`. La corrección de un nuevo rechazo parte de la nueva solicitud.
- Al aprobar, la solicitud conserva los datos originales; la actividad muestra los definitivos. El evento `request_approved` guarda `requested` y `approved` con dirección y programación, y el cliente recibe una notificación que abre la actividad. El evento `created` queda a nombre del cliente. En solicitudes anteriores `city` y `department` pueden ser `null`; el personal puede completarlos al aprobar.
- Cada cambio se avisa por `/events` con `change` `vehicle_request_created`, `vehicle_request_approved` o `vehicle_request_rejected` y `activity_id: null`, a coordinador, admin y a los clientes de esa empresa. El rechazo también queda en la campanita de los clientes de la empresa con su motivo; las solicitudes nuevas del personal siguen siendo avisos emergentes y en la lista.

### Notificaciones ✅

Se conservan por usuario desde la activación de la función, con las reglas de los avisos actuales; no se reconstruyen notificaciones anteriores, incluidos rechazos previos a la migración `012`. Solo aparecen mientras el usuario tenga permiso para ver la actividad o pertenezca a la empresa de la solicitud, y las acciones propias no generan avisos para el actor.

Al finalizar el trabajo, los clientes de la empresa reciben un aviso `finished`; esto no les muestra el informe ni las fotos antes de la validación.

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/notifications?before=123` | `{ notifications, has_more }`: hasta 50 avisos, del más reciente al más antiguo; `before` es el id del último aviso de la página anterior |
| GET | `/notifications/unread-count` | `{ count }`: cantidad de avisos no leídos visibles |
| POST | `/notifications/:id/read` | `{ ok: true }`: marca como leído un aviso propio y visible; uno ajeno o inaccesible responde 404 |
| GET | `/notifications/preferences` | `{ preferences: [{ type, enabled, mandatory }] }`: los avisos emergentes del rol del usuario; los `mandatory` no se pueden desactivar |
| PATCH | `/notifications/preferences` | `{ type, enabled }` → `{ ok: true }`; un `type` que no existe o es obligatorio para el rol responde 404 |

Las preferencias son por usuario y solo silencian el aviso emergente y la vibración; la campanita siempre guarda el historial. Tipos que cada rol puede silenciar (coinciden con el `change` del evento): Admin y Coordinador `created`, `arrived`, `finished`, `resubmitted`, `validated`, `vehicle_request`; CEC `finished`, `resubmitted`; Cliente `arrived`, `finished`, `delivered`, `request_approved`, `request_rejected`. Del técnico, `assigned` y `returned` son obligatorios. Por defecto todos están activados.

Cada aviso incluye `id`, `read_at`, `type`, `created_at`, `activity_id`, `vehicle_request_id`, `actor_name`, `plate`, `activity_type` y `review_note`. En un rechazo `activity_id` es `null`, `vehicle_request_id` identifica la solicitud y `review_note` contiene el motivo; en los demás avisos estos dos últimos campos son `null`.

### Actividades ✅

Las acciones del técnico (Llegué, informe, fotos, Terminé) solo las puede hacer **el técnico que tiene la actividad ahora**. Otro técnico que la ve por historial recibe `403 forbidden`.

| Método | Ruta | Quién | Recibe | Devuelve |
|---|---|---|---|---|
| GET | `/activities?status=&vehicle_id=&technician_id=&view=&plate=` | todos, con filtro por rol | Filtros opcionales. `view` es para el técnico: `pending` o `history`; `plate` busca coincidencias parciales sin distinguir mayúsculas | `{ activities: [activity_summary] }` |
| GET | `/activities/counts` | todos, con filtro por rol | — | `{ counts: { requested: 2, on_site: 1, … }, total: 9 }`: cantidad por estado, para los filtros |
| GET | `/activities/:id` | todos, con filtro por rol | — | `{ activity: activity_detail }` |
| GET | `/activities/:id/comments` | todos los que ven la actividad; el cliente solo ve comentarios públicos | — | `{ comments: [activity_comment] }`, del más antiguo al más reciente |
| POST | `/activities/:id/comments` | todos los que ven la actividad, en cualquier estado | `{ body, visibility? }`: texto de 1 a 2.000 caracteres; `visibility` es obligatorio para el personal (`public` o `internal`) y para el cliente siempre es `public` | `201 { comment }` |
| PATCH | `/activities/:id/comments/:commentId` | solo el autor, si aún ve la actividad | `{ body, visibility? }`: el personal puede cambiar la visibilidad; el cliente solo puede usar `public` | `{ comment }`; un comentario visible de otro autor responde 403 |
| POST | `/activities` | client, coordinator | `{ vehicle_id, type, description?, scheduled_for?, technician_id? }` | `201 { activity }` |
| POST | `/activities/:id/assign` | coordinator | `{ technician_id }` | `{ activity }` |
| POST | `/activities/:id/arrive` | técnico que la tiene | `{ lat, lng, accuracy_m? }` | `{ activity }` |
| PATCH | `/activities/:id/report` | técnico que la tiene, en `on_site` | `{ report }` (hasta 10.000 caracteres) | `{ activity }` |
| POST | `/activities/:id/receipt` | técnico que la tiene, en `on_site` | `{ kind: "signed", signer_name, signer_document, signature }` o `{ kind: "nobody_present" }` | `201 { activity }`; una sola constancia por actividad |
| POST | `/activities/:id/photos` | técnico que la tiene, en `on_site` | `multipart/form-data`: `photo` (archivo) + `category` | `201 { photo_id, activity }` |
| POST | `/activities/:id/finish` | técnico que la tiene | `{ lat, lng, accuracy_m? }` | `{ activity }` o `422` |
| POST | `/activities/:id/validate` | cec | — | `{ activity }` |
| POST | `/activities/:id/return` | cec | `{ note }` (3 a 1.000 caracteres) | `{ activity }` |
| POST | `/activities/:id/resubmit` | técnico que la tiene, en `returned` | — | `{ activity }` o `422` |
| POST | `/activities/:id/deliver` | coordinator | — | `{ activity }` |

**Vistas del técnico (`view`):**
- `pending`: las que tiene ahora (`assigned`, `on_site`, `returned`).
- `history`: las que ejecutó y ya entregó (`report_ready`, `validated`, `delivered`).

El informe y las fotos se pueden editar en `on_site` y en `returned`. La nota de una devolución está en el evento `returned` (`events[].note`).

Para el cliente, una actividad en `returned` se presenta como `report_ready` y sin técnico asignado, también en el historial del vehículo. Los filtros y conteos usan ese estado visible; filtrar por `returned` no devuelve actividades.

Las acciones devuelven la actividad completa ya actualizada: el front reemplaza lo que tiene, sin volver a pedirla.

La constancia de recibido es opcional y no modifica el estado de la actividad. En una firma, `signature` es una lista de trazos, cada uno una lista de puntos `[x, y]` enteros entre 0 y 1000; `signer_name` y `signer_document` identifican a la persona presente. El técnico registra la constancia antes de terminar; no se puede modificar ni reemplazar. Es una firma manuscrita capturada en pantalla, no una firma criptográfica ni una autenticación del cliente. El detalle incluye `receipt` (o `null`) con `kind`, datos de la firma cuando existan, `recorded_by` y `created_at`; se muestra únicamente a usuarios autorizados a ver la actividad.

Las novedades públicas son visibles para todos los usuarios que pueden ver la actividad, incluido el cliente, incluso después de la entrega. Las internas solo son visibles para personal con acceso a la actividad; para el cliente responden 404. Los comentarios del cliente son siempre públicos. Los comentarios anteriores a esta distinción siguen siendo públicos. Cada autor puede editar el texto y, si pertenece al personal, cambiar la visibilidad; no se pueden borrar. Cambiar de público a interno impide futuras lecturas del cliente, pero no revierte lecturas anteriores. No cambian el estado de la actividad. Las fechas las registra el servidor; `edited_at` es `null` hasta la primera modificación del texto o de la visibilidad.

```json
"activity_comment": {
  "id": 8, "body": "Se revisó nuevamente la instalación.", "visibility": "public",
  "created_at": "2026-11-07T14:05:12.000Z", "edited_at": null,
  "author": { "id": 3, "name": "Tomás Técnico" }
}
```

```json
"activity_summary": {
  "id": 12, "status": "on_site", "type": "gps_install", "description": "Instalar GPS y probar señal",
  "scheduled_for": "2026-11-07T14:00:00.000Z", "location": null, "city": null, "department": null, "created_at": "2026-11-07T13:00:00.000Z", "updated_at": "2026-11-07T14:05:12.000Z",
  "company":      { "id": 1, "name": "Transportes Cóndor" },
  "vehicle":      { "id": 1, "plate": "DEMO-101", "make": "Toyota", "model": "Hilux" },
  "technician":   { "id": 3, "name": "Tomás Técnico" },
  "performed_by": { "id": 3, "name": "Tomás Técnico" }
}
```

`technician` y `performed_by` pueden venir en `null`. `location` (dirección), `city` y `department` se informan en actividades creadas al aprobar una solicitud de placa nueva; pueden ser `null` en actividades y solicitudes anteriores.

`activity_detail` trae lo mismo que el resumen, más:

```json
{
  "arrival": { "at": "2026-11-07T14:05:12.000Z", "lat": 9.9347, "lng": -84.0875, "accuracy_m": 12 },
  "finish": null,
  "report": "Se encontró el cableado suelto...",
  "photos": [
    { "id": 40, "category": "plate", "mime_type": "image/jpeg", "size_bytes": 284311, "uploaded_at": "2026-11-07T14:10:00.000Z", "url": "/api/photos/40/file?exp=1762530000&sig=abc..." }
  ],
  "missing_photos": ["odometer", "issue_fixed"],
  "events": [
    { "id": 7, "type": "arrived", "from_status": "assigned", "to_status": "on_site", "note": null, "created_at": "2026-11-07T14:05:12.000Z", "user": { "id": 3, "name": "Tomás Técnico" } }
  ]
}
```

- `missing_photos`: las obligatorias que faltan. Sirve para la checklist del técnico.
- Para el cliente: `events` llega vacío, y `report` llega en `null` y `photos` vacío hasta que el estado sea `validated` o `delivered`.

Si "Terminé" falla porque falta algo:

```json
{ "error": { "code": "incomplete_report", "message": "Faltan datos para cerrar el informe",
  "details": { "missing_photos": ["odometer"], "missing_report": false } } }
```

### Tiempo real ✅

| Método | Ruta | Quién | Devuelve |
|---|---|---|---|
| GET | `/events` | con sesión | Stream de [Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events) que queda abierto |

Cada vez que una actividad cambia (se crea, se asigna, Llegué, informe, fotos, Terminé, validar, devolver, reenviar, entregar), el servidor manda a quienes la pueden ver:

```
event: activity.changed
data: {"type":"activity.changed","activity_id":12,"status":"on_site","change":"arrived","actor_id":3,"technician_id":3}
```

- `change`: qué pasó (`created`, `assigned`, `arrived`, `report_updated`, `photo_added`, `photo_deleted`, `receipt_recorded`, `finished`, `validated`, `returned`, `resubmitted`, `delivered`, `comment_added`, `comment_updated`, `request_approved`; y, con `activity_id: null`, `vehicle_request_created`, `vehicle_request_approved`, `vehicle_request_rejected`).
- `actor_id`: quién lo hizo. La app no le muestra notificaciones a nadie por sus propias acciones.
- `technician_id`: quién la tiene ahora (o `null`).

Con eso la app decide qué notificar a cada rol (reglas en `web/src/layout/ActivityNotifier.jsx`).

- Coordinador, CEC y admin reciben todo. El cliente, solo lo de su empresa. El técnico recibe lo que tiene, lo que ejecutó y lo que le acaban de reasignar a otro; las novedades también se actualizan en el historial de vehículos que tiene asignados.
- El cliente no recibe eventos de devolución, reenvío ni correcciones de informe o fotos durante la devolución. Las novedades públicas siguen actualizándose con el estado `report_ready` y sin técnico asignado.
- Los cambios de novedades internas no se notifican al cliente; cuando una novedad pasa de pública a interna o viceversa, se notifica para actualizar la lista visible.
- El aviso no trae datos de la actividad: la pantalla vuelve a pedirlos a la API, que aplica los permisos.
- Cada 25 s llega un comentario `: ping` para que los proxies no corten la conexión.
- En el front ya está resuelto en `web/src/lib/liveUpdates.js`: una pantalla solo tiene que llamar `useActivityChanges(reload)`.

### Fotos ✅

| Método | Ruta | Quién | Notas |
|---|---|---|---|
| GET | `/photos/:id/file?exp=&sig=` | quien tenga la URL | Devuelve la imagen. Sin header de autenticación |
| DELETE | `/photos/:id` | técnico que tiene la actividad, en `on_site` | Primero borra el archivo y después la fila. Deja un evento `photo_deleted`. Devuelve `{ activity }` |

**URLs firmadas:** un `<img src>` no puede mandar el header `Authorization`. El servidor revisa los permisos al armar el detalle y devuelve una URL firmada que vence en 1 o 2 horas; el front la pone directo en el `<img>`. Una URL vencida o modificada responde `403`.

**Límites:** JPEG, PNG o WebP, verificados por el contenido del archivo y no por la extensión. Hasta 8 MB por foto y hasta 20 por actividad. El front comprime antes de subir (unos 1600 px, JPEG) para que cada foto quede alrededor de 300 KB.
