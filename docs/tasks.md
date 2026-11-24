# Tareas del proyecto

Lugar único de las tareas del proyecto, que Sebas llevará adelante individualmente después de la hackatón. Incluye trabajo de front, back, base de datos y documentación. Se actualiza en el mismo commit que el código de cada bloque.

**Cómo se usa:**
- Después de cada `git pull`, leer este archivo: puede haber tareas nuevas o novedades.
- Trabajar una tarea a la vez: al empezarla, moverla a **🔄 En curso**; al terminarla, pasarla a **✅ Hechas**.
- Una tarea está terminada cuando cumple sus criterios, las pruebas correspondientes pasan y la documentación relacionada está actualizada.
- Para cambios de front, revisar la pantalla con ancho de celular (Chrome → DevTools → modo dispositivo) y confirmar que no haya errores en la consola.
- Si una decisión o dependencia bloquea una tarea, anotarla en **❓ Preguntas** antes de avanzar con una suposición.

## 📣 Novedades que afectan al front

- **[notificaciones]** Todos los roles tienen el engranaje de Configuración → «Notificaciones», donde se activan o desactivan los avisos emergentes y la vibración (`pages/NotificationPreferencesPage.jsx`). La campanita sigue guardando todo; los avisos del técnico (asignación y devolución) son obligatorios. Cada regla de `ActivityNotifier` tiene un `type`.
- **[notificaciones]** Al pulsar «Terminé», el cliente recibe un aviso de que el técnico terminó el trabajo; el informe sigue oculto hasta su validación.
- **[vehículos]** La lista muestra placas; el detalle incluye marca, modelo, VIN, año, color e historial. El técnico accede desde la placa de la actividad, según sus permisos actuales.
- **[notificaciones]** El panel permite desplazarse sin recortar los botones. Cada aviso sin leer se puede marcar como leído sin abrir la actividad; el contador de la campanita se actualiza al hacerlo.
- **[devoluciones]** El cliente no ve el filtro «Devuelta»; la API presenta esas actividades como «Informe listo» y oculta el informe y las fotos hasta la validación.
- **[cursor]** Los controles interactivos habilitados muestran el cursor de mano en escritorio; los campos editables mantienen el cursor de texto.
- **[pestañas]** La navegación y las pestañas del detalle usan botones ovalados con sombra debajo; la opción activa se resalta con el color principal y una sombra más marcada.
- **[novedades]** El detalle incluye una pestaña de comentarios públicos o internos. El personal elige y ve la visibilidad; el cliente no ve esa etiqueta. Los internos usan el color principal del tema. Las rutas y datos están en `docs/api.md`.
- **[configuración]** El engranaje abre Configuración; Admin y Coordinador además tienen «Permisos por rol».
- **[desarrollo]** Vite también acepta túneles de ngrok con dominios `ngrok-free.dev`, además de `ngrok-free.app`.
- **[componentes]** Nuevos componentes reutilizables en `web/src/components/`: `ScheduleField` (fecha con calendario y hora con dos selectores), `VehicleCombobox` (buscador de vehículo por placa), `ActivityTypePicker` (tipo de servicio con íconos), `TechnicianDrawer` (panel desde abajo para elegir técnico) y `ConfirmAction` (botón que pide confirmación). Ejemplos en `pages/NewActivityPage.jsx` y `execution/`.
- **[componentes]** Nuevos de shadcn en `components/ui/`: `Calendar`, `Popover`, `Command`, `ToggleGroup`, `AlertDialog`, `Drawer` (panel que sube desde abajo, como "Asignar técnico") y `Tabs` (el detalle ahora tiene Resumen / Fotos / Historial). Tu `PhotoGrid` (T12) va en la pestaña **Fotos** de `pages/ActivityDetailPage.jsx`.
- **[componentes]** Hay dependencias nuevas: después del `git pull`, correr `npm install`.
- **[filtros]** Tu `StatusFilter` ahora muestra la cantidad en cada filtro ("En sitio 2"). Le sumé una prop opcional `counts` (la respuesta de `GET /activities/counts`); sin ella se ve igual que antes. Se actualiza en vivo.
- **[pulido]** Nuevos `components/BrujulaLogo.jsx` (el logo, toma el color del texto) y `components/EmptyState.jsx` (pantalla vacía con ícono, título y texto). Usarlos en pantallas nuevas.
- **[notificaciones]** Cada rol recibe un aviso arriba (tarjeta con ícono, placa y botón **Ver actividad**) cuando pasa algo que le importa: al técnico cuando le asignan o le devuelven una actividad; al coordinador cuando un técnico llega, envía o reenvía un informe, un cliente pide un servicio o se valida un informe; al CEC cuando hay un informe para validar; al cliente cuando el técnico llega, termina el trabajo o le entregan el informe. Las reglas están en `layout/ActivityNotifier.jsx` (`RULES`). Para otros avisos simples: `import { toast } from 'sonner'` y `toast('Texto')`.
- **[tiempo real]** Las pantallas se actualizan solas cuando alguien cambia una actividad (por ejemplo, el técnico marca Llegué y el coordinador lo ve al instante). Arriba, al lado de "Brújula", hay un indicador "En vivo".
- **[tiempo real]** Si armás una pantalla que muestra actividades, para que se refresque sola: `const { data, reload } = useApi(...)` y después `useActivityChanges(reload)` (de `@/lib/liveUpdates`). Ejemplo en `pages/ActivitiesPage.jsx`.
- **[devolver]** Nuevo flujo: el CEC puede **devolver** un informe con una nota; vuelve al técnico en estado "Devuelta", él corrige y lo **reenvía**. Pantallas en `execution/ReviewActions.jsx` (CEC) y `execution/TechnicianActions.jsx` (técnico).
- **[devolver]** Agregué `returned` a tu `StatusFilter` (antes lo excluía porque estaba fuera del MVP; ahora es un estado real).
- **[devolver]** Para el texto de un evento usar `eventLabel(event)` de `web/src/lib/labels.js`. Los eventos pueden traer `note` (la nota de la devolución). Ya se la sumé a tu `EventTimeline` (T8), junto con `eventLabel`.
- **[vehículos]** Nueva pestaña **Vehículos** (coordinador, CEC y cliente) con búsqueda por placa y el historial de cada vehículo: `pages/VehiclesPage.jsx` y `pages/VehicleDetailPage.jsx`. El historial usa tu `ActivityCard`.
- **[vehículos]** La navegación ahora son pestañas debajo del encabezado, definidas por rol en `layout/AppLayout.jsx` (`TABS`). Por eso `ActivitiesPage` ya no tiene el link secundario `secondaryLink`.
- **[bloque 4]** La app ya se empaqueta para Android con Capacitor (`web/android/`). No cambia nada en cómo se escriben las pantallas: el mismo código corre en el navegador y en el APK. Lo único: **cámara y GPS siempre por `web/src/lib/device.js`**, porque ahí se decide si se usa el navegador o el celular nativo.
- **[bloque 4]** Hay dependencias nuevas: después del `git pull`, correr `npm install`.
- **[UI] Pasamos a shadcn/ui.** Los componentes base (`Button`, `Card`, `Badge`, `Input`, `Label`, `Textarea`, `NativeSelect`, `Dialog`, `Alert`, `Skeleton`, `Separator`) ya están en `web/src/components/ui/`. **No hay que crearlos:** se importan con `import { Button } from '@/components/ui/button'`. Ejemplos de uso en cualquier página de `web/src/pages/`.
- **[UI]** Reglas de estilo (están en `AGENTS.md`): colores solo con tokens del tema (`bg-primary`, `text-muted-foreground`, `text-destructive`, `border`), nunca `bg-brand`, hex ni grises sueltos. Acciones principales con `<Button size="touch">`. Íconos de `lucide-react` (`import { Camera } from 'lucide-react'`), no emojis.
- **[UI]** Ya existen `components/StatusBadge.jsx` (etiqueta de color por estado) y `components/ErrorMessage.jsx` (alerta roja). Usarlos.
- **[UI]** Si ya habías empezado T1–T5 o T9, descartalo: ya no hacen falta (ver abajo).
- **[UI]** Hay dependencias nuevas: después del `git pull`, correr `npm install`.
- **[bloque 3]** Ya funciona toda la API del MVP: Llegué, informe, fotos, Terminé, validar y entregar (`docs/api.md`, todo con ✅).
- **[bloque 3]** La pantalla de ejecución del técnico vive en `web/src/execution/TechnicianActions.jsx` (Llegué → fotos → informe → Terminé), y los botones de validar (CEC) y entregar (coordinador) en `web/src/execution/ReviewActions.jsx`.
- **[bloque 3]** La cámara y el GPS están en `web/src/lib/device.js` (`getLocation()`, `compressImage(file)`). No llamar a `navigator.geolocation` ni a la cámara desde otro lado.
- **[bloque 2]** Para pedir datos a la API desde una pantalla está `useApi(path)` en `web/src/lib/useApi.js`, y para mostrar fechas `formatDateTime(iso)` en `web/src/lib/format.js`.
- **[bloque 1]** Las etiquetas en español de cada valor están en `web/src/lib/labels.js`. Usarlas siempre, nunca armar otro mapeo.
- **[bloque 1]** Para ver un componente mientras se arma, importarlo en `pages/Home.jsx` y abrir `/status`.

