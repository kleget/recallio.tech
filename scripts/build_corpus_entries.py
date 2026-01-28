"""Build bidirectional corpus entries from words + translations."""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from collections import defaultdict
from pathlib import Path

from sqlalchemy import delete, func, or_, select

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Corpus,
    CorpusEntry,
    CorpusEntryTerm,
    CorpusWordStat,
    Translation,
    Word,
)

SPLIT_RE = re.compile(r"[;,/]")
SPACE_RE = re.compile(r"\s+")


def normalize_key(value: str) -> str:
    return SPACE_RE.sub(" ", value.strip()).lower()


def clean_text(value: str) -> str:
    return SPACE_RE.sub(" ", value.strip())


def split_translation(value: str) -> list[str]:
    parts: list[str] = []
    for raw in SPLIT_RE.split(value or ""):
        cleaned = SPACE_RE.sub(" ", raw.strip())
        if cleaned:
            parts.append(cleaned)
    return parts


async def load_word_index(session) -> tuple[dict[tuple[str, str], int], dict[int, str]]:
    result = await session.execute(select(Word.id, Word.lemma, Word.lang))
    mapping: dict[tuple[str, str], int] = {}
    id_to_lang: dict[int, str] = {}
    for word_id, lemma, lang in result.fetchall():
        normalized = normalize_key(lemma)
        mapping.setdefault((lang, normalized), word_id)
        id_to_lang.setdefault(word_id, lang)
    return mapping, id_to_lang


async def ensure_word(
    session, word_index, id_to_lang, lemma: str, lang: str, apply: bool
) -> int | None:
    normalized = normalize_key(lemma)
    if not normalized:
        return None
    key = (lang, normalized)
    existing = word_index.get(key)
    if existing:
        return existing
    if not apply:
        return None
    cleaned = clean_text(lemma)
    if not cleaned:
        return None
    word = Word(lemma=cleaned, lang=lang)
    session.add(word)
    await session.flush()
    word_index[key] = word.id
    id_to_lang[word.id] = lang
    return word.id


async def build_entries_for_corpus(
    session,
    corpus: Corpus,
    word_index,
    id_to_lang,
    apply: bool,
    reset: bool,
) -> None:
    existing_count = await session.scalar(
        select(func.count()).select_from(CorpusEntry).where(CorpusEntry.corpus_id == corpus.id)
    )
    if existing_count and not reset:
        print(f"Skip {corpus.slug}: already has entries ({existing_count}). Use --reset.")
        return

    stats_rows = await session.execute(
        select(
            CorpusWordStat.word_id,
            CorpusWordStat.count,
            CorpusWordStat.rank,
            Word.lemma,
            Word.lang,
        )
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(CorpusWordStat.corpus_id == corpus.id)
    )
    stats = stats_rows.fetchall()
    if not stats:
        print(f"Skip {corpus.slug}: no corpus words.")
        return

    stats_word_ids = [row[0] for row in stats]
    translations_result = await session.execute(
        select(Translation.word_id, Translation.translation, Translation.target_lang)
        .where(Translation.word_id.in_(stats_word_ids))
        .where(or_(Translation.source.is_(None), Translation.source != "custom"))
        .order_by(Translation.word_id, Translation.id)
    )
    translations_map: dict[int, list[tuple[str, str]]] = defaultdict(list)
    for word_id, translation, target_lang in translations_result.fetchall():
        normalized_lang = (target_lang or "").strip().lower()
        if not translation or not normalized_lang:
            continue
        for part in split_translation(translation):
            translations_map[word_id].append((normalized_lang, part))

    if apply and reset and existing_count:
        await session.execute(
            delete(CorpusEntryTerm).where(
                CorpusEntryTerm.entry_id.in_(
                    select(CorpusEntry.id).where(CorpusEntry.corpus_id == corpus.id)
                )
            )
        )
        await session.execute(delete(CorpusEntry).where(CorpusEntry.corpus_id == corpus.id))

    created = 0
    for word_id, count, rank, lemma, lang in stats:
        if apply:
            entry = CorpusEntry(corpus_id=corpus.id, count=int(count or 0), rank=rank)
            session.add(entry)
            await session.flush()
            entry_id = entry.id
        else:
            entry_id = None

        if apply and entry_id is not None:
            session.add(
                CorpusEntryTerm(
                    entry_id=entry_id,
                    word_id=word_id,
                    lang=lang,
                    is_primary=True,
                )
            )

        added_word_ids = {word_id}
        primary_langs = {lang}
        for target_lang, value in translations_map.get(word_id, []):
            term_id = await ensure_word(session, word_index, id_to_lang, value, target_lang, apply)
            if term_id is None or term_id in added_word_ids:
                continue
            is_primary = target_lang not in primary_langs
            if apply and entry_id is not None:
                session.add(
                    CorpusEntryTerm(
                        entry_id=entry_id,
                        word_id=term_id,
                        lang=target_lang,
                        is_primary=is_primary,
                    )
                )
            added_word_ids.add(term_id)
            if is_primary:
                primary_langs.add(target_lang)

        created += 1

    if apply:
        await session.commit()
    print(f"{corpus.slug}: entries={created}, words={len(stats_word_ids)}")


async def run(slug: str | None, apply: bool, reset: bool) -> None:
    async with AsyncSessionLocal() as session:
        word_index, id_to_lang = await load_word_index(session)
        if slug:
            result = await session.execute(select(Corpus).where(Corpus.slug == slug))
            corpora = [row for row in result.scalars().all()]
        else:
            result = await session.execute(select(Corpus).order_by(Corpus.name))
            corpora = result.scalars().all()

        if not corpora:
            print("No corpora found.")
            return

        for corpus in corpora:
            await build_entries_for_corpus(
                session,
                corpus,
                word_index,
                id_to_lang,
                apply=apply,
                reset=reset,
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build corpus entries from words + translations.")
    parser.add_argument("--slug", default=None, help="Corpus slug to process.")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    parser.add_argument("--reset", action="store_true", help="Clear existing entries before rebuild.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.slug, apply=args.apply, reset=args.reset))


if __name__ == "__main__":
    main()
