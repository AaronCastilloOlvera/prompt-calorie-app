import { useDay, useDeleteExerciseSet, useDeleteFoodEntry } from "../api/hooks";
import { CATEGORY_LABELS, MEAL_LABELS, describeSet, fmt } from "../lib";

function Bar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = value > target;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>
          {fmt(value)} / {fmt(target)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DaySummary({ date }: { date: string }) {
  const { data, error, isLoading } = useDay(date);
  const del = useDeleteFoodEntry();
  const delSet = useDeleteExerciseSet();

  if (isLoading) return <p className="text-sm text-gray-500">Cargando…</p>;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo cargar el día: {error?.message}</p>;

  const { totals, goals } = data;
  return (
    <section className="space-y-4">
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">{fmt(totals.kcal)}</span>
          <span className="text-sm text-gray-500">de {fmt(goals.kcal)} kcal</span>
        </div>
        <Bar label="Calorías" value={totals.kcal} target={goals.kcal} unit="kcal" />
        <Bar label="Proteína" value={totals.protein_g} target={goals.protein_g} unit="g" />
        <Bar label="Carbohidratos" value={totals.carbs_g} target={goals.carbs_g} unit="g" />
        <Bar label="Grasa" value={totals.fat_g} target={goals.fat_g} unit="g" />
      </div>

      {data.meals.length === 0 && <p className="text-center text-sm text-gray-500">No hay comida registrada este día.</p>}

      {data.meals.map((meal) => (
        <div key={meal.meal_type} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-1 flex justify-between">
            <h3 className="font-semibold">{MEAL_LABELS[meal.meal_type]}</h3>
            <span className="text-sm text-gray-500">{fmt(meal.totals.kcal)} kcal</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {meal.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {item.portion_description ?? `${fmt(item.grams)} g`} · P {fmt(item.protein_g)} · C{" "}
                    {fmt(item.carbs_g)} · G {fmt(item.fat_g)}
                  </p>
                </div>
                <span className="text-gray-700">{fmt(item.kcal)}</span>
                <button
                  onClick={() => confirm(`¿Borrar "${item.name}"?`) && del.mutate(item.id)}
                  disabled={del.isPending}
                  className="px-1 text-gray-400 hover:text-red-600"
                  aria-label={`Borrar ${item.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {data.exercises.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <h3 className="mb-1 font-semibold">Ejercicio</h3>
          <div className="divide-y divide-gray-100">
            {data.exercises.map((ex) => (
              <div key={ex.exercise_name} className="py-1.5">
                <p className="text-sm font-medium">
                  {ex.exercise_name} <span className="text-xs font-normal text-gray-400">{CATEGORY_LABELS[ex.category]}</span>
                </p>
                <ul>
                  {ex.sets.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-5 text-xs text-gray-400">{s.set_number}</span>
                      <span className="flex-1">{describeSet(s)}</span>
                      <button
                        onClick={() => confirm(`¿Borrar la serie ${s.set_number} de ${ex.exercise_name}?`) && delSet.mutate(s.id)}
                        disabled={delSet.isPending}
                        className="px-1 text-gray-400 hover:text-red-600"
                        aria-label={`Borrar serie ${s.set_number}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