## 🔜 Para hacer

### Ideas para después de la hackatón

Abordarlas de a una, actualizando su estado aquí antes de empezar.

- [ ] **Vehículos agrupados:** en las vistas de Admin y Coordinador, organizar los vehículos por cliente y luego por placa.
- [ ] **Solicitud de nueva placa:** impedir que el cliente cree vehículos directamente; permitirle solicitar una placa nueva y crear el vehículo en el sistema una vez validada la solicitud.
- [ ] **Datos de la solicitud:** pedir lugar, fecha y hora al cliente al crear una solicitud de nueva placa.

### Componentes de front pendientes

Los componentes van en `web/src/components/`, se arman con los componentes de `components/ui/` y son de presentación: reciben datos por props y no llaman a la API. Cada uno tiene una versión provisoria en las páginas, marcada con `TODO(T…)`: revisarla y extraerla a su propio componente.

## 🔄 En curso

- **Preferencias de notificaciones:** cada usuario elige qué avisos emergentes y vibraciones recibe desde Configuración; la campanita conserva el historial y los avisos críticos del técnico son obligatorios. Pendiente de pruebas del usuario.
- **Características de vehículos:** consultar VIN, año y color en el detalle para todos los roles, sin edición de esos datos por ahora.
- **Devoluciones internas:** el cliente conserva el último estado anterior a la devolución; el informe y las fotos se muestran solo después de la validación.

