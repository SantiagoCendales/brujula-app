# Tareas del front

Lugar único de las tareas de Sebas. Se actualiza en el mismo commit que el código de cada bloque.

**Cómo se usa:**
- Después de cada `git pull`, leer este archivo: puede haber tareas nuevas o novedades.
- Al empezar una tarea, moverla a **🔄 En curso**. Al terminarla, a **✅ Hechas** con un commit que diga `feat: ... (T6)`.
- Una tarea está terminada cuando cumple su "Terminado cuando", se ve bien con ancho de celular (Chrome → DevTools → modo dispositivo), no hay errores en la consola y está pusheada.
- Si una tarea necesita algo que no está en la API o en `docs/api.md`, anotarlo en **❓ Preguntas** y avisarle a Santiago.

## 📣 Novedades que afectan al front

- **[filtros]** Tu `StatusFilter` ahora muestra la cantidad en cada filtro ("En sitio 2"). Le sumé una prop opcional `counts` (la respuesta de `GET /activities/counts`); sin ella se ve igual que antes. Se actualiza en vivo.
- **[pulido]** Nuevos `components/BrujulaLogo.jsx` (el logo, toma el color del texto) y `components/EmptyState.jsx` (pantalla vacía con ícono, título y texto). Usarlos en pantallas nuevas.
- **[notificaciones]** Cada rol recibe un aviso arriba (tarjeta con ícono, placa y botón **Ver actividad**) cuando pasa algo que le importa: al técnico cuando le asignan o le devuelven una actividad; al coordinador cuando un técnico llega, envía o reenvía un informe, un cliente pide un servicio o se valida un informe; al CEC cuando hay un informe para validar; al cliente cuando el técnico llega o le entregan el informe. Las reglas están en `layout/ActivityNotifier.jsx` (`RULES`). Para otros avisos simples: `import { toast } from 'sonner'` y `toast('Texto')`.
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

Todos van en `web/src/components/`, se arman con los componentes de `components/ui/` y son de presentación: reciben datos por props y **no llaman a la API** (Santiago los conecta). Cada uno tiene una versión provisoria en las páginas, marcada con `TODO(T…)`: mirala, entendé qué hace y sacala a su propio componente, más prolija.

### T12 · `PhotoGrid.jsx`
- Props: `photos` (lista de `{ id, url, category }`) y `onDelete(id)` opcional.
- Grilla de miniaturas cuadradas (`grid grid-cols-3 gap-2`, `aspect-square object-cover rounded-md`). La URL va con `apiUrl(photo.url)` de `web/src/lib/api.js`. Si viene `onDelete`, cada miniatura tiene un `<Button size="icon-sm">` con el ícono `X` arriba a la derecha.
- Al tocar una miniatura se abre en grande con `<Dialog>` de `@/components/ui/dialog`.
- Referencia: las miniaturas de `PhotosStep` y la galería "Fotos" de `pages/ActivityDetailPage.jsx` (`TODO(T12)`).
- **Terminado cuando:** en `/status` se ven 4 miniaturas de ejemplo (sirve cualquier imagen pública) y al tocar una se abre en grande.

## 🔄 En curso

_(nada)_

## ✅ Hechas

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

## ❌ Ya no hacen falta (las cubre shadcn/ui)

- **T1 `Button`, T2 `Card`, T9 `TechnicianSelect`:** son `Button`, `Card` y `NativeSelect` de `components/ui/`.
- **T3 `StatusBadge`, T4 `Header`, T5 `LoginForm`:** los armó Santiago con shadcn durante la migración (`components/StatusBadge.jsx`, `layout/AppLayout.jsx`, `pages/Login.jsx`).

## ❓ Preguntas

_(nada)_
