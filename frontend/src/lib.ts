import type { MealType } from "./api/types";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Snack",
};

export const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[];

/** Fecha local del dispositivo en formato YYYY-MM-DD. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Suma (o resta) días a una fecha YYYY-MM-DD. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d + n).toLocaleDateString("en-CA");
}

/** "Hoy", "Ayer" o algo como "vie 17 oct". */
export function dayLabel(date: string): string {
  const today = todayLocal();
  if (date === today) return "Hoy";
  if (date === addDays(today, -1)) return "Ayer";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

/** Sugerencia de comida según la hora local, para cuando Claude no la infiere. */
export function suggestMealType(now = new Date()): MealType {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "breakfast";
  if (h >= 12 && h < 17) return "lunch";
  if (h >= 19 || h < 1) return "dinner";
  return "snack";
}

/** Redimensiona la foto (lado mayor ~1024px) y la convierte a JPEG ~0.8 antes de subirla. */
export async function compressImage(file: File, maxSide = 1024, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir la foto"))), "image/jpeg", quality),
  );
}

export const fmt = (n: number) => Math.round(n).toLocaleString("es-MX");
