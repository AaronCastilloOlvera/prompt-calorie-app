import { useState } from "react";
import { Link } from "react-router";

import { useWeekSummary } from "../api/hooks";
import type { WeekDay } from "../api/types";
import { addDays, fmt, mondayOf, todayLocal } from "../lib";

// Colores de estado de la paleta de referencia. Siempre van con el % escrito, nunca solos.
const STATUS = {
  good: { color: "#0ca30c", label: "En meta" },
  warning: { color: "#fab219", label: "Cerca" },
  critical: { color: "#d03b3b", label: "Fuera" },
} as const;

/** Verde dentro de ±10 % de la meta, amarillo hasta ±20 %, rojo fuera. */
function kcalStatus(day: WeekDay) {
  const diff = (day.kcal_eaten - day.kcal_target) / day.kcal_target;
  const abs = Math.abs(diff);
  return { diff, ...STATUS[abs <= 0.1 ? "good" : abs <= 0.2 ? "warning" : "critical"] };
}

const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const weekLabel = (start: string) => {
  const opts = { day: "numeric", month: "short" } as const;
  return `${parse(start).toLocaleDateString("es-MX", opts)} – ${parse(addDays(start, 6)).toLocaleDateString("es-MX", opts)}`;
};

function DayRow({ day, today }: { day: WeekDay; today: string }) {
  const d = parse(day.date);
  const isFuture = day.date > today;
  const hasFood = day.kcal_eaten > 0;
  const status = hasFood ? kcalStatus(day) : null;
  const pct = Math.min(100, (day.kcal_eaten / day.kcal_target) * 100);

  return (
    <Link
      to={day.date === today ? "/" : `/?fecha=${day.date}`}
      className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${
        day.date === today ? "border-emerald-400" : "border-gray-200"
      } ${isFuture ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="w-10 text-center">
        <p className="text-xs uppercase text-gray-500">{d.toLocaleDateString("es-MX", { weekday: "short" })}</p>
        <p className="text-lg font-bold">{d.getDate()}</p>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <b>{hasFood ? fmt(day.kcal_eaten) : "—"}</b>
            <span className="text-gray-500"> / {fmt(day.kcal_target)} kcal</span>
          </span>
          {status && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: status.color }} />
              {status.diff >= 0 ? "+" : "−"}
              {Math.abs(Math.round(status.diff * 100))} %
            </span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          {status && <div className="h-full rounded-full" style={{ width: `${pct}%`, background: status.color }} />}
        </div>
        <div className="flex gap-3 text-xs text-gray-600">
          {day.worked_out && <span title="Entrenaste">🏋️ Entrené</span>}
          {day.ran && <span title="Corriste">🏃 {(day.run_distance_m / 1000).toFixed(1)} km</span>}
          {day.weight_kg != null && <span title="Peso">⚖️ {day.weight_kg.toFixed(1)} kg</span>}
        </div>
      </div>
    </Link>
  );
}

export default function WeekPage() {
  const today = todayLocal();
  const [start, setStart] = useState(() => mondayOf(today));
  const { data, error, isLoading } = useWeekSummary(start);
  const isCurrentWeek = start === mondayOf(today);

  const logged = data?.filter((d) => d.kcal_eaten > 0) ?? [];
  const avgKcal = logged.length ? logged.reduce((a, d) => a + d.kcal_eaten, 0) / logged.length : null;
  const workouts = data?.filter((d) => d.worked_out).length ?? 0;
  const km = (data?.reduce((a, d) => a + d.run_distance_m, 0) ?? 0) / 1000;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setStart(addDays(start, -7))} className="px-3 py-1 text-xl" aria-label="Semana anterior">
          ◀
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isCurrentWeek ? "Esta semana" : "Semana"}</h1>
          <p className="text-sm text-gray-500">{weekLabel(start)}</p>
        </div>
        <button
          onClick={() => setStart(addDays(start, 7))}
          disabled={isCurrentWeek}
          className="px-3 py-1 text-xl disabled:opacity-20"
          aria-label="Semana siguiente"
        >
          ▶
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">No se pudo cargar la semana: {error.message}</p>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              <p className="text-xs text-gray-500">Promedio</p>
              <p className="font-bold">{avgKcal == null ? "—" : `${fmt(avgKcal)} kcal`}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              <p className="text-xs text-gray-500">Entrenos</p>
              <p className="font-bold">{workouts}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              <p className="text-xs text-gray-500">Corrido</p>
              <p className="font-bold">{km.toFixed(1)} km</p>
            </div>
          </div>

          <div className="space-y-2">
            {data.map((day) => (
              <DayRow key={day.date} day={day} today={today} />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {Object.values(STATUS).map((s, i) => (
              <span key={s.label} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label} ({["±10 %", "±20 %", "más de 20 %"][i]})
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
