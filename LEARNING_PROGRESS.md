# 📚 Brújula - Contexto de Aprendizaje Full Stack

**Estudiante:** Principiante en programación  
**Modo:** Estudio detallado (cada proceso explicado)  
**Fecha de inicio:** 2026-11-12  
**Última actualización:** 2026-11-17

---

## ✅ MÓDULO 1: BASE DE DATOS (COMPLETADO)

### Duración: ~45 minutos
### Temas cubiertos:
- ✅ ¿Qué es una Base de Datos?
- ✅ ¿Qué es SQL?
- ✅ Estructura de las 6 tablas principales
- ✅ Enums (valores permitidos)
- ✅ Foreign Keys (relaciones entre tablas)
- ✅ Ciclo de vida de una actividad (7 estados)
- ✅ Permisos y visibilidad de datos por rol
- ✅ Datos reales del sistema consultados

### Conceptos Clave Aprendidos:
```
Tabla       = Hoja de Excel con estructura
Columna     = Campo (id, name, email, etc)
Fila        = Un registro
ID          = Número único (Primary Key)
Foreign Key = Conexión a otra tabla
ENUM        = Valores permitidos fijos
Audit Log   = Registro inmutable de cambios
```

### Las 6 Tablas:

#### 1. **companies** (2 registros)
Empresas clientes del sistema
```
Transportes Cóndor
Distribuidora La Ceiba
```

#### 2. **users** (8 registros)
```
1  | Ana Admin           | admin@brujula.test         | admin
2  | Carlos Coordinador  | coordinador@brujula.test   | coordinator
3  | Tomás Técnico       | tecnico1@brujula.test      | technician
4  | Teresa Técnica      | tecnico2@brujula.test      | technician
5  | Tito Técnico        | tecnico3@brujula.test      | technician
6  | Celia CEC           | cec@brujula.test           | cec
7  | Camila Cóndor       | cliente.condor@brujula.test| client
8  | Ciro Ceiba          | cliente.ceiba@brujula.test | client
```

#### 3. **vehicles** (6 registros)
Vehículos donde se instalan GPS/cámaras/sensores
```
DEMO-101  | Toyota      | Hilux
DEMO-102  | Isuzu       | NPR
DEMO-201  | Hino        | Serie 300
...
```

#### 4. **activities** (9 registros)
Servicios técnicos en diferentes estados
```
#1  | inspection     | requested              (sin asignar)
#2  | gps_install    | assigned    (Tomás esperando)
#3  | camera_install | assigned    (Teresa esperando)
#5  | camera_install | on_site     (Teresa en progreso ⏳)
#6  | sensor_install | report_ready (Tito completó ✅)
#7  | maintenance    | validated   (CEC validó)
#8  | gps_install    | delivered   (completada)
#9  | inspection     | delivered   (completada)
```

#### 5. **photos** (5+ registros)
Fotos de evidencia. Categorías: plate, odometer, issue_found, issue_fixed, other  
Requisito: 4 fotos obligatorias para marcar "Terminé"

#### 6. **activity_events** (10+ registros)
Registro inmutable de cambios. Eventos: created, assigned, arrived, finished, etc.  
**NUNCA se edita ni se borra** - Es la evidencia legal.

### Ciclo de Vida de una Activity:

```
requested (solicitada)
    ↓
assigned (asignada a técnico)
    ↓
on_site (técnico en el sitio)
    ↓
report_ready (terminada con informe + 4 fotos)
    ↓
validated (validada por CEC)
    ↓
delivered (entregada al cliente)

Ruta alternativa: report_ready → returned → report_ready (si CEC pide correcciones)
```

### Permisos de Lectura:
```
admin       → Ve TODO
coordinator → Ve todas
cec         → Ve todas
technician  → Ve solo asignadas, ejecutadas, e historial de sus vehículos
client      → Ve solo empresas suyas, informe desde report_ready
```

### Permisos de Escritura:
```
admin       → Puede todo
coordinator → Crear, asignar, validar entrega
cec         → Validar reportes, devolver para correcciones
technician  → Marcar llegada, terminar, corregir
client      → Solo solicitar (no asignar)
```

---

## ⏳ MÓDULO 2: LA API (Express + Node.js) - PRÓXIMO

### Duración estimada: 1-1.5 horas

### Temas a cubrir:
- [ ] ¿Qué es Express?
- [ ] ¿Qué es un endpoint (ruta HTTP)?
- [ ] Métodos HTTP: GET, POST, PUT, DELETE
- [ ] Cómo funciona POST /auth/login (ejemplo real)
- [ ] JWT - Tokens de autenticación
- [ ] Consultas SQL desde Node.js (pg library)
- [ ] Validación de permisos en la API
- [ ] Respuestas en JSON
- [ ] Manejo de errores consistente

### Archivos clave a leer:
```
server/src/index.js              → Punto de entrada
server/src/routes/               → Endpoints
server/src/middleware/auth.js    → Autenticación
server/src/db/client.js          → Conexión a BD
docs/api.md                      → Contrato de endpoints (ESENCIAL)
```

### Primer ejemplo: POST /auth/login
Seguiremos un login desde React hasta PostgreSQL y vuelta.

---

## ⏳ MÓDULO 3: FRONTEND (React) - DESPUÉS

### Duración estimada: 1-1.5 horas
### Temas:
- [ ] Componentes JSX
- [ ] Estados (useState, useEffect)
- [ ] Llamadas a API (fetch)
- [ ] Traducción de valores
- [ ] Renderizado condicional

