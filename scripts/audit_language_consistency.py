"""Audit language consistency for profiles, custom words, and corpora."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import func, select

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Corpus,
    CorpusWordStat,
    LearningProfile,
    User,
    UserCorpus,
    UserCustomWord,
    UserProfile,
    UserWord,
    Word,
)


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


async def audit_profile(profile: LearningProfile) -> None:
    async with AsyncSessionLocal() as session:
        user_lang_counts = (
            await session.execute(
                select(Word.lang, func.count())
                .select_from(UserWord)
                .join(Word, Word.id == UserWord.word_id)
                .where(UserWord.profile_id == profile.id)
                .group_by(Word.lang)
            )
        ).all()

        custom_lang_counts = (
            await session.execute(
                select(Word.lang, UserCustomWord.target_lang, func.count())
                .select_from(UserCustomWord)
                .join(Word, Word.id == UserCustomWord.word_id)
                .where(UserCustomWord.profile_id == profile.id)
                .group_by(Word.lang, UserCustomWord.target_lang)
            )
        ).all()

        print(f"Profile {profile.id} {profile.native_lang}->{profile.target_lang}")
        if user_lang_counts:
            print("  user_words by lang:")
            for lang, count in user_lang_counts:
                marker = "" if lang == profile.target_lang else " (!) "
                print(f"    {lang}: {count}{marker}")
        else:
            print("  user_words: empty")

        if custom_lang_counts:
            print("  custom_words by word.lang / target_lang:")
            for lang, target_lang, count in custom_lang_counts:
                ok = lang == profile.target_lang and target_lang == profile.native_lang
                marker = "" if ok else " (!) "
                print(f"    {lang}/{target_lang}: {count}{marker}")
        else:
            print("  custom_words: empty")

        corpora_rows = (
            await session.execute(
                select(UserCorpus.corpus_id, Corpus.slug)
                .join(Corpus, Corpus.id == UserCorpus.corpus_id)
                .where(UserCorpus.profile_id == profile.id, UserCorpus.enabled.is_(True))
            )
        ).all()
        if not corpora_rows:
            print("  corpora: none enabled")
            return

        print("  corpora language coverage:")
        for corpus_id, slug in corpora_rows:
            lang_counts = (
                await session.execute(
                    select(Word.lang, func.count())
                    .select_from(CorpusWordStat)
                    .join(Word, Word.id == CorpusWordStat.word_id)
                    .where(CorpusWordStat.corpus_id == corpus_id)
                    .group_by(Word.lang)
                )
            ).all()
            lang_map = {lang: count for lang, count in lang_counts}
            marker = "" if profile.target_lang in lang_map else " (!) "
            print(
                f"    {slug}: {lang_map.get('en', 0)} en, {lang_map.get('ru', 0)} ru{marker}"
            )


async def run(profile_id: str | None, email: str | None) -> None:
    profiles = await resolve_profiles(profile_id, email)
    if not profiles:
        print("No profiles found.")
        return
    for profile in profiles:
        await audit_profile(profile)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit language consistency.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id.")
    parser.add_argument("--email", default=None, help="User email (uses active profile).")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.profile_id, args.email))


if __name__ == "__main__":
    main()
