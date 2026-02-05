from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.api.study import fetch_user_translation_map, load_profile_settings
from app.db.session import get_db
from app.models import Corpus, CorpusEntry, CorpusEntryTerm, ReviewEvent, User, UserCustomWord, UserWord, WeakWordsCache, Word
from app.schemas.stats import (
    ReviewPlanItemOut,
    ReviewPlanOut,
    ReviewPlanSourceOut,
    WeakWordOut,
    WeakWordsOut,
)

router = APIRouter(tags=["stats"])
DEFAULT_LIMIT = 20
CACHE_TTL_SECONDS = 120


def resolve_corpus_name(name: str | None, name_ru: str | None, name_en: str | None, ui_lang: str) -> str:
    if ui_lang == "ru" and name_ru:
        return name_ru
    if ui_lang == "en" and name_en:
        return name_en
    return name or ""


@router.get("/stats/weak-words", response_model=WeakWordsOut)
async def weak_words(
    limit: int = DEFAULT_LIMIT,
    refresh: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WeakWordsOut:
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid limit")

    profile, _settings = await load_profile_settings(user.id, db)

    now = datetime.now(timezone.utc)
    if not refresh and limit == DEFAULT_LIMIT:
        cache_result = await db.execute(
            select(WeakWordsCache).where(WeakWordsCache.profile_id == profile.id)
        )
        cache = cache_result.scalar_one_or_none()
        if cache and cache.updated_at and now - cache.updated_at <= timedelta(seconds=CACHE_TTL_SECONDS):
            return WeakWordsOut(**cache.data)

    wrong_count_expr = func.sum(case((ReviewEvent.result == "wrong", 1), else_=0))
    correct_count_expr = func.sum(case((ReviewEvent.result == "correct", 1), else_=0))
    stats_subq = (
        select(
            ReviewEvent.word_id.label("word_id"),
            wrong_count_expr.label("wrong_count"),
            correct_count_expr.label("correct_count"),
        )
        .where(ReviewEvent.profile_id == profile.id)
        .group_by(ReviewEvent.word_id)
        .having(wrong_count_expr > 0)
        .subquery()
    )

    total_result = await db.execute(
        select(func.count())
        .select_from(stats_subq)
        .join(Word, Word.id == stats_subq.c.word_id)
        .join(
            UserWord,
            and_(UserWord.profile_id == profile.id, UserWord.word_id == stats_subq.c.word_id),
        )
        .where(Word.lang == profile.target_lang)
    )
    total_count = int(total_result.scalar_one() or 0)

    stmt = (
        select(
            stats_subq.c.word_id,
            stats_subq.c.wrong_count,
            stats_subq.c.correct_count,
            Word.lemma,
            UserWord.learned_at,
            UserWord.next_review_at,
        )
        .select_from(stats_subq)
        .join(Word, Word.id == stats_subq.c.word_id)
        .join(
            UserWord,
            and_(UserWord.profile_id == profile.id, UserWord.word_id == stats_subq.c.word_id),
        )
        .where(Word.lang == profile.target_lang)
        .order_by(stats_subq.c.wrong_count.desc(), stats_subq.c.correct_count.asc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    word_ids = [row.word_id for row in rows]
    translation_map = await fetch_user_translation_map(profile.id, word_ids, profile.native_lang, db)

    results = []
    for row in rows:
        attempts = (row.correct_count or 0) + (row.wrong_count or 0)
        accuracy = round((row.correct_count or 0) / attempts, 3) if attempts else 0.0
        results.append(
            WeakWordOut(
                word_id=row.word_id,
                word=row.lemma,
                translations=translation_map.get(row.word_id, []),
                wrong_count=int(row.wrong_count or 0),
                correct_count=int(row.correct_count or 0),
                accuracy=accuracy,
                learned_at=row.learned_at,
                next_review_at=row.next_review_at,
            )
        )

    payload = WeakWordsOut(total=total_count, items=results)
    if limit == DEFAULT_LIMIT:
        cache_result = await db.execute(
            select(WeakWordsCache).where(WeakWordsCache.profile_id == profile.id)
        )
        cache = cache_result.scalar_one_or_none()
        data = jsonable_encoder(payload)
        if cache:
            cache.data = data
            cache.updated_at = now
        else:
            db.add(WeakWordsCache(profile_id=profile.id, data=data, updated_at=now))
        await db.commit()
    return payload


@router.get("/stats/review-plan", response_model=ReviewPlanOut)
async def review_plan(
    limit: int | None = None,
    ui_lang: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewPlanOut:
    if limit is not None and (limit < 1 or limit > 5000):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid limit")

    profile, _settings = await load_profile_settings(user.id, db)
    ui_lang = (ui_lang or "ru").lower()
    if ui_lang not in {"ru", "en"}:
        ui_lang = "ru"

    base_stmt = (
        select(
            UserWord.word_id,
            Word.lemma,
            UserWord.learned_at,
            UserWord.next_review_at,
            UserWord.stage,
        )
        .select_from(UserWord)
        .join(Word, Word.id == UserWord.word_id)
        .where(
            UserWord.profile_id == profile.id,
            UserWord.next_review_at.is_not(None),
            Word.lang == profile.target_lang,
        )
        .order_by(UserWord.next_review_at.asc(), Word.lemma.asc())
    )
    count_stmt = (
        select(func.count())
        .select_from(UserWord)
        .join(Word, Word.id == UserWord.word_id)
        .where(
            UserWord.profile_id == profile.id,
            UserWord.next_review_at.is_not(None),
            Word.lang == profile.target_lang,
        )
    )
    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar() or 0)

    stmt = base_stmt
    if limit:
        stmt = stmt.limit(limit)

    rows = (await db.execute(stmt)).all()
    word_ids = [row.word_id for row in rows]
    translation_map = await fetch_user_translation_map(profile.id, word_ids, profile.native_lang, db)

    sources_map: dict[int, list[ReviewPlanSourceOut]] = {}
    if word_ids:
        custom_result = await db.execute(
            select(UserCustomWord.word_id)
            .where(
                UserCustomWord.profile_id == profile.id,
                UserCustomWord.word_id.in_(word_ids),
            )
            .distinct()
        )
        for (word_id,) in custom_result.fetchall():
            sources_map.setdefault(word_id, []).append(ReviewPlanSourceOut(type="custom"))

        corpus_result = await db.execute(
            select(
                CorpusEntryTerm.word_id,
                Corpus.name,
                Corpus.name_ru,
                Corpus.name_en,
            )
            .select_from(CorpusEntryTerm)
            .join(CorpusEntry, CorpusEntry.id == CorpusEntryTerm.entry_id)
            .join(Corpus, Corpus.id == CorpusEntry.corpus_id)
            .where(CorpusEntryTerm.word_id.in_(word_ids))
        )
        seen_corpora: dict[int, set[str]] = {}
        for word_id, name, name_ru, name_en in corpus_result.fetchall():
            resolved = resolve_corpus_name(name, name_ru, name_en, ui_lang)
            if not resolved:
                continue
            bucket = seen_corpora.setdefault(word_id, set())
            if resolved in bucket:
                continue
            bucket.add(resolved)
            sources_map.setdefault(word_id, []).append(
                ReviewPlanSourceOut(type="corpus", name=resolved)
            )

    items = []
    for row in rows:
        if row.next_review_at is None:
            continue
        sources = sources_map.get(row.word_id, [])
        if not sources:
            sources = [ReviewPlanSourceOut(type="unknown")]
        items.append(
            ReviewPlanItemOut(
                word_id=row.word_id,
                word=row.lemma,
                translations=translation_map.get(row.word_id, []),
                sources=sources,
                learned_at=row.learned_at,
                next_review_at=row.next_review_at,
                stage=row.stage,
            )
        )

    return ReviewPlanOut(total=total, items=items)
