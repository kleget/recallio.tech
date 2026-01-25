"""Backfill user_word_translations for learned words."""

from __future__ import annotations

import argparse
import asyncio
import sys
from collections import defaultdict
from pathlib import Path

from sqlalchemy import exists, select
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
SCRIPTS_DIR = BASE_DIR / "scripts"
sys.path.append(str(API_DIR))
sys.path.append(str(SCRIPTS_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    LearningProfile,
    Translation,
    User,
    UserCustomWord,
    UserProfile,
    UserWord,
    UserWordTranslation,
)


def chunked(items: list[int], size: int = 500) -> list[list[int]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


async def resolve_profiles(profile_id: str | None, email: str | None) -> list[LearningProfile]:
    async with AsyncSessionLocal() as session:
        if profile_id:
            result = await session.execute(
                select(LearningProfile).where(LearningProfile.id == profile_id)
            )
            profile = result.scalar_one_or_none()
            return [profile] if profile else []

        if email:
            user_result = await session.execute(select(User).where(User.email == email))
            user = user_result.scalar_one_or_none()
            if not user:
                return []
            profile_result = await session.execute(
                select(UserProfile.active_profile_id).where(UserProfile.user_id == user.id)
            )
            active_profile_id = profile_result.scalar_one_or_none()
            if not active_profile_id:
                return []
            profile_result = await session.execute(
                select(LearningProfile).where(LearningProfile.id == active_profile_id)
            )
            profile = profile_result.scalar_one_or_none()
            return [profile] if profile else []

        result = await session.execute(select(LearningProfile))
        return result.scalars().all()


async def backfill_profile(profile: LearningProfile, apply: bool) -> None:
    async with AsyncSessionLocal() as session:
        target_lang = profile.native_lang
        missing_stmt = (
            select(UserWord.word_id)
            .where(UserWord.profile_id == profile.id)
            .where(
                ~exists(
                    select(1).where(
                        UserWordTranslation.profile_id == profile.id,
                        UserWordTranslation.word_id == UserWord.word_id,
                        UserWordTranslation.target_lang == target_lang,
                    )
                )
            )
        )
        word_rows = await session.execute(missing_stmt)
        word_ids = [row[0] for row in word_rows.fetchall()]
        if not word_ids:
            print(f"Profile {profile.id}: no missing translations.")
            return

        translation_map: dict[int, list[str]] = defaultdict(list)
        for chunk in chunked(word_ids):
            custom_rows = await session.execute(
                select(UserCustomWord.word_id, UserCustomWord.translation).where(
                    UserCustomWord.profile_id == profile.id,
                    UserCustomWord.target_lang == target_lang,
                    UserCustomWord.word_id.in_(chunk),
                )
            )
            for word_id, translation in custom_rows.fetchall():
                if translation:
                    translation_map[word_id].append(translation)

            global_rows = await session.execute(
                select(Translation.word_id, Translation.translation).where(
                    Translation.word_id.in_(chunk),
                    Translation.target_lang == target_lang,
                )
            )
            for word_id, translation in global_rows.fetchall():
                if translation:
                    translation_map[word_id].append(translation)

        rows: list[dict] = []
        missing_without_any = 0
        for word_id in word_ids:
            translations = translation_map.get(word_id, [])
            if not translations:
                missing_without_any += 1
                continue
            for value in translations:
                rows.append(
                    {
                        "profile_id": profile.id,
                        "user_id": profile.user_id,
                        "word_id": word_id,
                        "target_lang": target_lang,
                        "translation": value,
                        "source": "backfill",
                    }
                )

        print(
            f"Profile {profile.id}: words missing={len(word_ids)} "
            f"rows={len(rows)} without_translation={missing_without_any}"
        )

        if not apply or not rows:
            return

        stmt = insert(UserWordTranslation).values(rows)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["profile_id", "word_id", "target_lang", "translation"]
        )
        result = await session.execute(stmt)
        await session.commit()
        print(f"Profile {profile.id}: inserted={int(result.rowcount or 0)}")


async def run(profile_id: str | None, email: str | None, apply: bool) -> None:
    profiles = await resolve_profiles(profile_id, email)
    if not profiles:
        print("No profiles found.")
        return
    for profile in profiles:
        await backfill_profile(profile, apply)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill user word translations.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id.")
    parser.add_argument("--email", default=None, help="User email (uses active profile).")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.profile_id, args.email, args.apply))


if __name__ == "__main__":
    main()
