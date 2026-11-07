# Brújula: guía para agentes de IA y para el equipo

Reglas del repo para cualquier persona o asistente de IA que trabaje en él. Cómo levantar el proyecto: `README.md`. Rutas, datos y permisos: `docs/api.md`.

**Tareas del front: `docs/tasks.md`.** Es el lugar único de lo que le toca a Sebas (tareas, novedades que lo afectan y preguntas). Leerlo después de cada `git pull`. Quien cambie algo que afecte al front lo anota ahí en el mismo commit.

## Reglas que no se negocian

- **Los permisos se revisan en el servidor.** Ocultar un botón en el front no protege nada.
- **Un cliente jamás ve datos de otro.** Toda consulta de un cliente se filtra por `company_id`; un técnico solo ve lo que tiene asignado, lo que ejecutó y el historial de los vehículos que tiene asignados ahora.
- **Lo ajeno responde 404, no 403.**
- **Cada cambio de estado lo hace solo el rol autorizado** y deja un evento en `activity_events`, que nunca se edita ni se borra.
- **Solo datos inventados.** Nada de placas, fotos ni nombres reales.
- **Nunca al repo:** `.env`, contraseñas, claves, la carpeta `uploads/` ni datos reales.

## Convenciones

- JavaScript (ESM), sin TypeScript. npm con workspaces (`server/` y `web/`).
- **El código va siempre en inglés:** variables, funciones, archivos, tablas, columnas, enums, rutas, campos JSON, códigos de error, comentarios y mensajes de commit (`activities`, `company_id`, `performed_by`, `on_site`).
- **En español va lo que ve el usuario:** textos de pantalla y el `message` de los errores. El front traduce los valores en inglés a etiquetas en español (`on_site` → "En sitio"); las tablas de traducción están en `docs/api.md`.
- **Si una ruta cambia, `docs/api.md` se actualiza en el mismo commit.**
- Base de datos: SQL directo con `pg`. Los cambios de esquema van en un archivo nuevo en `server/src/db/migrations/` (`002_add_something.sql`); una migración ya aplicada no se edita.
- Front: mobile-first, una columna, botones grandes. Todas las llamadas a la API pasan por `web/src/lib/api.js`, nunca `fetch` directo.
- **UI con shadcn/ui** (base Radix, preset Nova) sobre Tailwind 4. Los componentes base están en `web/src/components/ui/` y son código nuestro. Para sumar uno: desde `web/`, `npx shadcn@4.23.0 add <nombre>`. Los componentes propios de la app van en `web/src/components/` y se arman con los de `ui/`.
- Colores siempre con los tokens del tema (`bg-primary`, `text-muted-foreground`, `border`, `text-destructive`), nunca hex ni grises sueltos. El color de marca es `primary` (definido en `web/src/index.css`).
- Acciones principales con `<Button size="touch">` (48 px de alto, ancho completo); selects con `<NativeSelect size="touch">`, que en el celular abre el selector nativo. Imports con el alias `@/` (`import { Button } from '@/components/ui/button'`).
- Comentarios solo para lo que el código no dice solo (el porqué, un detalle frágil, un TODO).
- Commits chicos con conventional commits: `feat: ...`, `fix: ...`, `docs: ...`. Siempre `git pull` antes de `git push`.
- Mac y Windows: los scripts de npm no usan comandos de un solo sistema (`rm -rf`, `VAR=valor comando`); las variables van en archivos `.env`.
