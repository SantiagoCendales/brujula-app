# Tareas del front

Lugar único de las tareas de Sebas. Se actualiza en el mismo commit que el código de cada bloque.

**Cómo se usa:**
- Después de cada `git pull`, leer este archivo: puede haber tareas nuevas o novedades.
- Al empezar una tarea, moverla a **🔄 En curso**. Al terminarla, a **✅ Hechas** con un commit que diga `feat: ... (T3)`.
- Una tarea está terminada cuando cumple su "Terminado cuando", se ve bien con ancho de celular (Chrome → DevTools → modo dispositivo), no hay errores en la consola y está pusheada.
- Si una tarea necesita algo que no está en la API o en `docs/api.md`, anotarlo en **❓ Preguntas** y avisarle a Santiago.

## 📣 Novedades que afectan al front

- **[bloque 1]** Ya funcionan `/auth/login`, `/auth/me`, `/catalogs`, `/companies`, `/users` y `/vehicles`. Detalle en `docs/api.md` (las secciones listas tienen ✅).
- **[bloque 1]** Las etiquetas en español de cada valor están en `web/src/lib/labels.js` (`STATUS_LABELS`, `ROLE_LABELS`, `ACTIVITY_TYPE_LABELS`, `PHOTO_CATEGORY_LABELS`). Usarlas siempre, nunca armar otro mapeo.
- **[bloque 1]** El login ya funciona y cada rol cae en su inicio (`/coordinator`, `/technician`, `/cec`, `/client`). La pantalla de estado de la API pasó a `/status` (`pages/Home.jsx`). Para ver un componente mientras se arma, importarlo ahí.
- **[bloque 1]** Hay dependencias nuevas: después del `git pull`, correr `npm install`.

## 🔜 Para hacer

Bloque 1. Todos van en `web/src/components/`. Son de presentación: reciben datos por props y **no llaman a la API** (Santiago los conecta).

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

## 🔄 En curso

### T1 · `Button.jsx`
- Props: `children`, `variant` (`'primary' | 'secondary' | 'danger'`, por defecto `'primary'`), `type` (por defecto `'button'`), `disabled`, `loading`, `onClick`.
- Ancho completo y alto cómodo para el dedo (`w-full py-3 rounded-xl font-semibold`). Primary con `bg-brand text-white`, secondary con borde, danger en rojo.
- Con `loading` muestra "Cargando…" y queda desactivado.
- **Terminado cuando:** las tres variantes y el estado `loading` se ven en `/status` y se prueban en el navegador.

### T2 · `Card.jsx`
- Props: `children` y un `onClick` opcional.
- Fondo blanco, bordes redondeados y sombra suave (`rounded-2xl bg-white p-4 shadow-sm`).
- Con `onClick` se comporta como botón: es un `<button>` con `text-left w-full`, cursor de mano y un efecto al tocar (`active:scale-[0.99]`).
- **Terminado cuando:** se ve una tarjeta normal y una tocable en `/status` y se prueban en el navegador.

## ✅ Hechas

- **T0 · Setup:** clonar, instalar y conectar el front a la API por ngrok.

### T3 · `StatusBadge.jsx`
- Prop: `status` (`requested`, `assigned`, `on_site`, `report_ready`, `validated`, `returned`, `delivered`).
- Muestra `STATUS_LABELS[status]` de `web/src/lib/labels.js` como una píldora (`rounded-full px-3 py-1 text-sm font-medium`).
- Un color por estado en un objeto dentro del archivo. Sugerencia: solicitada gris, asignada azul, en sitio ámbar, informe listo violeta, validada verde, devuelta rojo, entregada verde oscuro.
- **Terminado cuando:** los 7 estados se ven en `/status` con su etiqueta y color; probado en viewport móvil, sin errores en consola y publicado.

## ❓ Preguntas

_(nada)_
