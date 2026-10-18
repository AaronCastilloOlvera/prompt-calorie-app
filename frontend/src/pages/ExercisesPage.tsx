import { Link } from "react-router";

import { useExercises } from "../api/hooks";
import { CATEGORY_LABELS } from "../lib";

export default function ExercisesPage() {
  const { data, error, isLoading } = useExercises();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ejercicios</h1>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">No se pudieron cargar los ejercicios: {error.message}</p>}
      {data?.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Aún no registras ejercicios. Hazlo desde la vista Hoy, en modo Ejercicio.
        </p>
      )}

      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {data?.map((e) => (
          <li key={e.exercise_name}>
            <Link
              to={`/ejercicios/${encodeURIComponent(e.exercise_name)}`}
              className="flex items-center justify-between px-3 py-3"
            >
              <span className="font-medium">{e.exercise_name}</span>
              <span className="text-xs text-gray-500">{CATEGORY_LABELS[e.category]} ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
