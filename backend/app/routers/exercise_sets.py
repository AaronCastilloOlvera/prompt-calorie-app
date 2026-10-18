from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import today_local
from app.db import get_db
from app.models import ExerciseSet
from app.schemas import ExerciseSetOut, ExerciseSetsCreate, ExerciseSetUpdate

router = APIRouter(prefix="/exercise-sets", tags=["exercise"])


@router.post("", response_model=list[ExerciseSetOut], status_code=201)
def create_exercise_sets(body: ExerciseSetsCreate, db: Session = Depends(get_db)) -> list[ExerciseSet]:
    local_date = body.local_date or today_local()
    rows = []
    for exercise in body.exercises:
        # Si ese día ya había series de este ejercicio, se sigue la numeración.
        last = db.scalar(
            select(func.max(ExerciseSet.set_number)).where(
                ExerciseSet.local_date == local_date, ExerciseSet.exercise_name == exercise.exercise_name
            )
        ) or 0
        rows += [
            ExerciseSet(
                local_date=local_date,
                exercise_name=exercise.exercise_name,
                category=exercise.category,
                set_number=last + i,
                raw_input=body.raw_input,
                **s.model_dump(),
            )
            for i, s in enumerate(exercise.sets, start=1)
        ]
    db.add_all(rows)
    db.commit()
    return rows


def _get_or_404(db: Session, set_id: int) -> ExerciseSet:
    row = db.get(ExerciseSet, set_id)
    if row is None:
        raise HTTPException(404, "Serie no encontrada.")
    return row


@router.patch("/{set_id}", response_model=ExerciseSetOut)
def update_exercise_set(set_id: int, body: ExerciseSetUpdate, db: Session = Depends(get_db)) -> ExerciseSet:
    row = _get_or_404(db, set_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    return row


@router.delete("/{set_id}", status_code=204)
def delete_exercise_set(set_id: int, db: Session = Depends(get_db)) -> Response:
    db.delete(_get_or_404(db, set_id))
    db.commit()
    return Response(status_code=204)
