import { useState } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useBodyWeights } from "../api/hooks";
import { addDays, todayLocal } from "../lib";

// Slots 1 y 2 de la paleta categórica de referencia (validados juntos sobre fondo claro).
const DAILY_COLOR = "#2a78d6";
const AVG_COLOR = "#eb6834";
const SURFACE = "#ffffff";

const RANGES = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "1 año" },
];

type Point = { date: string; t: number; weight: number; avg: number };

const toTime = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

const shortDate = (t: number) => new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const longDate = (t: number) =>
  new Date(t).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const kg = (n: number) => `${n.toFixed(1)} kg`;

/** Promedio de los pesos registrados en los 7 días que terminan en cada fecha (días sin peso no cuentan). */
function withMovingAverage(rows: { local_date: string; weight_kg: number }[]): Point[] {
  return rows.map((r) => {
    const start = addDays(r.local_date, -6);
    const window = rows.filter((x) => x.local_date >= start && x.local_date <= r.local_date);
    const avg = window.reduce((acc, x) => acc + x.weight_kg, 0) / window.length;
    return { date: r.local_date, t: toTime(r.local_date), weight: r.weight_kg, avg: Math.round(avg * 100) / 100 };
  });
}

export default function WeightPage() {
  const [rangeDays, setRangeDays] = useState(90);
  const to = todayLocal();
  const from = addDays(to, -(rangeDays - 1));
  // Se piden 6 días extra para que el promedio móvil del inicio del rango sea correcto.
  const { data, error, isLoading } = useBodyWeights(addDays(from, -6), to);

  const points = withMovingAverage(data ?? []).filter((p) => p.date >= from);
  const latest = points.at(-1);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Peso</h1>

      <div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 text-sm">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setRangeDays(r.days)}
            className={`rounded-md py-1.5 ${rangeDays === r.days ? "bg-white font-semibold shadow-sm" : "text-gray-500"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">No se pudo cargar el peso: {error.message}</p>}

      {data && points.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No hay pesos registrados en este rango. Regístralo desde la vista Hoy.
        </p>
      )}

      {latest && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">Último ({shortDate(latest.t)})</p>
              <p className="text-2xl font-bold">{kg(latest.weight)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">Promedio 7 días</p>
              <p className="text-2xl font-bold">{kg(latest.avg)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="mb-2 flex gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DAILY_COLOR }} />
                Peso del día
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: AVG_COLOR }} />
                Promedio 7 días
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={[toTime(from), toTime(to)]}
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ stroke: "#9ca3af", strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as Point | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                          <p className="mb-1 font-semibold capitalize text-gray-900">{longDate(p.t)}</p>
                          <p className="flex items-center gap-1.5 text-gray-700">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: DAILY_COLOR }} />
                            Peso: <b className="text-gray-900">{kg(p.weight)}</b>
                          </p>
                          <p className="flex items-center gap-1.5 text-gray-700">
                            <span className="inline-block h-0.5 w-3 rounded" style={{ background: AVG_COLOR }} />
                            Promedio 7 días: <b className="text-gray-900">{kg(p.avg)}</b>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    dataKey="weight"
                    stroke={DAILY_COLOR}
                    strokeOpacity={0.35}
                    strokeWidth={1.5}
                    dot={{ r: 4, fill: DAILY_COLOR, stroke: SURFACE, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: DAILY_COLOR, stroke: SURFACE, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="avg"
                    stroke={AVG_COLOR}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 5, fill: AVG_COLOR, stroke: SURFACE, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vista de tabla: los mismos datos que la gráfica, del más reciente al más antiguo. */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-1 font-normal">Fecha</th>
                  <th className="pb-1 text-right font-normal">Peso</th>
                  <th className="pb-1 text-right font-normal">Prom. 7 días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...points].reverse().map((p) => (
                  <tr key={p.date}>
                    <td className="py-1.5 capitalize text-gray-700">{longDate(p.t)}</td>
                    <td className="py-1.5 text-right font-medium">{kg(p.weight)}</td>
                    <td className="py-1.5 text-right text-gray-600">{kg(p.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
