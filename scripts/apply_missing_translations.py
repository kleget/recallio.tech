"""Apply missing translations from a CSV and move progress to target-language words."""

from __future__ import annotations

import argparse
import asyncio
import csv
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
    User,
    UserProfile,
    UserWord,
    Word,
)


STATUS_PRIORITY = {"known": 3, "learned": 2, "new": 1}


def normalize_text(value: str) -> str:
    return " ".join(value.strip().split()).lower()


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


def parse_csv(path: Path) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        first = True
        for row in reader:
            if not row:
                continue
            if first:
                first = False
                header = [cell.strip().lower() for cell in row]
                if header and header[0] in {"lemma", "word", "en"}:
                    if len(header) == 1 or (len(header) > 1 and not header[1]):
                        continue
                    if len(header) > 1 and header[1] in {"ru", "translation", "translations"}:
                        continue
            if len(row) < 2:
                continue
            left = normalize_text(row[0])
            right = normalize_text(row[1])
            if not left or not right:
                continue
            pairs.append((left, right))
    return pairs


def chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


async def ensure_words(session, lemmas: list[str], lang: str) -> None:
    filtered = [lemma for lemma in lemmas if 0 < len(lemma) <= 255]
    for batch in chunked(filtered, 1000):
        rows = [{"lemma": lemma, "lang": lang} for lemma in batch]
        stmt = insert(Word).values(rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["lemma", "lang"])
        await session.execute(stmt)


async def fetch_word_map(session, lemmas: list[str], lang: str) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for batch in chunked(lemmas, 1000):
        result = await session.execute(
            select(Word.id, Word.lemma).where(Word.lang == lang, Word.lemma.in_(batch))
        )
        for word_id, lemma in result.fetchall():
            mapping[lemma] = word_id
    return mapping


async def resolve_profile(session, profile_id: str | None, email: str | None) -> LearningProfile:
    if profile_id:
        result = await session.execute(
            select(LearningProfile).where(LearningProfile.id == profile_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise RuntimeError(f"Profile not found: {profile_id}")
        return profile

    if not email:
        raise RuntimeError("Provide --profile-id or --email.")

    user_result = await session.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise RuntimeError(f"User not found: {email}")

    profile_result = await session.execute(
        select(UserProfile.active_profile_id).where(UserProfile.user_id == user.id)
    )
    active_profile_id = profile_result.scalar_one_or_none()
    if not active_profile_id:
        raise RuntimeError("Active profile not set for user.")

    profile_result = await session.execute(
        select(LearningProfile).where(LearningProfile.id == active_profile_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise RuntimeError("Active profile not found.")
    return profile


async def apply_missing_translations(
    csv_path: Path,
    profile_id: str | None,
    email: str | None,
    apply: bool,
) -> None:
    pairs = parse_csv(csv_path)
    if not pairs:
        print("No valid rows in CSV.")
        return

    async with AsyncSessionLocal() as session:
        profile = await resolve_profile(session, profile_id, email)

        en_lemmas = sorted({en for en, _ru in pairs})
        ru_lemmas = sorted({ru for _en, ru in pairs})

        if apply:
            await ensure_words(session, en_lemmas, profile.target_lang)

        en_map = await fetch_word_map(session, en_lemmas, profile.target_lang)
        ru_map = await fetch_word_map(session, ru_lemmas, profile.native_lang)

        moved = 0
        merged = 0
        missing = 0

        for en_lemma, ru_lemma in pairs:
            en_id = en_map.get(en_lemma)
            ru_id = ru_map.get(ru_lemma)
            if not en_id or not ru_id:
                missing += 1
                continue

            if apply:
                await session.execute(
                    insert(Translation)
                    .values(
                        word_id=en_id,
                        target_lang=profile.native_lang,
                        translation=ru_lemma,
                        source="csv",
                    )
                    .on_conflict_do_nothing(index_elements=["word_id", "target_lang", "translation"])
                )

            user_result = await session.execute(
                select(UserWord)
                .where(UserWord.profile_id == profile.id, UserWord.word_id == ru_id)
            )
            ru_user = user_result.scalar_one_or_none()
            if not ru_user:
                continue

            target_result = await session.execute(
                select(UserWord)
                .where(UserWord.profile_id == profile.id, UserWord.word_id == en_id)
            )
            en_user = target_result.scalar_one_or_none()

            if not apply:
                moved += 1
                continue

            if en_user:
                if is_better_progress(ru_user, en_user):
                    copy_progress(en_user, ru_user)
                await session.delete(ru_user)
                merged += 1
            else:
                await session.execute(
                    update(UserWord)
                    .where(UserWord.profile_id == profile.id, UserWord.word_id == ru_id)
                    .values(word_id=en_id)
                )
                moved += 1

            await session.execute(
                update(ReviewEvent)
                .where(ReviewEvent.profile_id == profile.id, ReviewEvent.word_id == ru_id)
                .values(word_id=en_id)
            )

        if apply:
            await session.commit()

    print(f"Moved: {moved}, merged: {merged}, missing pairs: {missing}")
    if not apply:
        print("Dry run. Re-run with --apply to make changes.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply missing translations from CSV.")
    parser.add_argument("--csv", type=Path, default=Path("result.csv"), help="CSV file path.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id.")
    parser.add_argument("--email", default=None, help="User email (uses active profile).")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(apply_missing_translations(args.csv, args.profile_id, args.email, args.apply))


if __name__ == "__main__":
    main()
