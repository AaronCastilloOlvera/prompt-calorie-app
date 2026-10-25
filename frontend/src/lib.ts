import type { Category, MealType, SetIn } from "./api/types";

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

export const CATEGORY_LABELS: Record<Category, string> = {
  strength: "Fuerza",
  run: "Correr",
  cardio_other: "Otro cardio",
};

/** 1680 → "28:00", 3725 → "1:02:05". */
export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

/** Texto corto de una serie: "8 × 60 kg", "5.00 km · 28:00 (5:36 /km)", etc. */
export function describeSet(s: SetIn): string {
  const parts: string[] = [];
  if (s.reps != null) parts.push(s.weight_kg != null ? `${s.reps} × ${s.weight_kg} kg` : `${s.reps} reps`);
  else if (s.weight_kg != null) parts.push(`${s.weight_kg} kg`);
  if (s.distance_m != null) parts.push(`${(s.distance_m / 1000).toFixed(2)} km`);
  if (s.duration_s != null) parts.push(fmtDuration(s.duration_s));
  if (s.distance_m && s.duration_s) parts.push(`(${fmtDuration(s.duration_s / (s.distance_m / 1000))} /km)`);
  return parts.join(" · ") || "—";
}

/** Lunes de la semana de una fecha YYYY-MM-DD. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = lunes
  return addDays(date, -weekday);
}

/** Convierte lo que se escribe en un campo numérico; acepta coma o punto decimal ("78,5" o "78.5"). */
export function toNumber(s: string): number {
  return Number(s.trim().replace(",", "."));
}
