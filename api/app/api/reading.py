from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_active_learning_profile, get_current_user
from app.db.session import get_db
from app.models import (
    Corpus,
    ReadingPassage,
    ReadingPassageBlock,
    ReadingPassageToken,
    ReadingSource,
    Translation,
    User,
    UserCorpus,
    UserCustomWord,
    UserWord,
)
from app.schemas.reading import ReadingFlagOut, ReadingFlagRequest, ReadingPreviewOut, ReadingPreviewRequest

router = APIRouter(prefix="/reading", tags=["reading"])

KNOWN_STATUSES = ("known", "learned")
TOKEN_RE = re.compile(r"[A-Za-z\u0400-\u04FF]+(?:['\u2019][A-Za-z\u0400-\u04FF]+)?")
LATIN_RE = re.compile(r"[A-Za-z]")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")


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


def matches_target_language(text: str, lang: str) -> bool:
    if not text:
        return False
    latin = len(LATIN_RE.findall(text))
    cyrillic = len(CYRILLIC_RE.findall(text))
    letters = latin + cyrillic
    if letters == 0:
        return False
    latin_ratio = latin / letters
    cyrillic_ratio = cyrillic / letters
    if lang == "en":
        return latin_ratio >= 0.9 and cyrillic_ratio <= 0.05
    if lang == "ru":
        return cyrillic_ratio >= 0.9 and latin_ratio <= 0.05
    return True


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


def build_bundle(
    base: ReadingPassage,
    passages: list[ReadingPassage],
    token_map: dict[int, set[str]],
    min_words: int,
    max_words: int,
) -> tuple[list[ReadingPassage], int, set[str]]:
    selected: list[ReadingPassage] = [base]
    covered = set(token_map.get(base.id, set()))
    total_words = base.word_count
    remaining = [item for item in passages if item.id != base.id]

    while True:
        best = None
        best_gain = 0
        for passage in remaining:
            if total_words + passage.word_count > max_words:
                continue
            new_tokens = token_map.get(passage.id, set()) - covered
            gain = len(new_tokens)
            if gain > best_gain:
                best = passage
                best_gain = gain
            elif gain == best_gain and gain > 0 and best is not None:
                if passage.word_count < best.word_count:
                    best = passage
        if best is None:
            break
        if best_gain == 0 and total_words >= min_words:
            break
        if best_gain == 0 and total_words < min_words:
            break
        selected.append(best)
        covered.update(token_map.get(best.id, set()))
        total_words += best.word_count
        remaining = [item for item in remaining if item.id != best.id]

    source_ids = {item.source_id for item in selected}
    if len(source_ids) == 1:
        selected_sorted = sorted(selected, key=lambda item: item.position)
    else:
        selected_sorted = selected
    return selected_sorted, total_words, covered


