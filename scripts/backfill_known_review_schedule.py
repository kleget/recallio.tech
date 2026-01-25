"""Schedule reviews for known/learned words missing next_review_at."""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import and_, func, select, update

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import LearningProfile, User, UserProfile, UserWord  # noqa: E402
from app.api.study import REVIEW_INTERVALS_DAYS  # noqa: E402


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
        first_interval = REVIEW_INTERVALS_DAYS[0]
        now = datetime.now(timezone.utc)
        next_review_at = now + timedelta(days=first_interval)

        base_filter = and_(
            UserWord.profile_id == profile.id,
            UserWord.status.in_(("known", "learned")),
            UserWord.next_review_at.is_(None),
        )

        missing_result = await session.execute(
            select(UserWord.word_id).where(base_filter)
        )
        word_ids = [row[0] for row in missing_result.fetchall()]
        if not word_ids:
            print(f"Profile {profile.id}: no missing schedules.")
            return

        print(f"Profile {profile.id}: scheduling {len(word_ids)} words.")

        if not apply:
            return

        stmt = (
            update(UserWord)
            .where(base_filter)
            .values(
                learned_at=func.coalesce(UserWord.learned_at, now),
                last_review_at=func.coalesce(UserWord.last_review_at, now),
                next_review_at=next_review_at,
                interval_days=func.coalesce(func.nullif(UserWord.interval_days, 0), first_interval),
                repetitions=func.coalesce(UserWord.repetitions, 0),
                stage=func.coalesce(UserWord.stage, 0),
                ease_factor=func.coalesce(UserWord.ease_factor, 2.5),
                correct_streak=func.coalesce(UserWord.correct_streak, 0),
                wrong_streak=func.coalesce(UserWord.wrong_streak, 0),
            )
        )
        result = await session.execute(stmt)
        await session.commit()
        print(f"Profile {profile.id}: updated={int(result.rowcount or 0)}")


async def run(profile_id: str | None, email: str | None, apply: bool) -> None:
    profiles = await resolve_profiles(profile_id, email)
    if not profiles:
        print("No profiles found.")
        return
    for profile in profiles:
        await backfill_profile(profile, apply)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill missing review schedules.")
    parser.add_argument("--profile-id", default=None, help="Learning profile id.")
    parser.add_argument("--email", default=None, help="User email (uses active profile).")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.profile_id, args.email, args.apply))


if __name__ == "__main__":
    main()
