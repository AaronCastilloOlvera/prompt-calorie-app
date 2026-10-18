from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import days, food_entries, goals, health, parse

settings = get_settings()

app = FastAPI(title="Calorie App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Todas las rutas van bajo /api. Para agregar login después, basta con
# APIRouter(prefix="/api", dependencies=[Depends(require_auth)]) en los routers protegidos.
api = APIRouter(prefix="/api")
api.include_router(health.router)
api.include_router(parse.router)
api.include_router(food_entries.router)
api.include_router(days.router)
api.include_router(goals.router)

app.include_router(api)
