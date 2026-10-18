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


# --- Exercise sets ---


class SetIn(BaseModel):
    reps: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, ge=0)
    duration_s: int | None = Field(default=None, ge=0)
    distance_m: float | None = Field(default=None, ge=0)


class ExerciseIn(BaseModel):
    exercise_name: str = Field(min_length=1)
    category: Category
    sets: list[SetIn] = Field(min_length=1)


class WorkoutText(BaseModel):
    text: str = Field(min_length=1)


class ParsedWorkout(BaseModel):
    exercises: list[ExerciseIn]
    notes: str


class ExerciseSetsCreate(BaseModel):
    # Si no viene, se usa la fecha de hoy en APP_TIMEZONE.
    local_date: date | None = None
    raw_input: str | None = None
    exercises: list[ExerciseIn] = Field(min_length=1)


class ExerciseSetUpdate(BaseModel):
    local_date: date | None = None
    exercise_name: str | None = Field(default=None, min_length=1)
    category: Category | None = None
    set_number: int | None = Field(default=None, ge=1)
    reps: int | None = Field(default=None, ge=0)
    weight_kg: float | None = Field(default=None, ge=0)
    duration_s: int | None = Field(default=None, ge=0)
    distance_m: float | None = Field(default=None, ge=0)


class ExerciseSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    local_date: date
    exercise_name: str
    category: Category
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


# --- Peso corporal ---


class BodyWeightIn(BaseModel):
    # Si no viene, se usa la fecha de hoy en APP_TIMEZONE.
    local_date: date | None = None
    weight_kg: float = Field(gt=0, le=500)


class BodyWeightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    local_date: date
    weight_kg: float


# --- Resumen semanal ---


class WeekDayOut(BaseModel):
    date: date
    kcal_eaten: float
    kcal_target: float
    protein_g: float
    carbs_g: float
    fat_g: float
    worked_out: bool
    ran: bool
    run_distance_m: float
    weight_kg: float | None


# --- Ejercicios ---


class ExerciseOut(BaseModel):
    exercise_name: str
    category: Category


class ExerciseWeekOut(BaseModel):
    week_start: date
    max_weight_kg: float | None
    volume_kg: float  # suma de reps × peso
    distance_m: float


class ExerciseSessionOut(BaseModel):
    date: date
    sets: list[ExerciseSetOut]


class ExerciseProgressOut(BaseModel):
    exercise_name: str
    category: Category
    weeks: list[ExerciseWeekOut]
    sessions: list[ExerciseSessionOut]  # historial, del más reciente al más antiguo
