import { Link, useParams } from "react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useExerciseProgress } from "../api/hooks";
import type { ExerciseProgress } from "../api/types";
import { CATEGORY_LABELS, describeSet, fmt } from "../lib";

// Slot 1 de la paleta categórica de referencia: una sola serie, sin leyenda (el título la nombra).
const COLOR = "#2a78d6";
const SURFACE = "#ffffff";
const GRID = "#e5e7eb";
const AXIS_TICK = { fontSize: 11, fill: "#6b7280" };

type Week = ExerciseProgress["weeks"][number] & { label: string; km: number };

const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const shortDate = (date: string) => parse(date).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const longDate = (date: string) =>
  parse(date).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function WeekTooltip({ week }: { week: Week }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm">
      <p className="mb-1 font-semibold text-gray-900">Semana del {shortDate(week.week_start)}</p>
      {week.max_weight_kg != null && (
        <p>
          Peso máximo: <b className="text-gray-900">{week.max_weight_kg} kg</b>
        </p>
      )}
      {week.volume_kg > 0 && (
        <p>
          Volumen: <b className="text-gray-900">{fmt(week.volume_kg)} kg</b>
        </p>
      )}
      {week.km > 0 && (
        <p>
          Distancia: <b className="text-gray-900">{week.km.toFixed(2)} km</b>
        </p>
      )}
    </div>
  );
}

export default function ExerciseDetailPage() {
  const name = useParams().name ?? "";
  const { data, error, isLoading } = useExerciseProgress(name);

  const weeks: Week[] = (data?.weeks ?? []).map((w) => ({
    ...w,
    label: shortDate(w.week_start),
    km: w.distance_m / 1000,
  }));
  // Fuerza se mide por peso máximo; correr y otro cardio, por distancia.
  const byWeight = weeks.some((w) => w.max_weight_kg != null);
  const byDistance = !byWeight && weeks.some((w) => w.km > 0);

  return (
    <div className="space-y-4">
      <div>
        <Link to="/ejercicios" className="text-sm text-emerald-700">
          ‹ Ejercicios
        </Link>
        <h1 className="text-2xl font-bold">{name}</h1>
        {data && <p className="text-sm text-gray-500">{CATEGORY_LABELS[data.category]}</p>}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {(byWeight || byDistance) && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <h2 className="mb-2 text-sm font-semibold">
            {byWeight ? "Peso máximo por semana (kg)" : "Distancia por semana (km)"}
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {byWeight ? (
                <LineChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                  <YAxis
                    domain={[(min: number) => Math.max(0, Math.floor(min - 5)), (max: number) => Math.ceil(max + 5)]}
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ stroke: "#9ca3af", strokeWidth: 1 }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? <WeekTooltip week={payload[0].payload as Week} /> : null
                    }
                  />
                  <Line
                    dataKey="max_weight_kg"
                    stroke={COLOR}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    connectNulls
                    dot={{ r: 4, fill: COLOR, stroke: SURFACE, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: COLOR, stroke: SURFACE, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? <WeekTooltip week={payload[0].payload as Week} /> : null
                    }
                  />
                  <Bar dataKey="km" fill={COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <h2 className="mb-1 text-sm font-semibold">Historial</h2>
          <div className="divide-y divide-gray-100">
            {data.sessions.map((session) => (
              <Link key={session.date} to={`/?fecha=${session.date}`} className="block py-2">
                <p className="text-sm font-medium capitalize">{longDate(session.date)}</p>
                <ul className="text-sm text-gray-700">
                  {session.sets.map((s) => (
                    <li key={s.id} className="flex gap-2">
                      <span className="w-5 text-xs text-gray-400">{s.set_number}</span>
                      {describeSet(s)}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
