"""Import entry-based corpora SQLite into Postgres."""

from __future__ import annotations

import argparse
import asyncio
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from typing import Iterable

from sqlalchemy import delete, select, text
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Corpus,
    CorpusEntry,
    CorpusEntryTerm,
    CorpusWordStat,
    Word,
)

SLUG_RE = re.compile(r"_(ru|en)_(ru|en)$", re.IGNORECASE)

CORPUS_NAMES = {
    "agronomandagricult": {
        "ru": "Агрономия и сельское хозяйство",
        "en": "Agronomy and Agriculture",
    },
    "biologicalsciences": {"ru": "Биологические науки", "en": "Biological Sciences"},
    "chemicalsciences": {"ru": "Химические науки", "en": "Chemical Sciences"},
    "economicsciences": {"ru": "Экономические науки", "en": "Economic Sciences"},
    "engineeringsciences": {"ru": "Инженерные науки", "en": "Engineering Sciences"},
    "geosciences": {"ru": "Науки о Земле", "en": "Geosciences"},
    "humanities": {"ru": "Гуманитарные науки", "en": "Humanities"},
    "it": {"ru": "Информационные технологии", "en": "Information Technology"},
    "mathematicalscience": {"ru": "Математические науки", "en": "Mathematical Sciences"},
    "medicalbiomedical": {
        "ru": "Медицинские и биомедицинские науки",
        "en": "Medical and Biomedical Sciences",
    },
    "nonscientificenglish": {"ru": "Общий английский", "en": "General English"},
    "nonscientificrussian": {"ru": "Общий русский", "en": "General Russian"},
    "physicalsciences": {"ru": "Физические науки", "en": "Physical Sciences"},
    "psychologyandcognitive": {
        "ru": "Психология и когнитивные науки",
        "en": "Psychology and Cognitive Sciences",
    },
    "socialsciences": {"ru": "Социальные науки", "en": "Social Sciences"},
}


def normalize_slug(slug: str) -> str:
    base = SLUG_RE.sub("", slug or "")
    return base.lower()


