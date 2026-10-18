from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import BodyWeight, ExerciseSet, FoodEntry
from app.schemas import WeekDayOut

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/week", response_model=list[WeekDayOut])
def week_summary(start: date, db: Session = Depends(get_db)) -> list[WeekDayOut]:
    """7 días a partir de `start`. Tres queries agrupadas por local_date, no una por día."""
    end = start + timedelta(days=6)

    food = {
        row.local_date: row
        for row in db.execute(
            select(
                FoodEntry.local_date,
                func.sum(FoodEntry.kcal).label("kcal"),
                func.sum(FoodEntry.protein_g).label("protein_g"),
                func.sum(FoodEntry.carbs_g).label("carbs_g"),
                func.sum(FoodEntry.fat_g).label("fat_g"),
            )
            .where(FoodEntry.local_date.between(start, end))
            .group_by(FoodEntry.local_date)
        )
    }

    is_run = ExerciseSet.category == "run"
    exercise = {
        row.local_date: row
        for row in db.execute(
            select(
                ExerciseSet.local_date,
                func.bool_or(is_run).label("ran"),
                func.coalesce(func.sum(ExerciseSet.distance_m).filter(is_run), 0).label("run_distance_m"),
            )
            .where(ExerciseSet.local_date.between(start, end))
            .group_by(ExerciseSet.local_date)
        )
    }

    weights = dict(
        db.execute(
            select(BodyWeight.local_date, BodyWeight.weight_kg).where(BodyWeight.local_date.between(start, end))
        ).all()
    )

    kcal_target = get_settings().kcal_target
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        f = food.get(d)
        e = exercise.get(d)
        days.append(
            WeekDayOut(
                date=d,
                kcal_eaten=round(f.kcal, 1) if f else 0,
                kcal_target=kcal_target,
                protein_g=round(f.protein_g, 1) if f else 0,
                carbs_g=round(f.carbs_g, 1) if f else 0,
                fat_g=round(f.fat_g, 1) if f else 0,
                worked_out=e is not None,
                ran=bool(e and e.ran),
                run_distance_m=float(e.run_distance_m) if e else 0,
                weight_kg=weights.get(d),
            )
        )
    return days
