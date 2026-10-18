from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MealType = Literal["breakfast", "lunch", "dinner", "snack"]
Category = Literal["strength", "run", "cardio_other"]
Confidence = Literal["high", "medium", "low"]


class HealthOut(BaseModel):
    status: str
    database: bool


class Macros(BaseModel):
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float


# --- Parseo con Claude (no se guarda) ---


class ParsedMealItem(BaseModel):
    name: str
    portion_description: str
    grams: float = Field(ge=0)
    kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    confidence: Confidence


class ParsedMeal(BaseModel):
    meal_type: MealType | None
    items: list[ParsedMealItem]
    notes: str


# --- Food entries ---


class FoodItemIn(BaseModel):
    name: str = Field(min_length=1)
    portion_description: str | None = None
    grams: float = Field(ge=0)
    kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class FoodEntriesCreate(BaseModel):
    # Si no viene, se usa la fecha de hoy en APP_TIMEZONE.
    local_date: date | None = None
    meal_type: MealType
    raw_input: str | None = None
    items: list[FoodItemIn] = Field(min_length=1)


class FoodEntryUpdate(BaseModel):
    local_date: date | None = None
    meal_type: MealType | None = None
    name: str | None = Field(default=None, min_length=1)
    portion_description: str | None = None
    grams: float | None = Field(default=None, ge=0)
    kcal: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)


class FoodEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    local_date: date
    meal_type: MealType
    name: str
    portion_description: str | None
    grams: float
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    raw_input: str | None


# --- Exercise sets (se llenan en la Fase 3) ---


class ExerciseSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    set_number: int
    reps: int | None
    weight_kg: float | None
    duration_s: int | None
    distance_m: float | None


# --- Día ---


class MealGroup(BaseModel):
    meal_type: MealType
    items: list[FoodEntryOut]
    totals: Macros


class ExerciseGroup(BaseModel):
    exercise_name: str
    category: Category
    sets: list[ExerciseSetOut]


class DayOut(BaseModel):
    date: date
    meals: list[MealGroup]
    exercises: list[ExerciseGroup]
    weight_kg: float | None
    goals: Macros
    totals: Macros
