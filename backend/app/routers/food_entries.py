from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.config import today_local
from app.db import get_db
from app.models import FoodEntry
from app.schemas import FoodEntriesCreate, FoodEntryOut, FoodEntryUpdate

router = APIRouter(prefix="/food-entries", tags=["food"])


@router.post("", response_model=list[FoodEntryOut], status_code=201)
def create_food_entries(body: FoodEntriesCreate, db: Session = Depends(get_db)) -> list[FoodEntry]:
    local_date = body.local_date or today_local()
    entries = [
        FoodEntry(
            local_date=local_date,
            meal_type=body.meal_type,
            raw_input=body.raw_input,
            **item.model_dump(),
        )
        for item in body.items
    ]
    db.add_all(entries)
    db.commit()
    return entries


def _get_or_404(db: Session, entry_id: int) -> FoodEntry:
    entry = db.get(FoodEntry, entry_id)
    if entry is None:
        raise HTTPException(404, "Registro no encontrado.")
    return entry


@router.patch("/{entry_id}", response_model=FoodEntryOut)
def update_food_entry(
    entry_id: int, body: FoodEntryUpdate, db: Session = Depends(get_db)
) -> FoodEntry:
    entry = _get_or_404(db, entry_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_food_entry(entry_id: int, db: Session = Depends(get_db)) -> Response:
    db.delete(_get_or_404(db, entry_id))
    db.commit()
    return Response(status_code=204)
