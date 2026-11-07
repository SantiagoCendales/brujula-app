# Tareas del front

Lugar único de las tareas de Sebas. Se actualiza en el mismo commit que el código de cada bloque.

**Cómo se usa:**
- Después de cada `git pull`, leer este archivo: puede haber tareas nuevas o novedades.
- Al empezar una tarea, moverla a **🔄 En curso**. Al terminarla, a **✅ Hechas** con un commit que diga `feat: ... (T3)`.
- Una tarea está terminada cuando cumple su "Terminado cuando", se ve bien con ancho de celular (Chrome → DevTools → modo dispositivo), no hay errores en la consola y está pusheada.
- Si una tarea necesita algo que no está en la API o en `docs/api.md`, anotarlo en **❓ Preguntas** y avisarle a Santiago.

## 📣 Novedades que afectan al front

- **[bloque 3]** Ya funciona toda la API del MVP: Llegué, informe, fotos, Terminé, validar y entregar (`docs/api.md`, todo con ✅).
- **[bloque 3]** La pantalla de ejecución del técnico vive en `web/src/execution/TechnicianActions.jsx` (Llegué → fotos → informe → Terminé), y los botones de validar (CEC) y entregar (coordinador) en `web/src/execution/ReviewActions.jsx`. Ahí también hay `TODO(T…)` donde van tus componentes.
- **[bloque 3]** La cámara y el GPS están en `web/src/lib/device.js` (`getLocation()`, `compressImage(file)`). No llamar a `navigator.geolocation` ni a la cámara desde otro lado.
- **[bloque 3]** El técnico tiene "Mi historial" (`/technician/history`) y el CEC abre directo en lo que está "Informe listo".
- **[bloque 2]** Ya funcionan listar, ver, crear y asignar actividades (`/activities`). Ver `docs/api.md`.
- **[bloque 2]** Ya existen las pantallas del coordinador (lista con filtro, nueva actividad, detalle con asignación) y del cliente (sus servicios, nueva solicitud, detalle). Están en `pages/ActivitiesPage.jsx`, `pages/NewActivityPage.jsx` y `pages/ActivityDetailPage.jsx`, con estilos provisorios escritos directo en la página. Cada lugar donde va un componente tuyo está marcado con `TODO(T…)`: cuando lo termines, Santiago lo reemplaza.
- **[bloque 2]** Para pedir datos a la API desde una pantalla está `useApi(path)` en `web/src/lib/useApi.js`, y para mostrar fechas `formatDateTime(iso)` en `web/src/lib/format.js`.
- **[bloque 2]** `pages/RoleHome.jsx` ya no existe: el encabezado vive en `layout/AppLayout.jsx` (ahí va a ir tu `Header` de T4).
- **[bloque 1]** Ya funcionan `/auth/login`, `/auth/me`, `/catalogs`, `/companies`, `/users` y `/vehicles`. Detalle en `docs/api.md` (las secciones listas tienen ✅).
- **[bloque 1]** Las etiquetas en español de cada valor están en `web/src/lib/labels.js` (`STATUS_LABELS`, `ROLE_LABELS`, `ACTIVITY_TYPE_LABELS`, `PHOTO_CATEGORY_LABELS`). Usarlas siempre, nunca armar otro mapeo.
- **[bloque 1]** El login ya funciona y cada rol cae en su inicio (`/coordinator`, `/technician`, `/cec`, `/client`). La pantalla de estado de la API pasó a `/status` (`pages/Home.jsx`). Para ver un componente mientras se arma, importarlo ahí.
- **[bloque 1]** Hay dependencias nuevas: después del `git pull`, correr `npm install`.

## 🔜 Para hacer

Bloque 1. Todos van en `web/src/components/`. Son de presentación: reciben datos por props y **no llaman a la API** (Santiago los conecta).