def chunked(items: Iterable, size: int) -> Iterable[list]:
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def load_sqlite(db_path: Path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    corpora = cur.execute("SELECT * FROM corpora").fetchall()
    entries = cur.execute("SELECT * FROM entries").fetchall()
    terms = cur.execute("SELECT * FROM terms").fetchall()
    conn.close()
    return corpora, entries, terms


async def upsert_corpora(session, corpora_rows) -> dict[str, int]:
    for row in corpora_rows:
        slug = row["slug"]
        name = row["name"] or slug
        key = normalize_slug(slug)
        mapped = CORPUS_NAMES.get(key, {})
        name_ru = mapped.get("ru")
        name_en = mapped.get("en")
        fallback_name = name_en or name
        stmt = (
            insert(Corpus)
            .values(
                slug=slug,
                name=fallback_name,
                name_ru=name_ru,
                name_en=name_en,
            )
            .on_conflict_do_update(
                index_elements=["slug"],
                set_={
                    "name": fallback_name,
                    "name_ru": name_ru,
                    "name_en": name_en,
                },
            )
        )
        await session.execute(stmt)

    result = await session.execute(select(Corpus.slug, Corpus.id))
    return {row.slug: row.id for row in result.fetchall()}


async def ensure_words(session, word_pairs: set[tuple[str, str]]) -> None:
    for batch in chunked(sorted(word_pairs), 1000):
        rows = [{"lemma": lemma, "lang": lang} for lemma, lang in batch]
        stmt = insert(Word).values(rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["lemma", "lang"])
        await session.execute(stmt)


async def fetch_word_ids(session, word_pairs: set[tuple[str, str]]) -> dict[tuple[str, str], int]:
    by_lang: dict[str, list[str]] = defaultdict(list)
    for lemma, lang in word_pairs:
        by_lang[lang].append(lemma)

    mapping: dict[tuple[str, str], int] = {}
    for lang, lemmas in by_lang.items():
        for batch in chunked(lemmas, 1000):
            result = await session.execute(
                select(Word.id, Word.lemma, Word.lang).where(
                    Word.lang == lang, Word.lemma.in_(batch)
                )
            )
            for word_id, lemma, lang in result.fetchall():
                mapping[(lemma, lang)] = word_id
    return mapping


async def set_sequence(session, table: str, column: str) -> None:
    seq_name = f"{table}_{column}_seq"
    try:
        await session.execute(
            text(
                f"SELECT setval(:seq, COALESCE((SELECT MAX({column}) FROM {table}), 1), true)"
            ),
            {"seq": seq_name},
        )
    except Exception:
        # sequence may not exist in some environments
        pass


async def run(db_path: Path, apply: bool, drop_missing: bool, replace_all: bool) -> None:
    corpora_rows, entries_rows, terms_rows = load_sqlite(db_path)

    if not corpora_rows:
        print("No corpora found in sqlite.")
        return

    # group entries/terms
    entries_by_corpus: dict[str, list] = defaultdict(list)
    for row in entries_rows:
        entries_by_corpus[row["corpus_slug"]].append(row)

    terms_by_entry: dict[int, list] = defaultdict(list)
    word_pairs: set[tuple[str, str]] = set()
    for row in terms_rows:
        lemma = (row["lemma"] or "").strip()
        lang = (row["lang"] or "").strip().lower()
        if not lemma or not lang:
            continue
        terms_by_entry[row["entry_id"]].append(row)
        word_pairs.add((lemma, lang))

    print(f"SQLite corpora: {len(corpora_rows)}")
    print(f"SQLite entries: {len(entries_rows)}")
    print(f"SQLite terms: {len(terms_rows)}")
    if not apply:
        print("Dry run only. Use --apply to write into Postgres.")
        return

    async with AsyncSessionLocal() as session:
        corpora_map = await upsert_corpora(session, corpora_rows)
        await session.commit()

        await ensure_words(session, word_pairs)
        await session.commit()
        word_id_map = await fetch_word_ids(session, word_pairs)

        corpus_slugs = {row["slug"] for row in corpora_rows}
        if replace_all:
            await session.execute(delete(CorpusEntryTerm))
            await session.execute(delete(CorpusEntry))
            await session.execute(delete(CorpusWordStat))
        else:
            # delete old data per corpus
            corpus_ids = [corpora_map[slug] for slug in corpus_slugs if slug in corpora_map]
            for corpus_id in corpus_ids:
                await session.execute(
                    delete(CorpusEntryTerm).where(
                        CorpusEntryTerm.entry_id.in_(
                            select(CorpusEntry.id).where(CorpusEntry.corpus_id == corpus_id)
                        )
                    )
                )
                await session.execute(delete(CorpusEntry).where(CorpusEntry.corpus_id == corpus_id))
                await session.execute(delete(CorpusWordStat).where(CorpusWordStat.corpus_id == corpus_id))

        if drop_missing:
            await session.execute(delete(Corpus).where(~Corpus.slug.in_(corpus_slugs)))

        await session.commit()

        # insert entries
        entry_rows = []
        for corpus_slug, rows in entries_by_corpus.items():
            corpus_id = corpora_map.get(corpus_slug)
            if not corpus_id:
                continue
            for row in rows:
                entry_rows.append(
                    {
                        "id": int(row["id"]),
                        "corpus_id": corpus_id,
                        "count": int(row["count"] or 0),
                        "rank": row["rank"],
                    }
                )
        for batch in chunked(entry_rows, 1000):
            stmt = insert(CorpusEntry).values(batch)
            stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
            await session.execute(stmt)
        await session.commit()

        # insert terms
        term_rows = []
        for entry_id, rows in terms_by_entry.items():
            for row in rows:
                lemma = (row["lemma"] or "").strip()
                lang = (row["lang"] or "").strip().lower()
                word_id = word_id_map.get((lemma, lang))
                if not word_id:
                    continue
                term_rows.append(
                    {
                        "entry_id": int(entry_id),
                        "word_id": word_id,
                        "lang": lang,
                        "is_primary": bool(row["is_primary"]),
                    }
                )
        for batch in chunked(term_rows, 1000):
            stmt = insert(CorpusEntryTerm).values(batch)
            stmt = stmt.on_conflict_do_nothing(index_elements=["entry_id", "word_id"])
            await session.execute(stmt)
        await session.commit()

        await set_sequence(session, "corpus_entries", "id")
        await set_sequence(session, "corpus_entry_terms", "id")
        await set_sequence(session, "words", "id")
        await session.commit()

    print("Import complete.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=Path("corpora_clean_v2.db"))
    parser.add_argument("--apply", action="store_true", help="Write changes to Postgres.")
    parser.add_argument(
        "--drop-missing",
        action="store_true",
        help="Remove corpora not present in SQLite.",
    )
    parser.add_argument(
        "--replace-all",
        action="store_true",
        help="Delete all corpus entries/terms/stats before import.",
    )
    args = parser.parse_args()
    asyncio.run(run(args.db, args.apply, args.drop_missing, args.replace_all))


if __name__ == "__main__":
    main()
