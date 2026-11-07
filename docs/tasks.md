# Tareas del front

Lugar único de las tareas de Sebas. Se actualiza en el mismo commit que el código de cada bloque.

**Cómo se usa:**
- Después de cada `git pull`, leer este archivo: puede haber tareas nuevas o novedades.
- Al empezar una tarea, moverla a **🔄 En curso**. Al terminarla, a **✅ Hechas** con un commit que diga `feat: ... (T6)`.
- Una tarea está terminada cuando cumple su "Terminado cuando", se ve bien con ancho de celular (Chrome → DevTools → modo dispositivo), no hay errores en la consola y está pusheada.
- Si una tarea necesita algo que no está en la API o en `docs/api.md`, anotarlo en **❓ Preguntas** y avisarle a Santiago.

## 📣 Novedades que afectan al front

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

### T6 · `ActivityCard.jsx`
- Props: `activity` (un `activity_summary` de `docs/api.md`) y `to` (la ruta del detalle).
- Un `<Link to={to}>` de `react-router` que envuelve un `<Card size="sm">` con: placa y tipo (`ACTIVITY_TYPE_LABELS`), la empresa, `<StatusBadge>`, la descripción en máximo 2 líneas (`line-clamp-2`), el técnico si tiene, y la fecha (`scheduled_for` o, si no hay, `created_at`, con `formatDateTime`).
- Referencia: el card en `pages/ActivitiesPage.jsx` (`TODO(T6, T7)`).
- **Terminado cuando:** en `/status` se ven dos cards con datos de ejemplo de `docs/api.md`: uno con técnico y otro sin.

### T7 · `StatusFilter.jsx`
- Props: `value` (estado elegido, o `''` para "Todas") y `onChange(nuevoValor)`.
- Fila con scroll horizontal de `<Button size="sm" className="rounded-full">`: "Todas" más los estados (sin `returned`), con `STATUS_LABELS`. La elegida con `variant="default"`, las demás con `variant="outline"`.
- Referencia: las píldoras en `pages/ActivitiesPage.jsx`.
- **Terminado cuando:** en `/status`, al tocar una se resalta y el valor elegido se muestra debajo.

### T8 · `EventTimeline.jsx`
- Props: `events` (la lista `events` de `activity_detail`).
- Línea de tiempo vertical dentro de un `<Card>`: por cada evento, un punto de color `bg-primary` sobre una línea, el texto (`STATUS_LABELS[event.to_status]`, o `EVENT_TYPE_LABELS[event.type]` si no cambió de estado), quién lo hizo y cuándo.
- Referencia: el bloque "Historial" en `pages/ActivityDetailPage.jsx` (`TODO(T8)`).
- **Terminado cuando:** en `/status` se ve una línea de tiempo con 3 eventos de ejemplo.

### T10 · `PhotoChecklist.jsx`
- Props: `items` (lista de `{ category, label, required, count }`), `uploadingCategory` (la que se está subiendo, o `null`) y `onCapture(category)`.
- Una fila por categoría con un ícono de `lucide-react`: `CircleCheck` verde si `count > 0`, `Circle` gris si es obligatoria y falta (más la palabra "obligatoria" en `text-destructive`), `Plus` para "Otra". A la derecha, `<Button variant="secondary" size="lg">` con el ícono `Camera` y "Tomar", que pasa a `LoaderCircle` girando y "Subiendo…" cuando `uploadingCategory === category`.
- No abre la cámara él mismo: eso lo hace la página.
- Referencia: `PhotosStep` en `web/src/execution/TechnicianActions.jsx` (`TODO(T10, T12)`).
- **Terminado cuando:** en `/status` se ve con las 5 categorías (`PHOTO_CATEGORY_LABELS`), dos con fotos, y al tocar "Tomar" se muestra en la consola qué categoría fue.

### T11 · `ReportField.jsx`
- Props: `value`, `onChange(texto)`, `maxLength` (por defecto 10.000) y `dirty` (si hay cambios sin guardar).
- `<Label>` "Informe", `<Textarea className="text-base">`, el contador `actual / máximo` debajo y, si `dirty`, el aviso "Sin guardar" en ámbar.
- Referencia: `ReportAndFinishStep` en `web/src/execution/TechnicianActions.jsx` (`TODO(T11)`).
- **Terminado cuando:** en `/status`, al escribir se actualiza el contador.

### T12 · `PhotoGrid.jsx`
- Props: `photos` (lista de `{ id, url, category }`) y `onDelete(id)` opcional.
- Grilla de miniaturas cuadradas (`grid grid-cols-3 gap-2`, `aspect-square object-cover rounded-md`). La URL va con `apiUrl(photo.url)` de `web/src/lib/api.js`. Si viene `onDelete`, cada miniatura tiene un `<Button size="icon-sm">` con el ícono `X` arriba a la derecha.
- Al tocar una miniatura se abre en grande con `<Dialog>` de `@/components/ui/dialog`.
- Referencia: las miniaturas de `PhotosStep` y la galería "Fotos" de `pages/ActivityDetailPage.jsx` (`TODO(T12)`).
- **Terminado cuando:** en `/status` se ven 4 miniaturas de ejemplo (sirve cualquier imagen pública) y al tocar una se abre en grande.

## 🔄 En curso

_(nada)_

## ✅ Hechas

- **T0 · Setup:** clonar, instalar y conectar el front a la API por ngrok.

## ❌ Ya no hacen falta (las cubre shadcn/ui)

- **T1 `Button`, T2 `Card`, T9 `TechnicianSelect`:** son `Button`, `Card` y `NativeSelect` de `components/ui/`.
- **T3 `StatusBadge`, T4 `Header`, T5 `LoginForm`:** los armó Santiago con shadcn durante la migración (`components/StatusBadge.jsx`, `layout/AppLayout.jsx`, `pages/Login.jsx`).

## ❓ Preguntas

_(nada)_
