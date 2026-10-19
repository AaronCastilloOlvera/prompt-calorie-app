# App de calorías, ejercicio y peso

App personal (un solo usuario) para registrar comida, entrenamientos y peso corporal. La captura es en
lenguaje natural: escribes lo que comiste o entrenaste (o subes una foto de la comida), Claude lo
convierte a datos estructurados, lo revisas/editas y se guarda.

- `backend/` — Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, SDK `anthropic`
- `frontend/` — React + Vite + TypeScript, TanStack Query, Tailwind, Recharts

## Vistas

| Vista | Qué hace |
|---|---|
| **Hoy** | Registrar comida (texto o foto) o ejercicio con Claude, peso del día y resumen del día. ◀ ▶ para otros días. |
| **Semana** | 7 días con kcal vs meta (verde ±10 %, amarillo ±20 %, rojo fuera), entrenos, km corridos y peso. |
| **Peso** | Gráfica del peso diario + promedio móvil de 7 días. |
| **Ejercicios** | Progreso por ejercicio (peso máximo o km por semana) e historial. |

## Desarrollo local

Requisitos: Python 3.12+, Node 20+ y una base de datos Postgres (la de Railway o la de `docker-compose.yml`).

```bash
# 1. Base de datos
#    Opción A: Postgres de Railway → usa su DATABASE_PUBLIC_URL (no la interna) en backend/.env
#    Opción B: Postgres local → docker compose up -d

# 2. Backend (http://localhost:8000)
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; en macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # llena DATABASE_URL y ANTHROPIC_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev                   # agrega -- --host para abrirlo desde el celular en la misma red
```

En local el frontend llama a `/api/...` y Vite lo redirige al backend (proxy en `vite.config.ts`), así que
no hay CORS. La documentación interactiva de la API está en http://localhost:8000/docs.

### Variables de entorno del backend

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://…` | Se normaliza sola a `postgresql+psycopg://` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Solo vive en el backend |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | |
| `APP_TIMEZONE` | `America/Mexico_City` | Define `local_date` cuando no se manda |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS |
| `KCAL_TARGET`, `PROTEIN_TARGET_G`, `CARBS_TARGET_G`, `FAT_TARGET_G` | `2200`, `150`, `220`, `70` | Metas diarias |

## Deploy en Railway

Un proyecto de Railway con 3 servicios: **Postgres**, **backend** y **frontend**, los dos últimos desde
este repositorio de GitHub.

### 0. Antes de empezar

- Sube el repositorio a GitHub (Railway despliega desde ahí).
- Ten a la mano tu `ANTHROPIC_API_KEY`.

### 1. Postgres

En el proyecto: **New → Database → PostgreSQL** (si ya lo creaste, sáltate este paso).

### 2. Backend

1. **New → GitHub Repo →** este repositorio. Renombra el servicio a `backend`.
2. **Settings:**
   - **Root Directory** (sección Source → "Add Root Directory"): `backend`
   - **Custom Start Command:**
     `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Watch Paths:** `/backend/**` (con `/` al inicio: se cuentan desde la raíz del repo)
   - **Healthcheck Path:** `/api/health`
   - **Networking → Generate Domain** (anota la URL, ej. `https://backend-xxxx.up.railway.app`)
3. **Variables:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL=claude-sonnet-5-5
   APP_TIMEZONE=America/Mexico_City
   FRONTEND_ORIGIN=https://<dominio-del-frontend>   # se llena en el paso 4
   KCAL_TARGET=2200
   PROTEIN_TARGET_G=150
   CARBS_TARGET_G=220
   FAT_TARGET_G=70
   ```
   `${{Postgres.DATABASE_URL}}` usa la red interna de Railway; el código cambia el esquema al driver
   `psycopg` automáticamente. La versión de Python se toma de `backend/.python-version` (3.12).

Las migraciones corren solas en cada deploy (`alembic upgrade head` en el start command).

### 3. Frontend

1. **New → GitHub Repo →** el mismo repositorio. Renombra el servicio a `frontend`.
2. **Settings:**
   - **Root Directory** (sección Source → "Add Root Directory"): `frontend`
   - **Watch Paths:** `/frontend/**`
   - Build y start se detectan solos: `npm run build` y `npm start`
     (`serve -s dist`, que regresa `index.html` en cualquier ruta para React Router).
   - **Networking → Generate Domain**
3. **Variables:**
   ```
   VITE_API_URL=https://<dominio-del-backend>
   ```
   Vite la incrusta **al compilar**: si la cambias, haz redeploy del frontend.

### 4. Conectar los dos

En el backend, pon `FRONTEND_ORIGIN` con el dominio del frontend (sin `/` al final) y redeploy.
Prueba `https://<dominio-del-backend>/api/health` → `{"status":"ok","database":true}` y abre el frontend.

### Desarrollo local contra la base de Railway

Usa `DATABASE_PUBLIC_URL` del servicio Postgres en `backend/.env`. Ojo: local y producción comparten
los mismos datos.

## Seguridad

Todavía **no hay login**: cualquiera con la URL puede ver y registrar datos y gastar créditos de la API
de Claude. El código está listo para agregar un login simple (contraseña en variable de entorno + JWT)
como dependencia del router `/api` en `backend/app/main.py`.