### T1 · `Button.jsx`
- Props: `children`, `variant` (`'primary' | 'secondary' | 'danger'`, por defecto `'primary'`), `type` (por defecto `'button'`), `disabled`, `loading`, `onClick`.
- Ancho completo y alto cómodo para el dedo (`w-full py-3 rounded-xl font-semibold`). Primary con `bg-brand text-white`, secondary con borde, danger en rojo.
- Con `loading` muestra "Cargando…" y queda desactivado.
- **Terminado cuando:** las tres variantes y el estado `loading` se ven en `/status`.

### T2 · `Card.jsx`
- Props: `children` y un `onClick` opcional.
- Fondo blanco, bordes redondeados y sombra suave (`rounded-2xl bg-white p-4 shadow-sm`).
- Con `onClick` se comporta como botón: es un `<button>` con `text-left w-full`, cursor de mano y un efecto al tocar (`active:scale-[0.99]`).
- **Terminado cuando:** se ve una tarjeta normal y una tocable en `/status`.

### T3 · `StatusBadge.jsx`
- Prop: `status` (`requested`, `assigned`, `on_site`, `report_ready`, `validated`, `returned`, `delivered`).
- Muestra `STATUS_LABELS[status]` de `web/src/lib/labels.js` como una píldora (`rounded-full px-3 py-1 text-sm font-medium`).
- Un color por estado en un objeto dentro del archivo. Sugerencia: solicitada gris, asignada azul, en sitio ámbar, informe listo violeta, validada verde, devuelta rojo, entregada verde oscuro.
- **Terminado cuando:** los 7 estados se ven en `/status` con su etiqueta y color.

### T4 · `Header.jsx`
- Props: `userName`, `roleLabel`, `onLogout`.
- Barra superior `bg-brand text-white`: "Brújula" y debajo `userName · roleLabel` a la izquierda; botón "Salir" a la derecha que llama a `onLogout`.
- Referencia: el encabezado provisorio de `pages/RoleHome.jsx`.
- **Terminado cuando:** se ve en `/status` con datos de prueba. Santiago lo conecta en `RoleHome`.

### T5 · `LoginForm.jsx`
- Props: `onSubmit({ email, password })`, `loading`, `error` (texto que se muestra en rojo si viene).
- Campos "Correo" (`type="email"`) y "Contraseña" (`type="password"`), y un botón "Entrar" (usar `Button` de T1). Maneja su propio estado con `useState`.
- Referencia: el formulario provisorio de `pages/Login.jsx`.
- **Terminado cuando:** en `/status` se ve el formulario y al enviar muestra los datos en la consola. Santiago lo conecta al login real.

Bloque 2. También en `web/src/components/` y también de presentación. Conviene hacerlos después de T1–T5, porque los usan. Cada uno tiene una versión provisoria en las páginas como referencia: mirala, entendé qué hace y armá la versión prolija.

### T6 · `ActivityCard.jsx`
- Props: `activity` (un `activity_summary` de `docs/api.md`) y `to` (la ruta del detalle).
- Usa `Card` (T2), `StatusBadge` (T3), `ACTIVITY_TYPE_LABELS` y `formatDateTime`. Todo el card es un `<Link to={to}>` de `react-router`.
- Muestra placa y tipo, la empresa, el estado, la descripción (máximo 2 líneas: `line-clamp-2`), el técnico si tiene, y la fecha (`scheduled_for` o, si no hay, `created_at`).
- Referencia: el card provisorio en `pages/ActivitiesPage.jsx` (`TODO(T6, T7)`).
- **Terminado cuando:** en `/status` se ven dos cards con datos de ejemplo de `docs/api.md`: uno con técnico y otro sin técnico.

### T7 · `StatusFilter.jsx`
- Props: `value` (estado elegido, o `''` para "Todas") y `onChange(nuevoValor)`.
- Fila de píldoras con scroll horizontal: "Todas" más los estados (sin `returned`), con las etiquetas de `STATUS_LABELS`. La elegida se ve resaltada con `bg-brand text-white`.
- Referencia: las píldoras provisorias en `pages/ActivitiesPage.jsx`.
- **Terminado cuando:** en `/status`, al tocar una píldora se resalta y el valor elegido se muestra debajo.

