import { useState } from "react";

import { useDay, useSaveWeight } from "../api/hooks";
import { toNumber } from "../lib";

export default function WeightInput({ date }: { date: string }) {
  const { data } = useDay(date);
  const save = useSaveWeight();
  // null = el usuario no ha tocado el campo; se muestra el peso guardado.
  const [draft, setDraft] = useState<string | null>(null);

  const saved = data?.weight_kg ?? null;
  const value = draft ?? (saved == null ? "" : String(saved));
  const weight = toNumber(value);
  const canSave = value.trim() !== "" && Number.isFinite(weight) && weight > 0 && weight !== saved && !save.isPending;

  const handleSave = () =>
    save.mutate({ local_date: date, weight_kg: weight }, { onSuccess: () => setDraft(null) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) handleSave();
      }}
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3"
    >
      <label htmlFor="weight" className="font-semibold">
        Peso
      </label>
      <input
        id="weight"
        type="text"
        inputMode="decimal"
        placeholder="—"
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right"
      />
      <span className="text-sm text-gray-500">kg</span>
      <button
        type="submit"
        disabled={!canSave}
        className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {save.isPending ? "…" : saved == null ? "Guardar" : "Actualizar"}
      </button>
      {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}
    </form>
  );
}
