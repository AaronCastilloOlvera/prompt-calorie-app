# App de calorías, ejercicio y peso

App personal: registro de comida, entrenamientos y peso en lenguaje natural, parseado con la API de Claude.

- `backend/` — FastAPI + SQLAlchemy + Alembic + PostgreSQL
- `frontend/` — React + Vite + TypeScript + Tailwind

## Desarrollo local

Requisitos: Docker, Python 3.12+, Node 20+.

```bash
# 1. Postgres
docker compose up -d

# 2. Backend (http://localhost:8000)
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; en macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # pon tu ANTHROPIC_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# 3. Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

En local el frontend llama a `/api/...` y Vite lo redirige al backend (proxy en `vite.config.ts`), así que no hay CORS.

## Deploy

Pendiente (Fase 7).
