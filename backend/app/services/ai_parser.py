"""Toda la lógica de Claude vive aquí.

Patrón: texto/foto → Claude (tool use) → JSON validado con Pydantic → se devuelve al front.
Nada de este módulo escribe en la base de datos.

Nota: los modelos actuales (Sonnet 5.5, Opus 5.5) rechazan `tool_choice` forzado, así que
usamos `tool_choice: auto` + `strict: true` (el input siempre cumple el schema) + una
instrucción explícita en el system prompt. Si Claude no llama la herramienta, es un error 502.
"""

import base64
from functools import lru_cache
from typing import Any

import anthropic
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.schemas import ParsedMeal, ParsedWorkout

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class AIParseError(Exception):
    """Claude no devolvió algo utilizable. Los routers lo convierten en 502."""


@lru_cache
def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


def _call_tool[T: BaseModel](
    system: str, content: list[dict[str, Any]], tool: dict[str, Any], schema: type[T]
) -> T:
    try:
        response = _client().beta.messages.create(
            model=get_settings().anthropic_model,
            max_tokens=16000,
            system=system,
            tools=[{**tool, "strict": True}],
            tool_choice={"type": "auto"},
            output_config={"effort": "medium"},
            # Si un clasificador de seguridad rechaza la petición, la API la reintenta
            # automáticamente con otro modelo dentro de la misma llamada.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.APIConnectionError as e:
        raise AIParseError("No se pudo conectar con Claude.") from e
    except anthropic.APIStatusError as e:
        raise AIParseError(f"Error de la API de Claude ({e.status_code}): {e.message}") from e

    if response.stop_reason == "refusal":
        raise AIParseError("Claude se negó a procesar la petición.")
    if response.stop_reason == "max_tokens":
        raise AIParseError("La respuesta de Claude se cortó (max_tokens).")

    tool_use = next(
        (b for b in response.content if b.type == "tool_use" and b.name == tool["name"]), None
    )
    if tool_use is None:
        raise AIParseError("Claude no devolvió datos estructurados. Intenta describirlo de otra forma.")

    try:
        return schema.model_validate(tool_use.input)
    except ValidationError as e:
        raise AIParseError(f"La respuesta de Claude no tiene el formato esperado: {e}") from e


# --- Comida ---

MEAL_SYSTEM_PROMPT = """\
Eres un asistente de nutrición que estima calorías y macronutrientes a partir de descripciones \
o fotos de comida. Siempre respondes llamando a la herramienta register_meal; nunca respondas solo con texto.

- El usuario vive en México: considera comida mexicana común (tortillas de maíz y de harina, \
frijoles, guisados, tacos, etc.) y las porciones típicas de allá.
- Convierte medidas caseras a gramos ("una taza", "un puño", "un plato hondo", "una pieza").
- Usa un item por platillo o producto, no por ingrediente: "4 tacos al pastor" es un solo item que \
incluye tortillas, carne y guarnición. Separa solo lo que son cosas distintas (por ejemplo tacos, \
refresco y postre). Nunca un solo item como "desayuno" o "cena".
- Para estimar un platillo, calcula cada componente por separado (tortillas, carne, guarnición, \
aceite…) y suma. En `portion_description` pon la cantidad y el desglose breve, por ejemplo \
"3 enchiladas: 3 tortillas fritas ~X kcal, ~90 g de pollo ~Y kcal, salsa, crema y queso ~Z kcal" \
(este ejemplo solo muestra el formato; estima cada valor de cero).
- Si algo es ambiguo, elige la porción típica, baja `confidence` y explica el supuesto en `notes`.
- Considera el aceite o la grasa de cocción cuando el método lo implique (frito, guisado).
- Si hay foto y texto, el texto tiene prioridad sobre lo que veas en la foto.
- Infiere `meal_type` solo si el texto lo indica explícitamente; si no, usa null. Usa el sentido \
mexicano: "desayuno"/"desayuné" y "almuerzo"/"almorcé" (comida de media mañana) → breakfast; \
"la comida" (comida fuerte de mediodía o tarde) → lunch; "cena"/"cené" → dinner; \
"colación"/"botana"/"snack" → snack. El verbo "comí" solo no indica tipo de comida.
- Escribe `name`, `portion_description` y `notes` en español.\
"""

_NUMBER = {"type": "number"}

REGISTER_MEAL_TOOL = {
    "name": "register_meal",
    "description": "Registra los alimentos de una comida con su porción estimada, calorías y macros.",
    "input_schema": {
        "type": "object",
        "properties": {
            "meal_type": {
                "anyOf": [
                    {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]},
                    {"type": "null"},
                ],
                "description": "Solo si el texto lo indica; si no, null.",
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "portion_description": {
                            "type": "string",
                            "description": "Porción en lenguaje natural, ej. '3 piezas', '1 taza'.",
                        },
                        "grams": _NUMBER,
                        "kcal": _NUMBER,
                        "protein_g": _NUMBER,
                        "carbs_g": _NUMBER,
                        "fat_g": _NUMBER,
                        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                    },
                    "required": [
                        "name", "portion_description", "grams", "kcal",
                        "protein_g", "carbs_g", "fat_g", "confidence",
                    ],
                    "additionalProperties": False,
                },
            },
            "notes": {"type": "string", "description": "Supuestos que hiciste."},
        },
        "required": ["meal_type", "items", "notes"],
        "additionalProperties": False,
    },
}


