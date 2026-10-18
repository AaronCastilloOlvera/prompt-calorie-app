import { useState } from "react";

import { useCreateFoodEntries } from "../api/hooks";
import type { Confidence, MealType, ParsedMeal } from "../api/types";
import { MEAL_LABELS, MEAL_TYPES, fmt, suggestMealType } from "../lib";

const NUM_FIELDS = [
  { key: "grams", label: "g" },
  { key: "kcal", label: "kcal" },
  { key: "protein_g", label: "Prot" },
  { key: "carbs_g", label: "Carb" },
  { key: "fat_g", label: "Grasa" },
] as const;

type NumKey = (typeof NUM_FIELDS)[number]["key"];

// Los números se editan como string para poder escribir "1." o dejar el campo vacío.
type Row = { id: number; name: string; portion: string; confidence: Confidence | null } & Record<NumKey, string>;

let nextId = 0;

function toRows(parsed: ParsedMeal): Row[] {
  return parsed.items.map((i) => ({
    id: nextId++,
    name: i.name,
    portion: i.portion_description,
    confidence: i.confidence,
    grams: String(i.grams),
    kcal: String(i.kcal),
    protein_g: String(i.protein_g),
    carbs_g: String(i.carbs_g),
    fat_g: String(i.fat_g),
  }));
}

const emptyRow = (): Row => ({
  id: nextId++, name: "", portion: "", confidence: null,
  grams: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "",
});

const num = (s: string) => Number(s) || 0;

type Props = {
  parsed: ParsedMeal;
  rawInput: string | null;
  date: string;
  onDone: () => void;
};

export default function MealEditor({ parsed, rawInput, date, onDone }: Props) {
  const [mealType, setMealType] = useState<MealType>(parsed.meal_type ?? suggestMealType());
  const [rows, setRows] = useState<Row[]>(() => toRows(parsed));
  const save = useCreateFoodEntries();

  const update = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const total = (key: NumKey) => rows.reduce((acc, r) => acc + num(r[key]), 0);
  const canSave = rows.length > 0 && rows.every((r) => r.name.trim()) && !save.isPending;

  const handleSave = () =>
    save.mutate(
      {
        local_date: date,
        meal_type: mealType,
        raw_input: rawInput,
        items: rows.map((r) => ({
          name: r.name.trim(),
          portion_description: r.portion.trim() || null,
          grams: num(r.grams),
          kcal: num(r.kcal),
          protein_g: num(r.protein_g),
          carbs_g: num(r.carbs_g),
          fat_g: num(r.fat_g),
        })),
      },
      { onSuccess: onDone },
    );

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Revisa y guarda</h2>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {MEAL_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      {parsed.notes && (
        <p className="rounded-lg bg-sky-50 p-2 text-xs text-sky-900">
          <span className="font-semibold">Supuestos: </span>
          {parsed.notes}
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`space-y-2 rounded-lg border p-2 ${
              r.confidence === "low" ? "border-amber-300 bg-amber-50" : "border-gray-200"
            }`}
          >
            <div className="flex gap-2">
              <input
                value={r.name}
                onChange={(e) => update(r.id, { name: e.target.value })}
                placeholder="Alimento"
                className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium"
              />
              <button
                onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                className="px-2 text-gray-400 hover:text-red-600"
                aria-label="Borrar fila"
              >
                ✕
              </button>
            </div>
            <input
              value={r.portion}
              onChange={(e) => update(r.id, { portion: e.target.value })}
              placeholder="Porción (ej. 3 piezas)"
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <div className="grid grid-cols-5 gap-1">
              {NUM_FIELDS.map((f) => (
                <label key={f.key} className="text-[10px] text-gray-500">
                  {f.label}
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={r[f.key]}
                    onChange={(e) => update(r.id, { [f.key]: e.target.value })}
                    className="w-full rounded border border-gray-300 px-1 py-1 text-sm text-gray-900"
                  />
                </label>
              ))}
            </div>
            {r.confidence === "low" && <p className="text-[11px] text-amber-700">Confianza baja: revisa estos valores.</p>}
          </li>
        ))}
      </ul>

      <button
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-600"
      >
        + Agregar alimento
      </button>

      <p className="text-sm text-gray-700">
        Total: <b>{fmt(total("kcal"))} kcal</b> · P {fmt(total("protein_g"))} g · C {fmt(total("carbs_g"))} g · G{" "}
        {fmt(total("fat_g"))} g
      </p>

      {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm">
          Descartar
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
