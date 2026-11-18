# 🎓 START HERE - Brújula Full Stack Learning

**Tu transferencia de contexto está completa** ✅

---

## 📦 Qué se creó para ti

Estos 4 archivos contienen TODO el contexto de lo que aprendiste:

| Archivo | Tamaño | Contenido | Leer cuando |
|---------|--------|----------|-------------|
| **QUICK_REFERENCE.md** | 2 KB | Tabla rápida de usuarios, puertos, comandos | Necesites algo rápido |
| **LEARNING_PROGRESS.md** | 9 KB | Resumen de módulo 1, plan completo, próximos pasos | Empieces una nueva sesión |
| **LEARNING_CONTEXT.json** | 16 KB | Contexto estructurado en JSON para importar | Otra máquina, equipo |
| **TRANSFER_CHECKLIST.md** | 6 KB | Instrucciones de setup en nueva máquina | Cambies de PC |

---

## 🚀 En otra máquina: Setup en 5 minutos

```bash
# 1. Clona el repo
git clone <url>
cd brujula-app

# 2. Lee contexto (1 min)
cat LEARNING_PROGRESS.md

# 3. Instala (2 min)
npm install
cp server/.env.example server/.env
# Genera JWT: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 4. Levanta BD
docker compose up -d
npm run db:migrate
npm run db:seed

# 5. Levanta servicios (terminal dedicada a cada una)
npm run dev:server   # Terminal 1
npm run dev:web      # Terminal 2

# 6. Verifica
# Abre http://localhost:5173 y login con admin@brujula.test / brujula123
```

---

## 📚 Qué Aprendiste (Módulo 1 ✅)

✅ Qué es una Base de Datos  
✅ 6 Tablas: companies, users, vehicles, activities, photos, activity_events  
✅ 7 Estados de activity: requested → assigned → on_site → report_ready → validated → delivered  
✅ Permisos por rol (admin ve todo, técnico ve solo asignadas)  
✅ Datos reales: 8 usuarios, 9 actividades, 6 vehículos  

---

## ⏳ Próximo (Módulo 2: API)

**Qué aprenderás:**
- Cómo Express recibe requests (ej: POST /auth/login)
- JWT tokens de autenticación
- Consultas SQL desde Node.js
- Validación de permisos en la API
- Respuestas en JSON y manejo de errores

**Archivo clave:** `docs/api.md` ← **LEER PRIMERO**

**Tiempo:** 1-1.5 horas

---

## 🎯 El Plan Completo

```
Módulo 1 ✅     Módulo 2 ⏳     Módulo 3 ⏳     Módulo 4 ⏳     Módulo 5 ⏳
BD (45 min)     API (1.5h)      React (1.5h)   Flujo (30m)   Feature (2h)

                                                              Total: 4-5 hrs
```

---

## 🔑 Credenciales Demo

Todos con password: **brujula123**

```
admin@brujula.test              (ve TODO)
coordinador@brujula.test        (asigna y valida)
tecnico1@brujula.test           (ejecuta)
cec@brujula.test                (valida reportes)
cliente.condor@brujula.test     (ve solo empresas suyas)
```

---

## 🌐 Puertos

```
PostgreSQL  → localhost:5433
API         → localhost:3001
React       → localhost:5173
```

---

## 📂 Archivos Esenciales del Proyecto

```
docs/api.md                    ← LEER PRIMERO MÓDULO 2
server/src/index.js            ← Entrada del backend
server/src/middleware/auth.js  ← Autenticación JWT
web/src/lib/api.js             ← SIEMPRE usar para llamar API
AGENTS.md                      ← Reglas del equipo
README.md                      ← Setup básico
```

---

## ⚡ Comandos Quick

```bash
npm install                    # Instalar
docker compose up -d           # PostgreSQL
npm run db:migrate            # Tablas
npm run db:seed               # Datos demo
npm run dev:server            # API
npm run dev:web               # React
npm test                      # Tests
```

---

## 🎓 Recomendaciones

1. **Leer primero:** `LEARNING_PROGRESS.md` (te da panorama completo)
2. **En nueva máquina:** Usar `TRANSFER_CHECKLIST.md` (pasos de setup)
3. **Rápida referencia:** `QUICK_REFERENCE.md` (usuarios, puertos, etc)
4. **Importar contexto:** Pasar `LEARNING_CONTEXT.json` a otro dev
5. **Próxima sesión:** Leer `docs/api.md` antes de módulo 2

---

## 🔄 Cómo Continuar

### Ahora (misma sesión):
- [ ] Leer este archivo (lo estás haciendo ✅)
- [ ] Leer `QUICK_REFERENCE.md` para overview
- [ ] Experimentar: login con usuarios diferentes

### Próxima sesión:
- [ ] Leer `docs/api.md` completo
- [ ] Iniciar Módulo 2 (API con Express)
- [ ] Seguir un endpoint real de punta a punta

### Después:
- [ ] Módulo 3: React
- [ ] Módulo 4: Flujo completo
- [ ] Módulo 5: Tu primera feature

---

## 💾 En otra máquina

**Lleva estos 4 archivos:**
```
QUICK_REFERENCE.md
LEARNING_PROGRESS.md
LEARNING_CONTEXT.json
TRANSFER_CHECKLIST.md
```

Colocalos en la raíz del proyecto clonado. ¡Listo!

---

## ✅ Estado Actual

| Componente | Estado |
|-----------|--------|
| Base de datos | ✅ Levantada |
| API | ✅ Corriendo |
| React | ✅ Funcional |
| Datos demo | ✅ Cargados |
| Aprendizaje | ✅ Módulo 1 completado |
| Próximo | ⏳ Módulo 2: API |

---

**¿Listo para continuar?** Ve a → `LEARNING_PROGRESS.md`

**¿En otra máquina?** Ve a → `TRANSFER_CHECKLIST.md`

**¿Referencia rápida?** Ve a → `QUICK_REFERENCE.md`

---

Generado: 2026-11-17  
Sesión: Full Stack Brújula - Modo Aprendizaje
