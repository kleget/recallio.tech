"""Import translations-only data from english_project SQLite databases into Postgres."""

from __future__ import annotations

import argparse
import asyncio
import json
import sqlite3
import sys
from pathlib import Path
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import Corpus, CorpusWordStat, Translation, Word  # noqa: E402

SKIP_FILES = {"translations_cache.db", "delete.db"}


def chunked(items: Iterable, size: int) -> Iterable[list]:
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def load_mapping(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sqlite_tables(conn: sqlite3.Connection) -> list[str]:
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return [row[0] for row in cursor.fetchall()]


def read_translations(conn: sqlite3.Connection) -> list[tuple[str, int, str]]:
    cursor = conn.execute("SELECT word, count, translation FROM translations")
    return [
        (row[0], int(row[1]), row[2])
        for row in cursor.fetchall()
        if row[2] and str(row[2]).strip()
    ]


async def ensure_corpus(session, slug: str, name: str, source_lang: str, target_lang: str) -> int:
    stmt = (
        insert(Corpus)
        .values(
            slug=slug,
            name=name,
            source_lang=source_lang,
            target_lang=target_lang,
        )
        .on_conflict_do_nothing(index_elements=["slug"])
    )
    await session.execute(stmt)
    result = await session.execute(select(Corpus.id).where(Corpus.slug == slug))
    return result.scalar_one()


async def ensure_words(session, lemmas: list[str], lang: str) -> None:
    for batch in chunked(lemmas, 1000):
        rows = [{"lemma": lemma, "lang": lang} for lemma in batch]
        stmt = insert(Word).values(rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["lemma", "lang"])
        await session.execute(stmt)


async def fetch_word_ids(session, lemmas: list[str], lang: str) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for batch in chunked(lemmas, 1000):
        result = await session.execute(
            select(Word.id, Word.lemma).where(Word.lang == lang, Word.lemma.in_(batch))
        )
        for word_id, lemma in result.fetchall():
            mapping[lemma] = word_id
    return mapping


async def upsert_corpus_stats(session, corpus_id: int, word_counts: list[tuple[str, int]], word_id_map: dict[str, int]):
    rows = []
    for rank, (lemma, count) in enumerate(word_counts, start=1):
        word_id = word_id_map.get(lemma)
        if word_id is None:
            continue
        rows.append(
            {
                "corpus_id": corpus_id,
                "word_id": word_id,
                "count": count,
                "rank": rank,
            }
        )
        if len(rows) >= 1000:
            stmt = insert(CorpusWordStat).values(rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["corpus_id", "word_id"],
                set_={"count": stmt.excluded.count, "rank": stmt.excluded.rank},
            )
            await session.execute(stmt)
            rows = []

    if rows:
        stmt = insert(CorpusWordStat).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["corpus_id", "word_id"],
            set_={"count": stmt.excluded.count, "rank": stmt.excluded.rank},
        )
        await session.execute(stmt)


async def upsert_translations(
    session,
    translations: list[tuple[str, int, str]],
    word_id_map: dict[str, int],
    target_lang: str,
):
    rows = []
    for lemma, _count, translation in translations:
        word_id = word_id_map.get(lemma)
        if word_id is None:
            continue
        rows.append(
            {
                "word_id": word_id,
                "target_lang": target_lang,
                "translation": translation,
                "source": "sqlite",
            }
        )
        if len(rows) >= 1000:
            stmt = insert(Translation).values(rows)
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["word_id", "target_lang", "translation"]
            )
            await session.execute(stmt)
            rows = []

    if rows:
        stmt = insert(Translation).values(rows)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["word_id", "target_lang", "translation"]
        )
        await session.execute(stmt)


async def import_database(db_path: Path, mapping: dict) -> None:
    slug = db_path.stem
    if slug not in mapping:
        print(f"Skip {slug}: missing in import_map.json")
        return

    meta = mapping[slug]
    name = meta.get("name", slug)
    source_lang = meta.get("source_lang", "en")
    target_lang = meta.get("target_lang", "ru")

    conn = sqlite3.connect(db_path)
    try:
        tables = sqlite_tables(conn)
        if "translations" not in tables:
            print(f"Skip {slug}: no translations table")
            return

        translations = read_translations(conn)
        if not translations:
            print(f"Skip {slug}: empty translations table")
            return

        translations_sorted = sorted(translations, key=lambda item: item[1], reverse=True)
        word_counts = [(word, count) for word, count, _translation in translations_sorted]
        lemmas = [word for word, _count, _translation in translations_sorted]

        async with AsyncSessionLocal() as session:
            corpus_id = await ensure_corpus(session, slug, name, source_lang, target_lang)
            await session.commit()

            await ensure_words(session, lemmas, source_lang)
            await session.commit()

            word_id_map = await fetch_word_ids(session, lemmas, source_lang)

            await upsert_corpus_stats(session, corpus_id, word_counts, word_id_map)
            await session.commit()

            await upsert_translations(session, translations_sorted, word_id_map, target_lang)
            await session.commit()

        print(f"Imported {slug}: {len(word_counts)} words, {len(translations_sorted)} translations")
    finally:
        conn.close()


async def run(sqlite_dir: Path, map_path: Path) -> None:
    mapping = load_mapping(map_path)
    for db_path in sorted(sqlite_dir.glob("*.db")):
        if db_path.name in SKIP_FILES:
            continue
        await import_database(db_path, mapping)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--sqlite-dir",
        type=Path,
        default=Path("E:/Code/english_project/database"),
    )
    parser.add_argument(
        "--map",
        type=Path,
        default=Path("scripts/import_map.json"),
    )
    args = parser.parse_args()
    asyncio.run(run(args.sqlite_dir, args.map))


if __name__ == "__main__":
    main()
