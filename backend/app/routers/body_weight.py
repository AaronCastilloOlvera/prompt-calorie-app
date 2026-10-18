from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import today_local
from app.db import get_db
from app.models import BodyWeight
from app.schemas import BodyWeightIn, BodyWeightOut

router = APIRouter(prefix="/body-weight", tags=["weight"])


@router.post("", response_model=BodyWeightOut)
def upsert_body_weight(body: BodyWeightIn, db: Session = Depends(get_db)) -> BodyWeight:
    """Un solo peso por día: si ya existe para esa fecha, se actualiza."""
    local_date = body.local_date or today_local()
    stmt = insert(BodyWeight).values(local_date=local_date, weight_kg=body.weight_kg)
    stmt = stmt.on_conflict_do_update(
        index_elements=[BodyWeight.local_date], set_={"weight_kg": stmt.excluded.weight_kg}
    ).returning(BodyWeight)
    row = db.scalars(stmt).one()
    db.commit()
    return row


@router.get("", response_model=list[BodyWeightOut])
def list_body_weight(
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: date | None = None,
    db: Session = Depends(get_db),
) -> list[BodyWeight]:
    to = to or today_local()
    from_ = from_ or to - timedelta(days=90)
    return list(
        db.scalars(
            select(BodyWeight)
            .where(BodyWeight.local_date.between(from_, to))
            .order_by(BodyWeight.local_date)
        )
    )
