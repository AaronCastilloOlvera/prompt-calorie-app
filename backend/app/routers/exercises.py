from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ExerciseSet
from app.schemas import (
    ExerciseOut,
    ExerciseProgressOut,
    ExerciseSessionOut,
    ExerciseSetOut,
    ExerciseWeekOut,
)

router = APIRouter(prefix="/exercises", tags=["exercise"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(db: Session = Depends(get_db)) -> list[ExerciseOut]:
    rows = db.execute(
        select(ExerciseSet.exercise_name, ExerciseSet.category).distinct().order_by(ExerciseSet.exercise_name)
    ).all()
    return [ExerciseOut(exercise_name=n, category=c) for n, c in rows]


@router.get("/progress", response_model=ExerciseProgressOut)
def exercise_progress(name: str, db: Session = Depends(get_db)) -> ExerciseProgressOut:
    sets = db.scalars(
        select(ExerciseSet)
        .where(ExerciseSet.exercise_name == name)
        .order_by(ExerciseSet.local_date.desc(), ExerciseSet.set_number)
    ).all()
    if not sets:
        raise HTTPException(404, "Ejercicio no encontrado.")

    # Semanas de lunes a domingo (date_trunc('week') en Postgres empieza en lunes).
    week = cast(func.date_trunc("week", ExerciseSet.local_date), Date)
    weeks = db.execute(
        select(
            week.label("week_start"),
            func.max(ExerciseSet.weight_kg).label("max_weight_kg"),
            func.coalesce(func.sum(ExerciseSet.reps * ExerciseSet.weight_kg), 0).label("volume_kg"),
            func.coalesce(func.sum(ExerciseSet.distance_m), 0).label("distance_m"),
        )
        .where(ExerciseSet.exercise_name == name)
        .group_by(week)
        .order_by(week)
    ).all()

    sessions: dict = {}
    for s in sets:
        sessions.setdefault(s.local_date, []).append(ExerciseSetOut.model_validate(s))

    return ExerciseProgressOut(
        exercise_name=name,
        category=sets[0].category,
        weeks=[
            ExerciseWeekOut(
                week_start=w.week_start,
                max_weight_kg=w.max_weight_kg,
                volume_kg=round(float(w.volume_kg), 1),
                distance_m=float(w.distance_m),
            )
            for w in weeks
        ],
        sessions=[ExerciseSessionOut(date=d, sets=s) for d, s in sessions.items()],
    )
