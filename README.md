# Brújula

Coordinación y evidencia de servicios técnicos para una empresa que instala GPS, cámaras y sensores en vehículos: quién fue, cuándo, dónde, qué encontró, qué hizo y con qué fotos.

Proyecto de la hackatón **Release Before Ready 2026**. Todos los datos son inventados.

## Estructura

```
brujula-app/
├── server/   API: Node + Express 5 + PostgreSQL
├── web/      App: React + Vite + Tailwind (navegador, y Android con Capacitor más adelante)
└── docs/
    └── api.md   Contrato de la API: rutas, datos, permisos y estados
```

## Requisitos

- Node 22.12 o más (`node -v`)
- Docker, solo en la computadora que corre el backend

## Levantar todo (backend + front)

```bash
npm install                     # instala server/ y web/ de una vez
cp server/.env.example server/.env   # y completar JWT_SECRET (instrucciones adentro)
docker compose up -d            # Postgres en localhost:5433
npm run db:migrate              # crea las tablas
npm run db:seed                 # carga los datos de demo (borra lo que haya)
npm run dev:server              # API en http://localhost:3001
npm run dev:web                 # en otra terminal: app en http://localhost:5173
```

## Solo el front, contra la API de otra computadora

Para trabajar en pantallas sin Docker ni base de datos (por ejemplo desde Windows):

```bash
npm install
```

Crear `web/.env.local` con la IP de la computadora que corre la API:

```
API_PROXY_TARGET=http://192.168.1.50:3001
```

```bash
npm run dev:web                 # http://localhost:5173
```

Si la pantalla de inicio muestra "✅ API y base de datos conectadas", está todo bien.

## App Android (Capacitor)

El proyecto Android está en `web/android/` y se genera a partir del mismo código de `web/src`. Hace falta Android Studio con el SDK instalado.

1. La API tiene que estar alcanzable por HTTPS desde el celular. En desarrollo: `npm run dev:server`, `npm run dev:web` y un túnel `ngrok http --url=<tu-dominio> 5173`.
2. `cp web/.env.android.example web/.env.android` y poner esa URL en `VITE_API_URL`.
3. `npm run android:build`: compila la web con esa URL y la copia al proyecto Android.
4. `npm run android:open`: abre Android Studio. Con el celular conectado por USB y la depuración USB activada, tocar ▶ (Run).

Después de cambiar código del front, repetir el paso 3 y volver a tocar ▶.

## Usuarios de demo

Contraseña de todos: `brujula123`, salvo que se defina `SEED_PASSWORD` en `server/.env`.

| Rol | Correo |
|---|---|
| Admin | `admin@brujula.test` |
| Coordinador | `coordinador@brujula.test` |
| Técnico | `tecnico1@brujula.test`, `tecnico2@brujula.test`, `tecnico3@brujula.test` |
| CEC | `cec@brujula.test` |
| Cliente (Transportes Cóndor) | `cliente.condor@brujula.test` |
| Cliente (Distribuidora La Ceiba) | `cliente.ceiba@brujula.test` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:server` | API con recarga automática |
| `npm run dev:web` | App con recarga automática |
| `npm run db:migrate` | Aplica las migraciones pendientes de `server/src/db/migrations/` |
| `npm run db:seed` | Vacía la base y carga los datos de demo |
| `npm test` | Tests del backend (usan la base `brujula_test`) |
| `npm run build` | Compila la app para producción |