## ✅ Hechas

- **Llegada y salida del técnico:** el detalle muestra «Llegada» y «Fin» (se registra al pulsar «Terminé»), y el cliente recibe un aviso cuando el técnico termina el trabajo.
- **Visibilidad del informe:** el cliente no ve el contenido del informe ni las fotos hasta la validación. Se decidió mantener el estado «Informe listo» visible para él desde que el técnico termina.
- **Novedades de la actividad:** comentarios públicos o internos en cualquier estado; cada autor puede editar los suyos y su visibilidad si es personal, sin borrarlos, con fechas de creación y edición.
- **Permisos por rol:** Admin y Coordinador pueden activar o desactivar las acciones autorizadas para los roles que administran, sin modificar los límites de acceso a los datos. Probado en celular y web.
- **Historial de notificaciones:** los avisos se conservan por usuario desde su activación y se consultan desde la campanita del encabezado, con indicador de no leídas.
- **Áreas seguras en Android:** el encabezado y el inicio de sesión respetan la cámara frontal y las barras del sistema.
- **Firma de recibido:** el técnico puede registrar una firma manuscrita con nombre y documento de quien recibe, o dejar constancia de que no había nadie. Es opcional, no se puede reemplazar y fue probada en celular.
- **Historial por placa:** todos los roles pueden buscar por coincidencia parcial de placa en sus listas de actividades; el técnico también en "Mi historial". Los demás roles pueden consultar el historial del vehículo desde la pestaña Vehículos.
- **T12 · `PhotoGrid`:** conectado en `ActivityDetailPage` y `PhotosStep`, probado en `/status` en móvil.
- **T11 · `ReportField`:** conectado en `ReportAndFinishStep` y probado en `/status` en móvil.
- **T10 · `PhotoChecklist`:** conectado en `PhotosStep` y probado en `/status` en móvil.
- **T8 · `EventTimeline`:** conectado en `ActivityDetailPage` y probado en `/status` en móvil.
- **T7 · `StatusFilter`:** conectado en `ActivitiesPage` y probado en `/status` en móvil.
- **T6 · `ActivityCard`:** revisada y conectada en todas las listas (`pages/ActivitiesPage.jsx`). 👏
- **T0 · Setup:** clonar, instalar y conectar el front a la API por ngrok.

### T6 · `ActivityCard.jsx`
- Props: `activity` (un `activity_summary` de `docs/api.md`) y `to` (la ruta del detalle).
- Un `<Link to={to}>` de `react-router` que envuelve un `<Card size="sm">` con: placa y tipo (`ACTIVITY_TYPE_LABELS`), la empresa, `<StatusBadge>`, la descripción en máximo 2 líneas (`line-clamp-2`), el técnico si tiene, y la fecha (`scheduled_for` o, si no hay, `created_at`, con `formatDateTime`).
- Referencia: el card en `pages/ActivitiesPage.jsx`.
- **Terminado cuando:** en `/status` se ven dos cards con datos de ejemplo de `docs/api.md`: uno con técnico y otro sin; probado en viewport móvil, sin errores en consola y publicado.

