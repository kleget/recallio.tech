"""Auto-fix language consistency issues for profiles and corpora."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import exists, select

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
SCRIPTS_DIR = BASE_DIR / "scripts"
sys.path.append(str(API_DIR))
sys.path.append(str(SCRIPTS_DIR))

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

from migrate_corpus_stats_language import run as run_corpus_migration  # noqa: E402
from migrate_language_direction import run_migration  # noqa: E402


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


async def profiles_with_word_mismatch(session) -> set[str]:
    stmt = (
        select(UserWord.profile_id)
        .join(LearningProfile, LearningProfile.id == UserWord.profile_id)
        .join(Word, Word.id == UserWord.word_id)
        .where(Word.lang != LearningProfile.target_lang)
        .distinct()
    )
    rows = (await session.execute(stmt)).scalars().all()
    return {str(item) for item in rows}


async def profiles_with_custom_mismatch(session) -> set[str]:
    stmt = (
        select(UserCustomWord.profile_id)
        .join(LearningProfile, LearningProfile.id == UserCustomWord.profile_id)
        .join(Word, Word.id == UserCustomWord.word_id)
        .where(
            Word.lang != LearningProfile.target_lang,
        )
        .distinct()
    )
    rows = (await session.execute(stmt)).scalars().all()
    return {str(item) for item in rows}


async def corpora_missing_target_lang(
    session, profile_ids: set[str]
) -> list[tuple[str, str, str, str, str]]:
    if not profile_ids:
        return []

    has_target = exists(
        select(1)
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(
            CorpusWordStat.corpus_id == UserCorpus.corpus_id,
            Word.lang == LearningProfile.target_lang,
        )
    )
    has_source = exists(
        select(1)
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(
            CorpusWordStat.corpus_id == UserCorpus.corpus_id,
            Word.lang == LearningProfile.native_lang,
        )
    )
    stmt = (
        select(
            LearningProfile.id,
            LearningProfile.native_lang,
            LearningProfile.target_lang,
            UserCorpus.corpus_id,
            Corpus.slug,
        )
        .select_from(UserCorpus)
        .join(LearningProfile, LearningProfile.id == UserCorpus.profile_id)
        .join(Corpus, Corpus.id == UserCorpus.corpus_id)
        .where(
            UserCorpus.enabled.is_(True),
            UserCorpus.profile_id.in_(profile_ids),
            has_source,
            ~has_target,
        )
    )
    return (await session.execute(stmt)).all()


async def run(profile_id: str | None, email: str | None, apply: bool) -> None:
    profiles = await resolve_profiles(profile_id, email)
    if not profiles:
        print("No profiles found.")
        return

    profile_ids = {str(profile.id) for profile in profiles}

    async with AsyncSessionLocal() as session:
        mismatch_profiles = await profiles_with_word_mismatch(session)
        mismatch_profiles |= await profiles_with_custom_mismatch(session)
        mismatch_profiles &= profile_ids

        corpora_rows = await corpora_missing_target_lang(session, profile_ids)

    if mismatch_profiles:
        print(f"Fixing profiles with mismatched words: {len(mismatch_profiles)}")
        for pid in mismatch_profiles:
            await run_migration(pid, apply)
    else:
        print("No profile word mismatches detected.")

    if corpora_rows:
        seen = set()
        print("Fixing corpora missing target language stats:")
        for profile_id, native_lang, target_lang, _corpus_id, slug in corpora_rows:
            key = (slug, native_lang, target_lang)
            if key in seen:
                continue
            seen.add(key)
            print(f"  {slug}: {native_lang} -> {target_lang}")
            await run_corpus_migration(native_lang, target_lang, slug, apply)
    else:
        print("No corpora fixes needed.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Auto-fix language consistency issues.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id.")
    parser.add_argument("--email", default=None, help="User email (uses active profile).")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.profile_id, args.email, args.apply))


if __name__ == "__main__":
    main()
