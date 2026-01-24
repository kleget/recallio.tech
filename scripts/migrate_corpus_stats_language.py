"""Populate corpus stats for a missing language using translations."""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import exists, select
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import Corpus, CorpusWordStat, Translation, Word  # noqa: E402


SPLIT_RE = re.compile(r"[;,/]")


def normalize_text(value: str) -> str:
    return " ".join(value.strip().split()).lower()


def pick_primary_translation(values: list[str]) -> str | None:
    for text in values:
        for part in SPLIT_RE.split(text or ""):
            cleaned = normalize_text(part)
            if cleaned:
                return cleaned
    return None


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


async def find_corpora(session, from_lang: str, to_lang: str, slug: str | None) -> list[Corpus]:
    if slug:
        result = await session.execute(select(Corpus).where(Corpus.slug == slug))
        corpus = result.scalar_one_or_none()
        return [corpus] if corpus else []

    has_from = exists(
        select(1)
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(CorpusWordStat.corpus_id == Corpus.id, Word.lang == from_lang)
    )
    has_to = exists(
        select(1)
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(CorpusWordStat.corpus_id == Corpus.id, Word.lang == to_lang)
    )
    result = await session.execute(select(Corpus).where(has_from, ~has_to))
    return result.scalars().all()


async def migrate_corpus(
    session,
    corpus: Corpus,
    from_lang: str,
    to_lang: str,
    apply: bool,
) -> None:
    source_result = await session.execute(
        select(Word.id, Word.lemma, CorpusWordStat.count)
        .select_from(CorpusWordStat)
        .join(Word, Word.id == CorpusWordStat.word_id)
        .where(CorpusWordStat.corpus_id == corpus.id, Word.lang == from_lang)
    )
    source_rows = source_result.fetchall()
    if not source_rows:
        print(f"Skip {corpus.slug}: no {from_lang} words found.")
        return

    source_ids = [row.id for row in source_rows]
    translations_result = await session.execute(
        select(Translation.word_id, Translation.translation)
        .where(
            Translation.word_id.in_(source_ids),
            Translation.target_lang == to_lang,
        )
        .order_by(Translation.word_id, Translation.id)
    )
    translation_map: dict[int, list[str]] = {}
    for word_id, translation in translations_result.fetchall():
        if translation:
            translation_map.setdefault(word_id, []).append(str(translation))

    target_counts: dict[str, int] = {}
    missing = 0
    for word_id, _lemma, count in source_rows:
        primary = pick_primary_translation(translation_map.get(word_id, []))
        if not primary:
            missing += 1
            continue
        current = target_counts.get(primary)
        count_value = int(count or 0)
        if current is None or count_value > current:
            target_counts[primary] = count_value

    if not target_counts:
        print(f"Skip {corpus.slug}: no translations to build {to_lang} stats.")
        return

    target_lemmas = sorted(target_counts.keys())
    if apply:
        await ensure_words(session, target_lemmas, to_lang)
    word_map = await fetch_word_map(session, target_lemmas, to_lang)

    ranked = sorted(target_counts.items(), key=lambda item: (-item[1], item[0]))
    rows = []
    for rank, (lemma, count) in enumerate(ranked, start=1):
        word_id = word_map.get(lemma)
        if not word_id:
            continue
        rows.append(
            {
                "corpus_id": corpus.id,
                "word_id": word_id,
                "count": count,
                "rank": rank,
            }
        )

    if apply and rows:
        for batch in chunked(rows, 1000):
            stmt = insert(CorpusWordStat).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["corpus_id", "word_id"],
                set_={"count": stmt.excluded.count, "rank": stmt.excluded.rank},
            )
            await session.execute(stmt)

    print(
        f"{corpus.slug}: created {len(rows)} {to_lang} stats (missing translations: {missing})."
    )


async def run(from_lang: str, to_lang: str, slug: str | None, apply: bool) -> None:
    async with AsyncSessionLocal() as session:
        corpora = await find_corpora(session, from_lang, to_lang, slug)
        if not corpora:
            print("No corpora found to migrate.")
            return

        for corpus in corpora:
            await migrate_corpus(session, corpus, from_lang, to_lang, apply)

        if apply:
            await session.commit()

    if not apply:
        print("Dry run. Re-run with --apply to make changes.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Populate corpus stats for a missing language.")
    parser.add_argument("--from-lang", default="ru", help="Source language for existing corpus stats.")
    parser.add_argument("--to-lang", default="en", help="Target language to populate.")
    parser.add_argument("--slug", default=None, help="Only process a specific corpus slug.")
    parser.add_argument("--apply", action="store_true", help="Apply changes to the database.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run(args.from_lang, args.to_lang, args.slug, args.apply))


if __name__ == "__main__":
    main()
