"""Fix word language direction by remapping user data to target-language words."""

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
from app.models import (  # noqa: E402
    LearningProfile,
    ReviewEvent,
    Translation,
    UserCustomWord,
    UserWord,
    Word,
)


STATUS_PRIORITY = {"known": 3, "learned": 2, "new": 1}
SPLIT_RE = re.compile(r"[;,/]")


def status_rank(value: str | None) -> int:
    if not value:
        return 1
    return STATUS_PRIORITY.get(value, 1)


def is_better_progress(source: UserWord, target: UserWord) -> bool:
    if status_rank(source.status) != status_rank(target.status):
        return status_rank(source.status) > status_rank(target.status)
    if (source.repetitions or 0) != (target.repetitions or 0):
        return (source.repetitions or 0) > (target.repetitions or 0)
    if (source.stage or 0) != (target.stage or 0):
        return (source.stage or 0) > (target.stage or 0)
    return False


def copy_progress(target: UserWord, source: UserWord) -> None:
    target.status = source.status
    target.stage = source.stage
    target.repetitions = source.repetitions
    target.interval_days = source.interval_days
    target.ease_factor = source.ease_factor
    target.learned_at = source.learned_at
    target.last_review_at = source.last_review_at
    target.next_review_at = source.next_review_at
    target.correct_streak = source.correct_streak
    target.wrong_streak = source.wrong_streak


def normalize_text(value: str) -> str:
    return " ".join(value.strip().split()).lower()


def build_translation_options(text: str) -> list[str]:
    options = []
    for part in SPLIT_RE.split(text or ""):
        cleaned = normalize_text(part)
        if cleaned:
            options.append(cleaned)
    return options


def pick_primary_translation(values: list[str]) -> str | None:
    for text in values:
        for part in SPLIT_RE.split(text or ""):
            cleaned = normalize_text(part)
            if cleaned:
                return cleaned
    return None


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


def chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


async def fetch_target_word_map(session, lemmas: list[str], lang: str) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for batch in chunked(lemmas, 1000):
        result = await session.execute(
            select(Word.id, Word.lemma).where(Word.lang == lang, Word.lemma.in_(batch))
        )
        for word_id, lemma in result.fetchall():
            mapping[lemma] = word_id
    return mapping


async def ensure_words(session, lemmas: list[str], lang: str) -> None:
    filtered = [lemma for lemma in lemmas if 0 < len(lemma) <= 255]
    for batch in chunked(filtered, 1000):
        rows = [{"lemma": lemma, "lang": lang} for lemma in batch]
        stmt = insert(Word).values(rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["lemma", "lang"])
        await session.execute(stmt)


