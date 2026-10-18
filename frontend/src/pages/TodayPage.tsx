import { useRef, useState } from "react";

import { useParseMeal, useParseWorkout } from "../api/hooks";
import DaySummary from "../components/DaySummary";
import MealEditor from "../components/MealEditor";
import WeightInput from "../components/WeightInput";
import WorkoutEditor from "../components/WorkoutEditor";
import { addDays, compressImage, dayLabel, todayLocal } from "../lib";

type Mode = "meal" | "workout";

export default function TodayPage() {
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<Mode>("meal");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const parseMeal = useParseMeal();
  const parseWorkout = useParseWorkout();
  const parser = mode === "meal" ? parseMeal : parseWorkout;

  const clearPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    clearPhoto();
    setPhotoError(null);
    if (!file) return;
    try {
      const blob = await compressImage(file);
      setPhoto(blob);
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  };

  const reset = () => {
    setText("");
    clearPhoto();
    parseMeal.reset();
    parseWorkout.reset();
  };

  const hasInput = mode === "meal" ? text.trim() !== "" || photo !== null : text.trim() !== "";
  const canSend = hasInput && !parser.isPending;

  const analyze = () =>
    mode === "meal" ? parseMeal.mutate({ text, image: photo }) : parseWorkout.mutate(text);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(addDays(date, -1))} className="px-3 py-1 text-xl" aria-label="Día anterior">
          ◀
        </button>
        <h1 className="text-2xl font-bold capitalize">{dayLabel(date)}</h1>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
          className="px-3 py-1 text-xl disabled:opacity-20"
          aria-label="Día siguiente"
        >
          ▶
        </button>
      </div>

      {parseMeal.data ? (
        <MealEditor parsed={parseMeal.data} rawInput={text.trim() || null} date={date} onDone={reset} />
      ) : parseWorkout.data ? (
        <WorkoutEditor parsed={parseWorkout.data} rawInput={text.trim()} date={date} onDone={reset} />
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
          <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
            {(["meal", "workout"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md py-1.5 ${mode === m ? "bg-white font-semibold shadow-sm" : "text-gray-500"}`}
              >
                {m === "meal" ? "Comida" : "Ejercicio"}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              mode === "meal"
                ? "Ej. desayuné 3 tacos de chicharrón en salsa verde y un café con leche"
                : "Ej. press de banca 4x8 con 60 kg, luego corrí 5 km"
            }
            className="w-full rounded-lg border border-gray-300 p-3 text-base"
          />

          {mode === "meal" && (
            <div className="flex items-center gap-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
              <button
                onClick={() => fileInput.current?.click()}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                📷 {photo ? "Cambiar foto" : "Foto"}
              </button>
              {photoUrl && (
                <div className="flex items-center gap-2">
                  <img src={photoUrl} alt="Foto de la comida" className="h-12 w-12 rounded object-cover" />
                  <button onClick={clearPhoto} className="text-sm text-gray-500">
                    Quitar
                  </button>
                </div>
              )}
            </div>
          )}
          {photoError && <p className="text-sm text-red-600">{photoError}</p>}

          {parser.error && <p className="text-sm text-red-600">{parser.error.message}</p>}

          <button
            onClick={analyze}
            disabled={!canSend}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {parser.isPending ? "Analizando…" : "Analizar"}
          </button>
        </div>
      )}

      {/* key: al cambiar de día se descarta lo que estaba escrito en el campo */}
      <WeightInput key={date} date={date} />

      <DaySummary date={date} />
    </div>
  );
}
