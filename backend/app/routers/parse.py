from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas import ParsedMeal
from app.services import ai_parser

router = APIRouter(prefix="/parse", tags=["parse"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # límite de Claude por imagen


@router.post("/meal", response_model=ParsedMeal)
def parse_meal(
    text: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
) -> ParsedMeal:
    text = (text or "").strip() or None
    if text is None and image is None:
        raise HTTPException(422, "Manda texto, una foto o ambos.")

    image_bytes = None
    if image is not None:
        if image.content_type not in ai_parser.ALLOWED_IMAGE_TYPES:
            raise HTTPException(415, f"Formato de imagen no soportado: {image.content_type}")
        # La foto solo vive en memoria durante este request; no se guarda.
        image_bytes = image.file.read()
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "La imagen pesa más de 5 MB.")

    try:
        return ai_parser.parse_meal(text, image_bytes, image.content_type if image else None)
    except ai_parser.AIParseError as e:
        raise HTTPException(502, str(e)) from e
