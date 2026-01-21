from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_active_learning_profile, get_current_user
from app.db.session import get_db
from app.models import (
    Corpus,
    ReadingPassage,
    ReadingPassageToken,
    ReadingSource,
    Translation,
    User,
    UserCorpus,
    UserCustomWord,
    UserWord,
)
from app.schemas.reading import ReadingPreviewOut, ReadingPreviewRequest

router = APIRouter(prefix="/reading", tags=["reading"])

KNOWN_STATUSES = ("known", "learned")
TOKEN_RE = re.compile(r"[A-Za-z\u0400-\u04FF]+(?:['\u2019][A-Za-z\u0400-\u04FF]+)?")


def normalize_text(value: str) -> str:
    return " ".join(value.lower().split())


def build_translation_options(translations: list[str]) -> set[str]:
    options: set[str] = set()
    for text in translations:
        for part in re.split(r"[;,/]", text or ""):
            normalized = normalize_text(part)
            if normalized:
                options.add(normalized)
    return options


def extract_translation_tokens(translations: list[str]) -> list[str]:
    tokens: list[str] = []
    for option in build_translation_options(translations):
        for token in TOKEN_RE.findall(option.lower()):
            cleaned = token.strip("'")
            if len(cleaned) < 3:
                continue
            tokens.append(cleaned)
    return tokens


def reading_target_range(target_words: int) -> tuple[int, int]:
    base = max(1, target_words)
    min_words = base * 10
    if base <= 3:
        max_words = min_words + 5
    else:
        max_words = min_words + (base * 10)
    max_words = min(max_words, 600)
    if max_words < min_words:
        max_words = min_words
    return min_words, max_words


async def collect_target_tokens(
    profile_id,
    target_lang: str,
    target_words: int,
    days: int,
    db: AsyncSession,
) -> list[str]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(UserWord.word_id)
        .where(
            UserWord.profile_id == profile_id,
            UserWord.status.in_(KNOWN_STATUSES),
            UserWord.learned_at.is_not(None),
            UserWord.learned_at >= since,
        )
        .order_by(UserWord.learned_at.desc())
        .limit(300)
    )
    word_ids = [row.word_id for row in result.fetchall()]
    if not word_ids:
        return []

    translations_map: dict[int, list[str]] = {}
    translation_result = await db.execute(
        select(Translation.word_id, Translation.translation)
        .where(Translation.word_id.in_(word_ids), Translation.target_lang == target_lang)
    )
    for word_id, translation in translation_result.fetchall():
        translations_map.setdefault(word_id, []).append(translation)

    custom_result = await db.execute(
        select(UserCustomWord.word_id, UserCustomWord.translation)
        .where(
            UserCustomWord.profile_id == profile_id,
            UserCustomWord.word_id.in_(word_ids),
            UserCustomWord.target_lang == target_lang,
        )
    )
    for word_id, translation in custom_result.fetchall():
        translations_map.setdefault(word_id, []).append(translation)

    target_tokens: list[str] = []
    seen = set()
    for word_id in word_ids:
        tokens = extract_translation_tokens(translations_map.get(word_id, []))
        for token in tokens:
            if token in seen:
                continue
            seen.add(token)
            target_tokens.append(token)
            if len(target_tokens) >= target_words:
                return target_tokens
    return target_tokens


def expand_passages(
    passages_by_pos: dict[int, ReadingPassage],
    base_pos: int,
    min_words: int,
    max_words: int,
) -> list[int]:
    selected = [base_pos]
    total_words = passages_by_pos[base_pos].word_count
    left = base_pos - 1
    right = base_pos + 1

    while total_words < min_words and (left in passages_by_pos or right in passages_by_pos):
        options: list[tuple[str, ReadingPassage]] = []
        if left in passages_by_pos:
            options.append(("left", passages_by_pos[left]))
        if right in passages_by_pos:
            options.append(("right", passages_by_pos[right]))
        options.sort(key=lambda item: item[1].word_count)

        chosen = None
        for side, passage in options:
            if total_words + passage.word_count <= max_words:
                chosen = (side, passage)
                break
        if chosen is None:
            chosen = options[0]

        side, passage = chosen
        if side == "left":
            selected.append(left)
            left -= 1
        else:
            selected.append(right)
            right += 1
        total_words += passage.word_count

    return sorted(selected)


