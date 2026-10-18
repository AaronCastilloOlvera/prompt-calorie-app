// En local queda vacío y el proxy de Vite manda /api al backend; en Railway es la URL del backend.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    // FastAPI manda `detail` como string o, en errores de validación, como lista.
    throw new Error(typeof detail === "string" ? detail : `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function postJson<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