### T7 · `StatusFilter.jsx`
- Props: `value` (estado elegido, o `''` para "Todas") y `onChange(nuevoValor)`.
- Fila con scroll horizontal de `<Button size="sm" className="rounded-full">`: "Todas" más los estados (sin `returned`), con `STATUS_LABELS`. La elegida con `variant="default"`, las demás con `variant="outline"`.
- Referencia: las píldoras en `pages/ActivitiesPage.jsx`.
- **Terminado cuando:** en `/status`, al tocar una se resalta y el valor elegido se muestra debajo; probado en móvil, sin errores de consola y publicado.

### T8 · `EventTimeline.jsx`
- Props: `events` (la lista `events` de `activity_detail`).
- Línea de tiempo vertical dentro de un `<Card>`: por cada evento, un punto de color `bg-primary` sobre una línea, el texto (`STATUS_LABELS[event.to_status]`, o `EVENT_TYPE_LABELS[event.type]` si no cambió de estado), quién lo hizo y cuándo.
- Referencia: el bloque "Historial" en `pages/ActivityDetailPage.jsx`.
- **Terminado cuando:** en `/status` se ve una línea de tiempo con 3 eventos de ejemplo; probado en viewport móvil, sin errores en consola y publicado.

### T10 · `PhotoChecklist.jsx`
- Props: `items` (lista de `{ category, label, required, count }`), `uploadingCategory` (la que se está subiendo, o `null`) y `onCapture(category)`.
- Una fila por categoría con un ícono de `lucide-react`: `CircleCheck` verde si `count > 0`, `Circle` gris si es obligatoria y falta (más la palabra "obligatoria" en `text-destructive`), `Plus` para "Otra". A la derecha, `<Button variant="secondary" size="lg">` con el ícono `Camera` y "Tomar", que pasa a `LoaderCircle` girando y "Subiendo…" cuando `uploadingCategory === category`.
- No abre la cámara él mismo: eso lo hace la página.
- Referencia: `PhotosStep` en `web/src/execution/TechnicianActions.jsx`.
- **Terminado cuando:** en `/status` se ve con las 5 categorías (`PHOTO_CATEGORY_LABELS`), dos con fotos, y al tocar "Tomar" se muestra en la consola qué categoría fue; probado en viewport móvil, sin errores en consola y publicado.

### T11 · `ReportField.jsx`
- Props: `value`, `onChange(texto)`, `maxLength` (por defecto 10.000) y `dirty` (si hay cambios sin guardar).
- `<Label>` "Informe", `<Textarea className="text-base">`, el contador `actual / máximo` debajo y, si `dirty`, el aviso "Sin guardar" en ámbar.
- Referencia: `ReportAndFinishStep` en `web/src/execution/TechnicianActions.jsx`.
- **Terminado cuando:** en `/status`, al escribir se actualiza el contador; probado en viewport móvil, sin errores en consola y publicado.

### T12 · `PhotoGrid.jsx`
- Props: `photos` (lista de `{ id, url, category }`) y `onDelete(id)` opcional.
- Grilla de miniaturas cuadradas (`grid grid-cols-3 gap-2`, `aspect-square object-cover rounded-md`). La URL va con `apiUrl(photo.url)`. Si viene `onDelete`, cada miniatura tiene un `<Button size="icon-sm">` con el ícono `X` arriba a la derecha.
- Al tocar una miniatura se abre en grande con `<Dialog>` de `@/components/ui/dialog`.
- Referencia: las miniaturas de `PhotosStep` y la galería "Fotos" de `pages/ActivityDetailPage.jsx`.
- **Terminado cuando:** en `/status` se ven 4 miniaturas de ejemplo y al tocar una se abre en grande; probado en viewport móvil, sin errores en consola y publicado.

## ❌ Ya no hacen falta (las cubre shadcn/ui)

- **T1 `Button`, T2 `Card`, T9 `TechnicianSelect`:** son `Button`, `Card` y `NativeSelect` de `components/ui/`.
- **T3 `StatusBadge`, T4 `Header`, T5 `LoginForm`:** los armó Santiago con shadcn durante la migración (`components/StatusBadge.jsx`, `layout/AppLayout.jsx`, `pages/Login.jsx`).

## ❓ Preguntas

_(nada)_
