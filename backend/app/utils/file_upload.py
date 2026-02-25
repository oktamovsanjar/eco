"""File upload utilities - Rasm yuklash va qayta ishlash."""

import os
import uuid
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException
from app.config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
THUMBNAIL_SIZE = (300, 300)


def get_upload_dir() -> Path:
    """Upload papkasini olish va yaratish."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Thumbnails uchun papka
    thumbs_dir = upload_dir / "thumbnails"
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    return upload_dir


async def save_upload_file(file: UploadFile) -> dict:
    """Faylni saqlash va thumbnail yaratish."""
    # Fayl turini tekshirish
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fayl nomi topilmadi")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Ruxsat etilmagan fayl turi: {ext}. Ruxsat etilganlar: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Fayl hajmini tekshirish
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fayl hajmi {settings.MAX_FILE_SIZE // (1024*1024)}MB dan oshmasligi kerak"
        )

    # Unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = get_upload_dir()

    # Asosiy rasmni saqlash
    file_path = upload_dir / unique_name
    with open(file_path, "wb") as f:
        f.write(contents)

    # Thumbnail yaratish
    thumbnail_name = f"thumb_{unique_name}"
    thumbnail_path = upload_dir / "thumbnails" / thumbnail_name
    try:
        with Image.open(file_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(thumbnail_path, "JPEG", quality=85)
    except Exception:
        thumbnail_name = None

    return {
        "filename": unique_name,
        "original_filename": file.filename,
        "thumbnail": thumbnail_name,
        "file_size": len(contents),
        "image_url": f"/uploads/{unique_name}",
        "thumbnail_url": f"/uploads/thumbnails/{thumbnail_name}" if thumbnail_name else None
    }


async def delete_upload_file(filename: str):
    """Faylni o'chirish."""
    upload_dir = get_upload_dir()
    file_path = upload_dir / filename
    if file_path.exists():
        os.remove(file_path)

    # Thumbnail ham o'chirish
    thumb_path = upload_dir / "thumbnails" / f"thumb_{filename}"
    if thumb_path.exists():
        os.remove(thumb_path)
