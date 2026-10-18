from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import MEAL_TYPES, BodyWeight, ExerciseSet, FoodEntry
from app.routers.goals import current_goals
from app.schemas import DayOut, ExerciseGroup, ExerciseSetOut, FoodEntryOut, Macros, MealGroup

router = APIRouter(prefix="/days", tags=["days"])


def _sum_macros(entries: list[FoodEntry]) -> Macros:
    return Macros(
        kcal=round(sum(e.kcal for e in entries), 1),
        protein_g=round(sum(e.protein_g for e in entries), 1),
        carbs_g=round(sum(e.carbs_g for e in entries), 1),
        fat_g=round(sum(e.fat_g for e in entries), 1),
    )


@router.get("/{day}", response_model=DayOut)
def get_day(day: date, db: Session = Depends(get_db)) -> DayOut:
    foods = db.scalars(
        select(FoodEntry).where(FoodEntry.local_date == day).order_by(FoodEntry.created_at, FoodEntry.id)
    ).all()
    meals = []
    for meal_type in MEAL_TYPES:
        items = [f for f in foods if f.meal_type == meal_type]
        if items:
            meals.append(MealGroup(
                meal_type=meal_type,
                items=[FoodEntryOut.model_validate(f) for f in items],
                totals=_sum_macros(items),
            ))

    sets = db.scalars(
        select(ExerciseSet)
        .where(ExerciseSet.local_date == day)
        .order_by(ExerciseSet.created_at, ExerciseSet.set_number)
    ).all()
    by_name: dict[str, list[ExerciseSet]] = {}
    for s in sets:
        by_name.setdefault(s.exercise_name, []).append(s)
    exercises = [
        ExerciseGroup(
            exercise_name=name,
            category=group[0].category,
            sets=[ExerciseSetOut.model_validate(s) for s in group],
        )
        for name, group in by_name.items()
    ]

    weight = db.scalar(select(BodyWeight.weight_kg).where(BodyWeight.local_date == day))

    return DayOut(
        date=day,
        meals=meals,
        exercises=exercises,
        weight_kg=weight,
        goals=current_goals(),
        totals=_sum_macros(list(foods)),
    )
