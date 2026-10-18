import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, postJson } from "./client";
import type { Day, FoodEntriesCreate, FoodEntry, ParsedMeal } from "./types";

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
