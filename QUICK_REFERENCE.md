# 🚀 Quick Reference - Brújula Full Stack

## 📊 Tablas de la BD

```
companies (2) → users (8) → activities (9)
                  ↓            ↓
                vehicles (6)   photos (5+)
                              ↓
                        activity_events (10+)
```

## 👥 Usuarios de Demo

| Email | Rol | Acceso |
|-------|-----|--------|
| admin@brujula.test | admin | Ve TODO |
| coordinador@brujula.test | coordinator | Asigna y valida |
| tecnico1@brujula.test | technician | Ejecuta servicios |
| cec@brujula.test | cec | Valida reportes |
| cliente.condor@brujula.test | client | Ve solo empresas suyas |

Contraseña: **brujula123**

## 🔄 Estados de Activity

```
requested → assigned → on_site → report_ready → validated → delivered
                                         ↑
                                      (returned)
```

## 🌐 Puertos

- PostgreSQL: **5433**
- API (Express): **3001**
- React: **5173**

## 📚 Archivos Claves

| Archivo | Para |
|---------|------|
| `docs/api.md` | Endpoints de la API |
| `server/src/index.js` | Entrada del backend |
| `web/src/lib/api.js` | Llamadas a API (USAR SIEMPRE) |
| `LEARNING_PROGRESS.md` | Tu progreso |
| `LEARNING_CONTEXT.json` | Contexto en JSON |

## 🎯 Próximos Módulos

1. ✅ Módulo 1: Base de Datos (HECHO)
2. ⏳ Módulo 2: API (1-1.5 hrs)
3. ⏳ Módulo 3: React (1-1.5 hrs)
4. ⏳ Módulo 4: Flujo Completo (30 mins)
5. ⏳ Módulo 5: Feature Nueva (1-2 hrs)

## 🛠️ Comandos Útiles

```bash
npm install                  # Instalar todo
docker compose up -d         # PostgreSQL
npm run db:migrate          # Crear tablas
npm run db:seed             # Cargar datos demo
npm run dev:server          # API (terminal dedicada)
npm run dev:web             # React (terminal dedicada)
npm test                    # Tests
```

---

**Continúa en:** LEARNING_PROGRESS.md
