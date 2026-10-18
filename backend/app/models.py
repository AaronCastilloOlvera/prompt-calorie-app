from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

MEAL_TYPES = ("breakfast", "lunch", "dinner", "snack")
EXERCISE_CATEGORIES = ("strength", "run", "cardio_other")


def _in_check(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _num(precision: int = 10) -> Numeric:
    # asdecimal=False → floats en Python, para que el JSON tenga números y no strings.
    return Numeric(precision, 2, asdecimal=False)


class FoodEntry(Base):
    __tablename__ = "food_entries"
    __table_args__ = (CheckConstraint(_in_check("meal_type", MEAL_TYPES), name="meal_type_valid"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    local_date: Mapped[date] = mapped_column(Date, index=True)
    meal_type: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    portion_description: Mapped[str | None] = mapped_column(Text)
    grams: Mapped[float] = mapped_column(_num())
    kcal: Mapped[float] = mapped_column(_num())
    protein_g: Mapped[float] = mapped_column(_num())
    carbs_g: Mapped[float] = mapped_column(_num())
    fat_g: Mapped[float] = mapped_column(_num())
    raw_input: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExerciseSet(Base):
    __tablename__ = "exercise_sets"
    __table_args__ = (
        CheckConstraint(_in_check("category", EXERCISE_CATEGORIES), name="category_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    local_date: Mapped[date] = mapped_column(Date, index=True)
    exercise_name: Mapped[str] = mapped_column(Text, index=True)
    category: Mapped[str] = mapped_column(Text)
    set_number: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(_num())
    duration_s: Mapped[int | None] = mapped_column(Integer)
    distance_m: Mapped[float | None] = mapped_column(_num())
    raw_input: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BodyWeight(Base):
    __tablename__ = "body_weight"

    id: Mapped[int] = mapped_column(primary_key=True)
    local_date: Mapped[date] = mapped_column(Date, unique=True)
    weight_kg: Mapped[float] = mapped_column(_num(6))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
