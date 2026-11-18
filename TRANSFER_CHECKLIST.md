# 📦 Transfer Checklist - Brújula Full Stack Learning

**Para transferir a otra máquina o compartir con el equipo**

---

## ✅ Archivos de Contexto Creados

```
proyecto-root/
├── LEARNING_CONTEXT.json        ← Contexto estructurado en JSON
├── LEARNING_PROGRESS.md         ← Progreso en Markdown legible
└── TRANSFER_CHECKLIST.md        ← Este archivo
```

### Usar estos archivos para:
- 📱 Compartir contexto con otra persona
- 💻 Cambiar de máquina sin perder progreso
- 📚 Referencia rápida del estado actual
- 🎓 Onboarding de nuevos desarrolladores

---

## 🚀 En la Nueva Máquina - Setup Inicial

### Paso 1: Clonar el repo (si no lo tienes)
```bash
git clone <repo-url>
cd brujula-app
```

### Paso 2: Leer contexto
```bash
# Lee primero esto para entender dónde estamos
cat LEARNING_PROGRESS.md
# O abre en VS Code:
code LEARNING_PROGRESS.md
```

### Paso 3: Instalar y levantar
```bash
npm install
cp server/.env.example server/.env
# Generar JWT_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

docker compose up -d
npm run db:migrate
npm run db:seed

# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:web
```

### Paso 4: Verificar
Entra a `http://localhost:5173` y haz login con:
- admin@brujula.test / brujula123

---

## 📊 Estado Actual del Aprendizaje

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| **Base de Datos** | ✅ Completado | 6 tablas, datos reales consultados |
| **API (Express)** | ⏳ Próximo | Leer docs/api.md |
| **Frontend (React)** | ⏳ Después | Componentes y hooks |
| **Flujo Completo** | ⏳ Después | Integración full stack |
| **Feature Nueva** | ⏳ Último | Práctica final |

---

## 📚 Lo Que Debe Saber Quien Continúe

### Conocimientos Previos del Estudiante:
- ✅ SQL básico
- ✅ Estructura de BD
- ✅ Tipos de datos
- ✅ Relaciones entre tablas (FK)

### Ha Aprendido:
- ✅ Brújula es un sistema de GPS/cámaras en vehículos
- ✅ Hay 6 tablas: companies, users, vehicles, activities, photos, activity_events
- ✅ 7 estados de activity: requested → assigned → on_site → report_ready → validated → delivered
- ✅ Permisos por rol (admin, coordinator, cec, technician, client)
- ✅ Datos reales en el sistema

### Aprenderá Ahora:
- ⏳ Cómo Express accede a PostgreSQL
- ⏳ Cómo funciona JWT
- ⏳ Cómo React consume la API
- ⏳ Flujo completo: click → API → BD → respuesta → pantalla

---

## 🎯 Modulos Pendientes

### MÓDULO 2: API (1-1.5 hrs)
**Archivo clave:** `docs/api.md` ← LEER PRIMERO

Temas:
- Express basics
- Endpoints (GET, POST, PUT, DELETE)
- Login real: POST /auth/login
- JWT tokens
- Validación de permisos
- Errores (400, 401, 403, 404, etc)

**Práctica:** Seguir un login de punta a punta

### MÓDULO 3: React (1-1.5 hrs)
**Archivo clave:** `web/src/lib/api.js`

Temas:
- Componentes JSX
- useState para estados
- useEffect para efectos
- Fetch a API
- Traducción de valores

**Práctica:** Ver cómo React llama `/api/activities`

### MÓDULO 4: Flujo Completo (30 mins)
**Objetivo:** Seguir UN click

```
Click "Entrar" → 
  React envía POST /api/auth/login → 
    Express valida → 
      PostgreSQL busca user → 
        Express devuelve {token, user} → 
          React guarda token → 
            React muestra lista de activities
```

### MÓDULO 5: Feature Nueva (1-2 hrs)
**Objetivo:** Crear algo de punta a punta

Ejemplo: "Agregar campo 'notes' a una activity"
1. Migración SQL (agregar columna)
2. API (devolver en GET, actualizar en PUT)
3. React (formulario para editar)

---

## 🔑 Credenciales de Demo (invariables)

```
Contraseña TODAS: brujula123

admin@brujula.test              (Ana Admin - ve todo)
coordinador@brujula.test        (Carlos - asigna y valida)
tecnico1@brujula.test           (Tomás - ejecuta servicios)
tecnico2@brujula.test           (Teresa - ejecuta servicios)
tecnico3@brujula.test           (Tito - ejecuta servicios)
cec@brujula.test                (Celia - valida reportes)
cliente.condor@brujula.test     (Camila - cliente)
cliente.ceiba@brujula.test      (Ciro - cliente)
```

---

## 🌐 Puertos Esperados

| Servicio | Puerto | URL |
|----------|--------|-----|
| PostgreSQL | 5433 | localhost:5433 |
| Express API | 3001 | http://localhost:3001/api |
| React App | 5173 | http://localhost:5173 |

---

## 🛠️ Troubleshooting Rápido

### "npm: comando no encontrado"
→ Cierra PowerShell y abre una nueva. Node.js necesita Path actualizado.

### "Docker no está conectado"
→ Abre Docker Desktop manualmente y espera a que diga "Docker is running"

### "Cannot find module 'pg'"
→ Ejecuta `npm install` nuevamente

### "Database is already up to date"
→ Perfecto, significa que las migraciones ya corrieron

### "API responde 404 en /health"
→ Es normal, está en `/api/health` no en raíz

---

## 📖 Archivos Esenciales del Proyecto

```
docs/api.md                                    ← LEER PRIMERO MÓDULO 2
server/src/db/migrations/001_initial_schema   ← Estructura completa
server/src/index.js                           ← Punto de entrada API
server/src/middleware/auth.js                 ← JWT y validación
web/src/lib/api.js                            ← Función para llamar API
AGENTS.md                                     ← Reglas del equipo
README.md                                     ← Setup básico
```

---

## 💾 Query Helper

Archivo `query_db.js` permite hacer queries SQL directas:

```bash
# Listar usuarios
node query_db.js

# Luego puedes editar para hacer tus propias queries
```

---

## 🎓 Estilo de Enseñanza

Este aprendizaje sigue:
- ✅ Ejemplos visuales
- ✅ Datos reales del sistema
- ✅ Explicaciones paso a paso
- ✅ Mucho detalle (es modo principiante)
- ✅ Conexiones entre conceptos
- ✅ Práctica al final de cada módulo

---

## 📞 Contacto / Dudas

Si algo no está claro o hay dudas:
1. Leer `docs/api.md` - tiene TODO documentado
2. Revisar ejemplos en `server/src/routes/`
3. Ver datos reales con `query_db.js`
4. Consultar con el mentor/equipo

---

## 🎉 Próximas Acciones

**Inmediato:**
1. ✅ Leer `LEARNING_PROGRESS.md`
2. ✅ Leer `LEARNING_CONTEXT.json`
3. ✅ Levantar proyecto en nueva máquina

**Dentro de 1 hora:**
1. ⏳ Leer `docs/api.md` completo (esencial para módulo 2)
2. ⏳ Experimentar: login con admin, técnico, cliente
3. ⏳ Ver qué ve cada rol en la app

**Para próxima sesión:**
1. ⏳ Módulo 2: API (Express)
2. ⏳ Seguir un endpoint real
3. ⏳ Entender JWT

---

**Generado:** 2026-11-17  
**Versión:** 1.0  
**Próxima actualización:** Después de Módulo 2