@router.post("", response_model=ReadingPreviewOut)
async def preview_reading(
    data: ReadingPreviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingPreviewOut:
    profile = await get_active_learning_profile(user.id, db, require_onboarding=True)
    target_words_requested = max(1, min(int(data.target_words or 0), 50))
    days = max(1, min(int(data.days or 3), 30))
    variant = max(0, int(data.variant or 0))

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

    blocked_subquery = select(ReadingPassageBlock.passage_id).where(
        ReadingPassageBlock.profile_id == profile.id
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
            ReadingPassage.id.notin_(blocked_subquery),
        )
        .group_by(
            ReadingPassage.id,
            ReadingPassage.source_id,
            ReadingPassage.position,
            ReadingPassage.word_count,
        )
        .order_by(hits_expr.desc(), ReadingPassage.word_count.asc())
        .limit(80)
    )
    candidate_rows = candidate_result.fetchall()
    if not candidate_rows:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            target_words=len(target_tokens),
            message="No matching passages found.",
        )

    passage_ids = [row.id for row in candidate_rows]
    passages_result = await db.execute(select(ReadingPassage).where(ReadingPassage.id.in_(passage_ids)))
    passages_map = {item.id: item for item in passages_result.scalars().all()}

    token_result = await db.execute(
        select(ReadingPassageToken.passage_id, ReadingPassageToken.token).where(
            ReadingPassageToken.passage_id.in_(passage_ids)
        )
    )
    token_map: dict[int, set[str]] = {}
    for passage_id, token in token_result.fetchall():
        token_map.setdefault(passage_id, set()).add(token)

    min_words, max_words = reading_target_range(target_words_requested)
    candidate_passages: list[ReadingPassage] = []
    for row in candidate_rows:
        passage = passages_map.get(row.id)
        if passage is None:
            continue
        if not matches_target_language(passage.text, profile.target_lang or ""):
            continue
        candidate_passages.append(passage)

    if not candidate_passages:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            target_words=len(target_tokens),
            message="No matching passages found.",
        )

    bundles: list[tuple[list[ReadingPassage], int, set[str]]] = []
    sorted_passages = sorted(
        candidate_passages,
        key=lambda item: (-len(token_map.get(item.id, set())), item.word_count),
    )
    for base in sorted_passages[:10]:
        bundle = build_bundle(base, sorted_passages, token_map, min_words, max_words)
        bundles.append(bundle)

    if not bundles:
        return ReadingPreviewOut(
            target_words_requested=target_words_requested,
            target_words=len(target_tokens),
            message="No matching passages found.",
        )

    target_token_set = set(target_tokens)
    scored_bundles = []
    for selected_passages, total_words, covered_tokens in bundles:
        hits = len(target_token_set & covered_tokens)
        coverage = hits / len(target_token_set) if target_token_set else 0.0
        scored_bundles.append((coverage, hits, total_words, selected_passages, covered_tokens))

    scored_bundles.sort(key=lambda item: (-item[0], -item[1], item[2]))
    chosen = scored_bundles[variant % len(scored_bundles)]
    coverage, hits, word_count, selected_passages, covered_tokens = chosen
    highlight_tokens = sorted(target_token_set & covered_tokens)

    text_parts = [item.text.strip() for item in selected_passages if item.text]
    passage_text = "\n\n".join(text_parts)

    selected_source_ids = {item.source_id for item in selected_passages}
    source_result = await db.execute(
        select(ReadingSource.id, ReadingSource.title, Corpus.name)
        .outerjoin(Corpus, Corpus.id == ReadingSource.corpus_id)
        .where(ReadingSource.id.in_(selected_source_ids))
    )
    source_map = {
        row.id: (row.title, row.name)
        for row in source_result.fetchall()
    }
    source_titles: list[str] = []
    corpus_names: list[str] = []
    for passage in selected_passages:
        title, corpus = source_map.get(passage.source_id, (None, None))
        if title and title not in source_titles:
            source_titles.append(title)
        if corpus and corpus not in corpus_names:
            corpus_names.append(corpus)
    source_title = source_titles[0] if len(source_titles) == 1 else None
    corpus_name = corpus_names[0] if len(corpus_names) == 1 else None

    return ReadingPreviewOut(
        title=source_titles[0] if source_titles else "",
        text=passage_text,
        source_title=source_title,
        source_titles=source_titles,
        corpus_name=corpus_name,
        corpus_names=corpus_names,
        passage_ids=[item.id for item in selected_passages],
        word_count=word_count,
        target_words=len(target_tokens),
        target_words_requested=target_words_requested,
        hits=hits,
        coverage=coverage,
        highlight_tokens=highlight_tokens,
    )


@router.post("/flag", response_model=ReadingFlagOut)
async def flag_reading(
    data: ReadingFlagRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReadingFlagOut:
    profile = await get_active_learning_profile(user.id, db, require_onboarding=True)
    passage_ids = [int(item) for item in data.passage_ids if isinstance(item, int) or str(item).isdigit()]
    if not passage_ids:
        return ReadingFlagOut(blocked=0)

    values = [
        {"profile_id": profile.id, "user_id": user.id, "passage_id": passage_id}
        for passage_id in set(passage_ids)
    ]
    stmt = insert(ReadingPassageBlock).values(values)
    stmt = stmt.on_conflict_do_nothing(index_elements=["profile_id", "passage_id"])
    result = await db.execute(stmt)
    await db.commit()
    return ReadingFlagOut(blocked=result.rowcount or 0)