### T8 · `EventTimeline.jsx`
- Props: `events` (la lista `events` de `activity_detail`).
- Línea de tiempo vertical: por cada evento, el estado al que pasó (`STATUS_LABELS[event.to_status]`), quién lo hizo y cuándo (`formatDateTime`).
- Referencia: el bloque "Historial" en `pages/ActivityDetailPage.jsx` (`TODO(T8)`).
- **Terminado cuando:** en `/status` se ve una línea de tiempo con 3 eventos de ejemplo.

### T9 · `TechnicianSelect.jsx`
- Props: `technicians` (lista de `{ id, name }`), `value`, `onChange(id)` y `placeholder` (por defecto "Elegir técnico…").
- Un `<select>` grande y cómodo (`rounded-xl border px-4 py-3 w-full`).
- Referencia: el select de `AssignForm` en `pages/ActivityDetailPage.jsx` (`TODO(T9)`).
- **Terminado cuando:** en `/status` se ve con 3 técnicos de ejemplo y al elegir uno se muestra su id debajo.

Bloque 3. También en `web/src/components/` y de presentación. Es la pantalla que más se va a ver en la demo: que sea clara y cómoda con el dedo.

### T10 · `PhotoChecklist.jsx`
- Props: `items` (lista de `{ category, label, required, count }`), `uploadingCategory` (la que se está subiendo, o `null`) y `onCapture(category)`.
- Una fila por categoría: ✅ si `count > 0`, ⬜ si es obligatoria y falta (con la palabra "obligatoria" en rojo), ➕ para "Otra". A la derecha, un botón "📷 Tomar" que llama a `onCapture(category)` y dice "Subiendo…" cuando `uploadingCategory === category`.
- No abre la cámara él mismo: eso lo hace la página.
- Referencia: `PhotosStep` en `web/src/execution/TechnicianActions.jsx` (`TODO(T10, T12)`).
- **Terminado cuando:** en `/status` se ve con las 5 categorías (usar `PHOTO_CATEGORY_LABELS`), dos de ellas con fotos, y al tocar "Tomar" se muestra en la consola qué categoría fue.

### T11 · `ReportField.jsx`
- Props: `value`, `onChange(texto)`, `maxLength` (por defecto 10.000) y `dirty` (si hay cambios sin guardar).
- Un `<textarea>` grande con su `<label>` "Informe", el contador `actual / máximo` debajo y, si `dirty`, el aviso "Sin guardar" en ámbar.
- Referencia: `ReportAndFinishStep` en `web/src/execution/TechnicianActions.jsx` (`TODO(T11)`).
- **Terminado cuando:** en `/status`, al escribir se actualiza el contador.

### T12 · `PhotoGrid.jsx`
- Props: `photos` (lista de `{ id, url, category }`), `onDelete(id)` opcional.
- Grilla de miniaturas cuadradas (`grid grid-cols-3 gap-2`, `aspect-square object-cover rounded-lg`). La URL va con `apiUrl(photo.url)` de `web/src/lib/api.js`. Si viene `onDelete`, cada miniatura tiene una ✕ arriba a la derecha.
- Al tocar una miniatura, mostrarla en grande (un overlay negro que ocupa toda la pantalla, y se cierra tocándolo).
- Referencia: las miniaturas de `PhotosStep` y la galería "Fotos" de `pages/ActivityDetailPage.jsx`.
- **Terminado cuando:** en `/status` se ven 4 miniaturas de ejemplo (sirve cualquier imagen pública) y al tocar una se ve en grande.

## 🔄 En curso

_(nada)_

## ✅ Hechas

- **T0 · Setup:** clonar, instalar y conectar el front a la API por ngrok.

## ❓ Preguntas

_(nada)_
