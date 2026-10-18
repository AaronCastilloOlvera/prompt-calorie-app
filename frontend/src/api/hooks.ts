import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, postJson } from "./client";
import type {
  BodyWeight,
  Day,
  ExerciseSet,
  ExerciseSetsCreate,
  FoodEntriesCreate,
  FoodEntry,
  ParsedMeal,
  ParsedWorkout,
  WeekDay,
} from "./types";

export function useDay(date: string) {
  return useQuery({ queryKey: ["day", date], queryFn: () => apiFetch<Day>(`/days/${date}`) });
}

export function useParseMeal() {
  return useMutation({
    mutationFn: ({ text, image }: { text: string; image: Blob | null }) => {
      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      if (image) form.append("image", image, "meal.jpg");
      return apiFetch<ParsedMeal>("/parse/meal", { method: "POST", body: form });
    },
  });
}

export function useCreateFoodEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FoodEntriesCreate) => postJson<FoodEntry[]>("/food-entries", body),
    onSuccess: (_, body) => qc.invalidateQueries({ queryKey: ["day", body.local_date] }),
  });
}

export function useDeleteFoodEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/food-entries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day"] }),
  });
}

export function useParseWorkout() {
  return useMutation({
    mutationFn: (text: string) => postJson<ParsedWorkout>("/parse/workout", { text: text.trim() }),
  });
}

export function useCreateExerciseSets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExerciseSetsCreate) => postJson<ExerciseSet[]>("/exercise-sets", body),
    onSuccess: (_, body) => qc.invalidateQueries({ queryKey: ["day", body.local_date] }),
  });
}

export function useDeleteExerciseSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/exercise-sets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["day"] }),
  });
}

export function useBodyWeights(from: string, to: string) {
  return useQuery({
    queryKey: ["body-weight", from, to],
    queryFn: () => apiFetch<BodyWeight[]>(`/body-weight?from=${from}&to=${to}`),
  });
}

export function useSaveWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BodyWeight) => postJson<BodyWeight>("/body-weight", body),
    onSuccess: (_, body) => {
      qc.invalidateQueries({ queryKey: ["day", body.local_date] });
      qc.invalidateQueries({ queryKey: ["body-weight"] });
    },
  });
}

export function useWeekSummary(start: string) {
  return useQuery({
    queryKey: ["week", start],
    queryFn: () => apiFetch<WeekDay[]>(`/summary/week?start=${start}`),
  });
}
