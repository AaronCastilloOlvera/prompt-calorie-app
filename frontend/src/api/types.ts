export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Category = "strength" | "run" | "cardio_other";
export type Confidence = "high" | "medium" | "low";

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export type ParsedMealItem = Macros & {
  name: string;
  portion_description: string;
  grams: number;
  confidence: Confidence;
};

export type ParsedMeal = {
  meal_type: MealType | null;
  items: ParsedMealItem[];
  notes: string;
};

export type FoodItemIn = Macros & {
  name: string;
  portion_description: string | null;
  grams: number;
};

export type FoodEntriesCreate = {
  local_date: string;
  meal_type: MealType;
  raw_input: string | null;
  items: FoodItemIn[];
};

export type FoodEntry = FoodItemIn & {
  id: number;
  local_date: string;
  meal_type: MealType;
  raw_input: string | null;
};

export type ExerciseSet = {
  id: number;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  distance_m: number | null;
};

export type Day = {
  date: string;
  meals: { meal_type: MealType; items: FoodEntry[]; totals: Macros }[];
  exercises: { exercise_name: string; category: Category; sets: ExerciseSet[] }[];
  weight_kg: number | null;
  goals: Macros;
  totals: Macros;
};