def parse_meal(text: str | None, image: bytes | None, image_media_type: str | None) -> ParsedMeal:
    content: list[dict[str, Any]] = []
    if image is not None:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_media_type,
                "data": base64.standard_b64encode(image).decode(),
            },
        })
    content.append({"type": "text", "text": text or "Estima los alimentos que ves en la foto."})

    return _call_tool(MEAL_SYSTEM_PROMPT, content, REGISTER_MEAL_TOOL, ParsedMeal)


# --- Entrenamiento ---

WORKOUT_SYSTEM_PROMPT = """\
Conviertes la descripción de un entrenamiento en ejercicios y series. Siempre respondes llamando \
a la herramienta register_workout; nunca respondas solo con texto.

- Si un ejercicio corresponde a uno de la lista de ejercicios conocidos, usa EXACTAMENTE ese nombre \
(por ejemplo "bench", "press banca" o "pecho en banca plana" → "Press de banca"). Si es nuevo, \
usa un nombre claro en español con mayúscula inicial.
- Expande la notación de series: "4x8 con 60" son 4 series individuales de 8 repeticiones con 60 kg.
- Convierte unidades: libras a kg, km y millas a metros, minutos a segundos.
- Cualquier forma de correr (en la calle, en caminadora corriendo, trail) es categoría `run`. \
Otro cardio (bici, elíptica, natación, caminar, remo) es `cardio_other`. Pesas, máquinas y \
ejercicios con peso corporal son `strength`.
- En fuerza llena `reps` y `weight_kg` (null si es con peso corporal). En cardio llena \
`distance_m` y/o `duration_s`. Deja en null lo que no se mencione o no aplique (nunca 0); \
no inventes datos.
- Una carrera continua es una sola serie; los intervalos son una serie por intervalo.
- Explica en `notes` (en español) cualquier supuesto o conversión que hayas hecho.\
"""

_NULLABLE_INT = {"anyOf": [{"type": "integer"}, {"type": "null"}]}
_NULLABLE_NUMBER = {"anyOf": [{"type": "number"}, {"type": "null"}]}

REGISTER_WORKOUT_TOOL = {
    "name": "register_workout",
    "description": "Registra los ejercicios de un entrenamiento, con una entrada por serie.",
    "input_schema": {
        "type": "object",
        "properties": {
            "exercises": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "exercise_name": {"type": "string"},
                        "category": {"type": "string", "enum": ["strength", "run", "cardio_other"]},
                        "sets": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "reps": _NULLABLE_INT,
                                    "weight_kg": _NULLABLE_NUMBER,
                                    "duration_s": _NULLABLE_INT,
                                    "distance_m": _NULLABLE_NUMBER,
                                },
                                "required": ["reps", "weight_kg", "duration_s", "distance_m"],
                                "additionalProperties": False,
                            },
                        },
                    },
                    "required": ["exercise_name", "category", "sets"],
                    "additionalProperties": False,
                },
            },
            "notes": {"type": "string", "description": "Supuestos y conversiones que hiciste."},
        },
        "required": ["exercises", "notes"],
        "additionalProperties": False,
    },
}


def parse_workout(text: str, known_exercises: list[tuple[str, str]]) -> ParsedWorkout:
    if known_exercises:
        known = "\n".join(f"- {name} ({category})" for name, category in known_exercises)
    else:
        known = "(todavía no hay ninguno)"
    content = [
        {"type": "text", "text": f"Ejercicios conocidos:\n{known}"},
        {"type": "text", "text": f"Entrenamiento:\n{text}"},
    ]
    return _call_tool(WORKOUT_SYSTEM_PROMPT, content, REGISTER_WORKOUT_TOOL, ParsedWorkout)
