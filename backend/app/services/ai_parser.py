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
from app.schemas import ParsedMeal

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
- Separa la comida en items individuales (por ejemplo tortillas, guisado y frijoles por separado), \
nunca un solo item como "desayuno".
- Si algo es ambiguo, elige la porción típica, baja `confidence` y explica el supuesto en `notes`.
- Considera el aceite o la grasa de cocción cuando el método lo implique (frito, guisado).
- Si hay foto y texto, el texto tiene prioridad sobre lo que veas en la foto.
- Infiere `meal_type` solo si el texto lo indica explícitamente ("desayuné", "en la cena"...); \
si no, usa null.
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
