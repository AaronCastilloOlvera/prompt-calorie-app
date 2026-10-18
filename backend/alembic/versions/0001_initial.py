"""initial: food_entries, exercise_sets, body_weight

Revision ID: 0001
Revises:
Create Date: 2026-10-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _num(precision: int = 10) -> sa.Numeric:
    return sa.Numeric(precision, 2)


def _created_at() -> sa.Column:
    return sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)


def upgrade() -> None:
    op.create_table(
        "food_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("portion_description", sa.Text(), nullable=True),
        sa.Column("grams", _num(), nullable=False),
        sa.Column("kcal", _num(), nullable=False),
        sa.Column("protein_g", _num(), nullable=False),
        sa.Column("carbs_g", _num(), nullable=False),
        sa.Column("fat_g", _num(), nullable=False),
        sa.Column("raw_input", sa.Text(), nullable=True),
        _created_at(),
        sa.CheckConstraint(
            "meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')", name="meal_type_valid"
        ),
    )
    op.create_index("ix_food_entries_local_date", "food_entries", ["local_date"])

    op.create_table(
        "exercise_sets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("exercise_name", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=True),
        sa.Column("weight_kg", _num(), nullable=True),
        sa.Column("duration_s", sa.Integer(), nullable=True),
        sa.Column("distance_m", _num(), nullable=True),
        sa.Column("raw_input", sa.Text(), nullable=True),
        _created_at(),
        sa.CheckConstraint("category IN ('strength', 'run', 'cardio_other')", name="category_valid"),
    )
    op.create_index("ix_exercise_sets_local_date", "exercise_sets", ["local_date"])
    op.create_index("ix_exercise_sets_exercise_name", "exercise_sets", ["exercise_name"])

    op.create_table(
        "body_weight",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("local_date", sa.Date(), nullable=False, unique=True),
        sa.Column("weight_kg", _num(6), nullable=False),
        _created_at(),
    )


def downgrade() -> None:
    op.drop_table("body_weight")
    op.drop_index("ix_exercise_sets_exercise_name", table_name="exercise_sets")
    op.drop_index("ix_exercise_sets_local_date", table_name="exercise_sets")
    op.drop_table("exercise_sets")
    op.drop_index("ix_food_entries_local_date", table_name="food_entries")
    op.drop_table("food_entries")