---

## ⏳ MÓDULO 4: FLUJO COMPLETO - INTEGRACIÓN

### Duración estimada: 30 minutos
### Objetivo:
Seguir UN click desde el navegador hasta la BD y de vuelta

---

## ⏳ MÓDULO 5: FEATURE NUEVA - PRÁCTICA

### Duración estimada: 1-2 horas
### Objetivo:
Crear una funcionalidad completa de punta a punta

---

## 🌐 Ambiente Local - Estado Actual

### Servicios Corriendo:
✅ PostgreSQL en Docker (localhost:5433)
✅ Express API (localhost:3001)
✅ React App (localhost:5173)

### Credenciales de Prueba:
```
Admin:       admin@brujula.test / brujula123
Técnico:     tecnico1@brujula.test / brujula123
Coordinador: coordinador@brujula.test / brujula123
```

---

## 📂 Estructura del Proyecto

```
brujula-app/
├── server/                      Backend
│   ├── src/
│   │   ├── index.js            Punto de entrada
│   │   ├── routes/             Endpoints
│   │   ├── middleware/
│   │   │   └── auth.js         Autenticación JWT
│   │   └── db/
│   │       ├── client.js       Conexión a PostgreSQL
│   │       ├── migrations/     Scripts SQL
│   │       └── seed.js         Datos de demo
│   └── .env                    Configuración
│
├── web/                        Frontend
│   ├── src/
│   │   ├── components/         Componentes React
│   │   ├── lib/
│   │   │   └── api.js         ⚠️ SIEMPRE usar esto para llamar API
│   │   └── index.css          Tailwind + colores
│   └── package.json
│
├── docs/
│   └── api.md                 ⭐ CONTRATO DE LA API (LEER SIEMPRE)
│
├── README.md                   Instrucciones de setup
├── AGENTS.md                   Reglas del equipo
└── LEARNING_CONTEXT.json      ← ESTE ARCHIVO (transferencia de contexto)
```

---

## 🔧 Comandos Importantes

```bash
# Instalar dependencias
npm install

# Levantar PostgreSQL
docker compose up -d

# Crear tablas
npm run db:migrate

# Cargar datos de demo
npm run db:seed

# API (en terminal dedicada)
npm run dev:server   # localhost:3001

# React (en terminal dedicada)
npm run dev:web      # localhost:5173

# Tests
npm test
```

---

## ⚙️ Convenciones del Proyecto

### Lenguaje:
- **Código:** Inglés (variables, funciones, archivos)
- **Usuario:** Español (textos de pantalla, mensajes de error)
- **Commits:** `feat: ...`, `fix: ...`, `docs: ...`

### Base de Datos:
- Nombres: snake_case (company_id, created_at)
- Cambios de esquema: nuevas migraciones en `server/src/db/migrations/`
- Nunca editar migraciones existentes

### Frontend:
- Arquitectura: mobile-first, una columna, botones grandes
- Componentes: shadcn/ui + Tailwind 4
- Colores: tokens del tema (bg-primary, text-muted-foreground, etc)
- **SIEMPRE usar `web/src/lib/api.js` para llamadas, NUNCA fetch directo**

---

## 🔐 Reglas No Negociables

1. **Permisos en servidor** - No confiar en el frontend
2. **Un cliente NUNCA ve datos de otro** - Filtrar por company_id siempre
3. **Lo ajeno responde 404, no 403** - No revelar que existe
4. **Eventos inmutables** - activity_events nunca se edita ni borra
5. **Datos inventados** - Nada de placas, fotos ni nombres reales

---

## 📚 Archivos Esenciales a Leer

| Archivo | Prioritario | Por qué |
|---------|-----------|--------|
| `docs/api.md` | ⭐⭐⭐ | Contrato de endpoints, rutas, campos, estados |
| `README.md` | ⭐⭐ | Setup, usuarios de demo, scripts |
| `AGENTS.md` | ⭐⭐ | Reglas del equipo, convenciones |
| `server/src/db/migrations/001_initial_schema.sql` | ⭐⭐ | Estructura completa de BD |
| `server/src/index.js` | ⭐ | Punto de entrada del backend |

---

## 💡 Próximos Pasos

1. ✅ Modulo 1 completado (Base de datos)
2. ⏳ Leer `docs/api.md` completo
3. ⏳ Modulo 2: API (Express)
4. ⏳ Modulo 3: Frontend (React)
5. ⏳ Modulo 4: Flujo completo
6. ⏳ Modulo 5: Feature nueva (práctica)

---

## 🎓 Recomendaciones para Continuar

- **Escribe en `query_db.js`:** Haz tus propias queries SQL para explorar datos
- **Lee primero `docs/api.md`:** Antes de cada módulo nuevo
- **Experimenta:** Haz login con diferentes usuarios y observa qué ven
- **Pregunta:** Si algo no es claro, siempre pregunta (es modo aprendizaje)
- **Toma notas:** Visual learning is key

---

## 📋 Estado del Aprendizaje

**Progreso:** 20% (Módulo 1 de 5)  
**Próxima meta:** Entender cómo Express accede a PostgreSQL  
**Tiempo total estimado:** 4-5 horas para completar todo

---

**Archivo generado:** 2026-11-17  
**Para usar en otra máquina:** Lleva este archivo + el JSON hermano (LEARNING_CONTEXT.json)
