import { useState } from "react";

import { useCreateExerciseSets } from "../api/hooks";
import type { Category, ParsedWorkout, SetIn } from "../api/types";
import { CATEGORY_LABELS } from "../lib";

// En pantalla se edita en km y minutos; al guardar se convierte a metros y segundos.
const SET_FIELDS = [
  { key: "reps", label: "Reps" },
  { key: "kg", label: "kg" },
  { key: "km", label: "km" },
  { key: "min", label: "min" },
] as const;

type SetKey = (typeof SET_FIELDS)[number]["key"];
type SetRow = { id: number } & Record<SetKey, string>;
type ExerciseRow = { id: number; name: string; category: Category; sets: SetRow[] };

let nextId = 0;

const str = (n: number | null, scale = 1) => (n == null ? "" : String(+(n / scale).toFixed(2)));

function toSetRow(s: SetIn): SetRow {
  return {
    id: nextId++,
    reps: str(s.reps),
    kg: str(s.weight_kg),
    km: str(s.distance_m, 1000),
    min: str(s.duration_s, 60),
  };
}

const parse = (s: string, scale = 1) => (s.trim() === "" ? null : Number(s) * scale);

function toSetIn(r: SetRow): SetIn {
  const duration = parse(r.min, 60);
  const reps = parse(r.reps);
  return {
    reps: reps == null ? null : Math.round(reps),
    weight_kg: parse(r.kg),
    distance_m: parse(r.km, 1000),
    duration_s: duration == null ? null : Math.round(duration),
  };
}

const emptySet = (): SetRow => ({ id: nextId++, reps: "", kg: "", km: "", min: "" });

type Props = {
  parsed: ParsedWorkout;
  rawInput: string;
  date: string;
  onDone: () => void;
};

export default function WorkoutEditor({ parsed, rawInput, date, onDone }: Props) {
  const [exercises, setExercises] = useState<ExerciseRow[]>(() =>
    parsed.exercises.map((e) => ({
      id: nextId++,
      name: e.exercise_name,
      category: e.category,
      sets: e.sets.map(toSetRow),
    })),
  );
  const save = useCreateExerciseSets();

  const updateExercise = (id: number, patch: Partial<ExerciseRow>) =>
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const updateSet = (ex: ExerciseRow, setId: number, patch: Partial<SetRow>) =>
    updateExercise(ex.id, { sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });

  // Una serie nueva copia los valores de la anterior (lo normal es repetir peso y reps).
  const addSet = (ex: ExerciseRow) => {
    const last = ex.sets.at(-1);
    updateExercise(ex.id, { sets: [...ex.sets, last ? { ...last, id: nextId++ } : emptySet()] });
  };

  const canSave =
    exercises.length > 0 && exercises.every((x) => x.name.trim() && x.sets.length > 0) && !save.isPending;

  const handleSave = () =>
    save.mutate(
      {
        local_date: date,
        raw_input: rawInput,
        exercises: exercises.map((x) => ({
          exercise_name: x.name.trim(),
          category: x.category,
          sets: x.sets.map(toSetIn),
        })),
      },
      { onSuccess: onDone },
    );

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <h2 className="font-semibold">Revisa y guarda</h2>

      {parsed.notes && (
        <p className="rounded-lg bg-sky-50 p-2 text-xs text-sky-900">
          <span className="font-semibold">Supuestos: </span>
          {parsed.notes}
        </p>
      )}

      {exercises.length === 0 && (
        <p className="text-sm text-gray-500">Claude no encontró ejercicios. Agrega uno a mano o descarta.</p>
      )}

      <ul className="space-y-3">
        {exercises.map((ex) => (
          <li key={ex.id} className="space-y-2 rounded-lg border border-gray-200 p-2">
            <div className="flex gap-2">
              <input
                value={ex.name}
                onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                placeholder="Ejercicio"
                className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium"
              />
              <select
                value={ex.category}
                onChange={(e) => updateExercise(ex.id, { category: e.target.value as Category })}
                className="rounded border border-gray-300 px-1 text-xs"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setExercises((xs) => xs.filter((x) => x.id !== ex.id))}
                className="px-1 text-gray-400 hover:text-red-600"
                aria-label="Borrar ejercicio"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-[1.5rem_repeat(4,1fr)_1.5rem] gap-1 text-[10px] text-gray-500">
              <span>#</span>
              {SET_FIELDS.map((f) => (
                <span key={f.key}>{f.label}</span>
              ))}
              <span />
              {ex.sets.map((s, i) => (
                <div key={s.id} className="contents">
                  <span className="self-center text-sm text-gray-400">{i + 1}</span>
                  {SET_FIELDS.map((f) => (
                    <input
                      key={f.key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={s[f.key]}
                      onChange={(e) => updateSet(ex, s.id, { [f.key]: e.target.value })}
                      className="w-full rounded border border-gray-300 px-1 py-1 text-sm text-gray-900"
                    />
                  ))}
                  <button
                    onClick={() => updateExercise(ex.id, { sets: ex.sets.filter((x) => x.id !== s.id) })}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={`Borrar serie ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => addSet(ex)} className="text-sm text-emerald-700">
              + Serie
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={() =>
          setExercises((xs) => [...xs, { id: nextId++, name: "", category: "strength", sets: [emptySet()] }])
        }
        className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-600"
      >
        + Agregar ejercicio
      </button>

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
