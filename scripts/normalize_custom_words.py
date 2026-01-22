"""Normalize custom words by swapping entries that are in the wrong language."""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import LearningProfile, UserCustomWord, Word  # noqa: E402


LATIN_RE = re.compile(r"[A-Za-z]")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
SPLIT_RE = re.compile(r"[;,/]")


def normalize_text(value: str) -> str:
    return " ".join(value.strip().split()).lower()


def detect_lang(value: str) -> str | None:
    if not value:
        return None
    latin = len(LATIN_RE.findall(value))
    cyrillic = len(CYRILLIC_RE.findall(value))
    total = latin + cyrillic
    if total == 0:
        return None
    latin_ratio = latin / total
    cyrillic_ratio = cyrillic / total
    if latin_ratio >= 0.8 and cyrillic_ratio <= 0.2:
        return "en"
    if cyrillic_ratio >= 0.8 and latin_ratio <= 0.2:
        return "ru"
    return None


def build_translation_options(text: str) -> list[str]:
    options = []
    for part in SPLIT_RE.split(text or ""):
        cleaned = normalize_text(part)
        if cleaned:
            options.append(cleaned)
    return options


def merge_translations(existing: str, new_value: str) -> str:
    existing_options = build_translation_options(existing)
    new_options = build_translation_options(new_value)
    merged = []
    seen = set()
    for value in existing_options + new_options:
        if value in seen:
            continue
        seen.add(value)
        merged.append(value)
    return " / ".join(merged)


async def normalize_custom_words(profile_id: str | None, apply: bool) -> None:
    async with AsyncSessionLocal() as session:
        profile_stmt = select(LearningProfile)
        if profile_id:
            profile_stmt = profile_stmt.where(LearningProfile.id == profile_id)
        profiles_result = await session.execute(profile_stmt)
        profiles = profiles_result.scalars().all()

        if not profiles:
            print("No profiles found.")
            return

        total_candidates = 0
        total_swapped = 0
        total_merged = 0
        total_conflicts = 0

        for profile in profiles:
            if profile.native_lang not in {"ru", "en"} or profile.target_lang not in {"ru", "en"}:
                continue

            rows_result = await session.execute(
                select(UserCustomWord, Word.lemma)
                .join(Word, Word.id == UserCustomWord.word_id)
                .where(
                    UserCustomWord.profile_id == profile.id,
                    UserCustomWord.target_lang == profile.target_lang,
                    Word.lang == profile.native_lang,
                )
            )
            rows = rows_result.fetchall()

            for custom_word, lemma in rows:
                word_text = normalize_text(lemma)
                translation_text = normalize_text(custom_word.translation or "")
                word_lang = detect_lang(word_text)
                translation_lang = detect_lang(translation_text)
                if word_lang != profile.target_lang or translation_lang != profile.native_lang:
                    continue

                total_candidates += 1
                new_word = translation_text
                new_translation = word_text

                if apply:
                    await session.execute(
                        insert(Word)
                        .values(lemma=new_word, lang=profile.native_lang)
                        .on_conflict_do_nothing(index_elements=["lemma", "lang"])
                    )
                new_word_result = await session.execute(
                    select(Word.id).where(Word.lemma == new_word, Word.lang == profile.native_lang)
                )
                new_word_id = new_word_result.scalar_one_or_none()
                if new_word_id is None:
                    if not apply:
                        total_swapped += 1
                        continue
                    total_conflicts += 1
                    continue

                existing_result = await session.execute(
                    select(UserCustomWord).where(
                        UserCustomWord.profile_id == profile.id,
                        UserCustomWord.word_id == new_word_id,
                        UserCustomWord.target_lang == profile.target_lang,
                    )
                )
                existing = existing_result.scalar_one_or_none()

                if existing:
                    merged_translation = merge_translations(existing.translation, new_translation)
                    if merged_translation != existing.translation:
                        total_merged += 1
                        if apply:
                            existing.translation = merged_translation
                    total_conflicts += 1
                    if apply:
                        await session.delete(custom_word)
                    continue

                total_swapped += 1
                if apply:
                    await session.execute(
                        update(UserCustomWord)
                        .where(UserCustomWord.id == custom_word.id)
                        .values(word_id=new_word_id, translation=new_translation)
                    )

        if apply:
            await session.commit()

        print(f"Candidates: {total_candidates}")
        print(f"Swapped: {total_swapped}")
        print(f"Merged: {total_merged}")
        print(f"Conflicts: {total_conflicts}")
        if not apply:
            print("Dry run. Re-run with --apply to make changes.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize custom words by swapping wrong entries.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id to normalize.")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(normalize_custom_words(args.profile_id, args.apply))


if __name__ == "__main__":
    main()
