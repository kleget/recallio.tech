from __future__ import annotations

import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.audit import log_audit_event
from app.core.config import MAX_AVATAR_BYTES, MEDIA_DIR, MEDIA_URL
from app.db.session import get_db
from app.models import User, UserProfile
from app.schemas.profile import ProfileAvatarOut, ProfileOut, ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["profile"])

LANG_CODES = {"ru", "en"}
THEMES = {"light", "dark"}
ALLOWED_AVATAR_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
}
AVATAR_DIR = MEDIA_DIR / "avatars"


def normalize_lang(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().lower()
    if value not in LANG_CODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interface language")
    return value


def normalize_theme(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().lower()
    if value not in THEMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid theme")
    return value


def resolve_avatar_path(avatar_url: str) -> Path | None:
    if not avatar_url:
        return None
    if not avatar_url.startswith(MEDIA_URL):
        return None
    relative = avatar_url[len(MEDIA_URL) :].lstrip("/")
    return MEDIA_DIR / relative


@router.get("", response_model=ProfileOut)
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id, interface_lang="ru", theme="light")
        db.add(profile)
        await db.commit()
    return ProfileOut(interface_lang=profile.interface_lang, theme=profile.theme or "light")


@router.put("", response_model=ProfileOut)
async def update_profile(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    interface_lang = normalize_lang(data.interface_lang)
    theme = normalize_theme(data.theme)
    if interface_lang is None and theme is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update")

    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id, interface_lang="ru", theme="light")
        db.add(profile)

    if interface_lang:
        profile.interface_lang = interface_lang
    if theme:
        profile.theme = theme

    await db.commit()
    return ProfileOut(interface_lang=profile.interface_lang, theme=profile.theme or "light")


@router.delete("")
async def delete_profile(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await log_audit_event("auth.delete", user_id=user.id, request=request, db=db)
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()
    return {"deleted": True}


@router.post("/avatar", response_model=ProfileAvatarOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileAvatarOut:
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image type")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is too large")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    ext = ALLOWED_AVATAR_TYPES[file.content_type]
    filename = f"{user.id.hex}_{int(time.time())}.{ext}"
    path = AVATAR_DIR / filename
    path.write_bytes(contents)

    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user.id, interface_lang="ru", theme="light")
        db.add(profile)

    old_path = resolve_avatar_path(profile.avatar_url or "")
    if old_path and old_path.exists():
        old_path.unlink(missing_ok=True)

    profile.avatar_url = f"{MEDIA_URL}/avatars/{filename}"
    await db.commit()

    return ProfileAvatarOut(avatar_url=profile.avatar_url)
