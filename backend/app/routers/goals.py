from fastapi import APIRouter

from app.config import get_settings
from app.schemas import Macros

router = APIRouter(prefix="/goals", tags=["goals"])


def current_goals() -> Macros:
    s = get_settings()
    return Macros(
        kcal=s.kcal_target,
        protein_g=s.protein_target_g,
        carbs_g=s.carbs_target_g,
        fat_g=s.fat_target_g,
    )


@router.get("", response_model=Macros)
def get_goals() -> Macros:
    return current_goals()