async def migrate_profile(profile: LearningProfile, apply: bool) -> None:
    if profile.native_lang == profile.target_lang:
        return

    async with AsyncSessionLocal() as session:
        user_rows = (
            await session.execute(
                select(UserWord, Word.lemma, Word.lang)
                .join(Word, Word.id == UserWord.word_id)
                .where(UserWord.profile_id == profile.id)
            )
        ).all()
        custom_rows = (
            await session.execute(
                select(UserCustomWord, Word.lemma, Word.lang)
                .join(Word, Word.id == UserCustomWord.word_id)
                .where(UserCustomWord.profile_id == profile.id)
            )
        ).all()

        lemmas_needed = {
            row.lemma for row in user_rows if row.lang != profile.target_lang
        } | {row.lemma for row in custom_rows if row.lang != profile.target_lang}
        lemmas_list = sorted(lemmas_needed)

        target_word_map = await fetch_target_word_map(session, lemmas_list, profile.target_lang)
        reverse_translation_map: dict[str, int] = {}
        if lemmas_list:
            reverse_result = await session.execute(
                select(Translation.translation, Translation.word_id)
                .select_from(Translation)
                .join(Word, Word.id == Translation.word_id)
                .where(
                    Translation.target_lang == profile.native_lang,
                    Translation.translation.in_(lemmas_list),
                    Word.lang == profile.target_lang,
                )
            )
            for translation, word_id in reverse_result.fetchall():
                key = normalize_text(str(translation or ""))
                if not key:
                    continue
                reverse_translation_map.setdefault(key, word_id)

        source_word_ids = [row.UserWord.word_id for row in user_rows if row.lang != profile.target_lang]
        translation_map: dict[int, list[str]] = {}
        if source_word_ids:
            translations_result = await session.execute(
                select(Translation.word_id, Translation.translation)
                .where(
                    Translation.word_id.in_(source_word_ids),
                    Translation.target_lang == profile.target_lang,
                )
                .order_by(Translation.word_id, Translation.id)
            )
            for word_id, translation in translations_result.fetchall():
                if translation:
                    translation_map.setdefault(word_id, []).append(str(translation))

        custom_translation_map: dict[int, list[str]] = {}
        if source_word_ids:
            custom_translation_result = await session.execute(
                select(UserCustomWord.word_id, UserCustomWord.translation)
                .where(
                    UserCustomWord.profile_id == profile.id,
                    UserCustomWord.word_id.in_(source_word_ids),
                )
                .order_by(UserCustomWord.word_id, UserCustomWord.created_at)
            )
            for word_id, translation in custom_translation_result.fetchall():
                if translation:
                    custom_translation_map.setdefault(word_id, []).append(str(translation))

        if apply:
            missing_lemmas = [
                row.lemma
                for row in custom_rows
                if row.lang != profile.target_lang and row.lemma not in target_word_map
            ]
            translation_lemmas = []
            for word_id in source_word_ids:
                primary = pick_primary_translation(translation_map.get(word_id, []))
                if not primary:
                    primary = pick_primary_translation(custom_translation_map.get(word_id, []))
                if primary and primary not in target_word_map:
                    translation_lemmas.append(primary)
            ensure_lemmas = sorted(set(missing_lemmas + translation_lemmas))
            if ensure_lemmas:
                await ensure_words(session, ensure_lemmas, profile.target_lang)
                target_word_map = await fetch_target_word_map(
                    session, lemmas_list + ensure_lemmas, profile.target_lang
                )

        moved_user = 0
        merged_user = 0
        missing_user = 0
        moved_custom = 0
        merged_custom = 0
        missing_custom = 0

        user_by_word_id = {row.UserWord.word_id: row.UserWord for row in user_rows}
        moves: list[tuple[int, int]] = []
        deletes: list[UserWord] = []
        event_map: dict[int, int] = {}

        for row in user_rows:
            user_word, lemma, word_lang = row.UserWord, row.lemma, row.lang
            if word_lang == profile.target_lang:
                continue
            target_id = target_word_map.get(lemma)
            if not target_id:
                primary = pick_primary_translation(translation_map.get(user_word.word_id, []))
                if not primary:
                    primary = pick_primary_translation(custom_translation_map.get(user_word.word_id, []))
                if primary:
                    target_id = target_word_map.get(primary)
            if not target_id:
                target_id = reverse_translation_map.get(normalize_text(lemma))
            if not target_id:
                missing_user += 1
                continue
            if target_id == user_word.word_id:
                continue
            existing = user_by_word_id.get(target_id)
            if existing:
                if is_better_progress(user_word, existing):
                    copy_progress(existing, user_word)
                deletes.append(user_word)
                merged_user += 1
            else:
                moves.append((user_word.word_id, target_id))
                user_by_word_id[target_id] = user_word
                moved_user += 1
            event_map[user_word.word_id] = target_id

        if apply:
            for old_id, new_id in moves:
                await session.execute(
                    update(UserWord)
                    .where(UserWord.profile_id == profile.id, UserWord.word_id == old_id)
                    .values(word_id=new_id)
                )
            for row in deletes:
                await session.delete(row)
            for old_id, new_id in event_map.items():
                await session.execute(
                    update(ReviewEvent)
                    .where(ReviewEvent.profile_id == profile.id, ReviewEvent.word_id == old_id)
                    .values(word_id=new_id)
                )

        custom_by_key = {(row.UserCustomWord.word_id, row.UserCustomWord.target_lang): row.UserCustomWord for row in custom_rows}

        for row in custom_rows:
            custom_word, lemma, word_lang = row.UserCustomWord, row.lemma, row.lang
            target_word_id = (
                custom_word.word_id
                if word_lang == profile.target_lang
                else target_word_map.get(lemma)
            )
            if not target_word_id:
                primary = pick_primary_translation([custom_word.translation or ""])
                if primary:
                    target_word_id = target_word_map.get(primary)
            if not target_word_id:
                missing_custom += 1
                continue

            new_target_lang = profile.native_lang
            if (
                custom_word.word_id == target_word_id
                and custom_word.target_lang == new_target_lang
            ):
                continue

            existing = custom_by_key.get((target_word_id, new_target_lang))
            if existing and existing.id != custom_word.id:
                merged_translation = merge_translations(
                    existing.translation or "", custom_word.translation or ""
                )
                if apply and merged_translation != existing.translation:
                    existing.translation = merged_translation
                if apply:
                    await session.delete(custom_word)
                merged_custom += 1
                continue

            if apply:
                custom_word.word_id = target_word_id
                custom_word.target_lang = new_target_lang
                session.add(custom_word)
            moved_custom += 1
            custom_by_key[(target_word_id, new_target_lang)] = custom_word

        if apply:
            await session.commit()

        print(
            "Profile",
            profile.id,
            f"{profile.native_lang}->{profile.target_lang}",
            "| user moved:",
            moved_user,
            "merged:",
            merged_user,
            "missing:",
            missing_user,
            "| custom moved:",
            moved_custom,
            "merged:",
            merged_custom,
            "missing:",
            missing_custom,
        )


async def run_migration(profile_id: str | None, apply: bool) -> None:
    async with AsyncSessionLocal() as session:
        stmt = select(LearningProfile)
        if profile_id:
            stmt = stmt.where(LearningProfile.id == profile_id)
        profiles_result = await session.execute(stmt)
        profiles = profiles_result.scalars().all()

    if not profiles:
        print("No profiles found.")
        return

    for profile in profiles:
        await migrate_profile(profile, apply)

    if not apply:
        print("Dry run. Re-run with --apply to make changes.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fix word language direction for user data.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id to migrate.")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run_migration(args.profile_id, args.apply))


if __name__ == "__main__":
    main()