@router.post("", response_model=ReadingPreviewOut)
async def preview_reading(
    data: ReadingPreviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingPreviewOut:
    profile = await get_active_learning_profile(user.id, db, require_onboarding=True)
    target_words_requested = max(1, min(int(data.target_words or 0), 50))
    days = max(1, min(int(data.days or 3), 30))

    target_tokens = await collect_target_tokens(
        profile.id,
        profile.target_lang,
        target_words_requested,
        days,
        db,
    )
    if not target_tokens:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            message="No recently learned words to match.",
        )

    enabled_result = await db.execute(
        select(UserCorpus.corpus_id)
        .where(UserCorpus.profile_id == profile.id, UserCorpus.enabled.is_(True))
    )
    enabled_corpora = [row.corpus_id for row in enabled_result.fetchall()]
    source_stmt = select(ReadingSource.id).where(ReadingSource.lang == profile.target_lang)
    if enabled_corpora:
        source_stmt = source_stmt.where(ReadingSource.corpus_id.in_(enabled_corpora))
    source_result = await db.execute(source_stmt)
    source_ids = [row.id for row in source_result.fetchall()]
    if enabled_corpora and not source_ids:
        fallback_result = await db.execute(
            select(ReadingSource.id).where(ReadingSource.lang == profile.target_lang)
        )
        source_ids = [row.id for row in fallback_result.fetchall()]

    if not source_ids:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            target_words=len(target_tokens),
            message="No reading sources found.",
        )

    hits_expr = func.count(func.distinct(ReadingPassageToken.token)).label("hits")
    candidate_result = await db.execute(
        select(
            ReadingPassage.id,
            ReadingPassage.source_id,
            ReadingPassage.position,
            ReadingPassage.word_count,
            hits_expr,
        )
        .select_from(ReadingPassage)
        .join(ReadingPassageToken, ReadingPassageToken.passage_id == ReadingPassage.id)
        .where(
            ReadingPassage.source_id.in_(source_ids),
            ReadingPassageToken.token.in_(target_tokens),
        )
        .group_by(
            ReadingPassage.id,
            ReadingPassage.source_id,
            ReadingPassage.position,
            ReadingPassage.word_count,
        )
        .order_by(hits_expr.desc(), ReadingPassage.word_count.asc())
        .limit(10)
    )
    candidate = candidate_result.first()
    if not candidate:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            target_words=len(target_tokens),
            message="No matching passages found.",
        )

    min_words, max_words = reading_target_range(target_words_requested)
    span = max(6, int(max_words / 80) + 2)
    range_result = await db.execute(
        select(ReadingPassage)
        .where(
            ReadingPassage.source_id == candidate.source_id,
            ReadingPassage.position.between(candidate.position - span, candidate.position + span),
        )
        .order_by(ReadingPassage.position)
    )
    passages = range_result.scalars().all()
    passages_by_pos = {item.position: item for item in passages}

    selected_positions = expand_passages(passages_by_pos, candidate.position, min_words, max_words)
    selected_passages = [passages_by_pos[pos] for pos in selected_positions if pos in passages_by_pos]
    text_parts = [item.text.strip() for item in selected_passages if item.text]
    passage_text = "\n\n".join(text_parts)
    word_count = sum(item.word_count for item in selected_passages)

    token_result = await db.execute(
        select(ReadingPassageToken.token).where(
            ReadingPassageToken.passage_id.in_([item.id for item in selected_passages])
        )
    )
    passage_tokens = {row.token for row in token_result.fetchall()}
    hits = len(set(target_tokens) & passage_tokens)
    coverage = hits / len(target_tokens) if target_tokens else 0.0

    source_row = await db.execute(
        select(ReadingSource, Corpus.name)
        .outerjoin(Corpus, Corpus.id == ReadingSource.corpus_id)
        .where(ReadingSource.id == candidate.source_id)
    )
    source_data = source_row.first()
    source = source_data[0] if source_data else None
    corpus_name = source_data[1] if source_data else None

    return ReadingPreviewOut(
        title=source.title if source else "",
        text=passage_text,
        source_title=source.title if source else None,
        corpus_name=corpus_name,
        word_count=word_count,
        target_words=len(target_tokens),
        target_words_requested=target_words_requested,
        hits=hits,
        coverage=coverage,
    )
