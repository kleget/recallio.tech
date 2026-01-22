"""Import reading texts (.txt) into Postgres for contextual practice."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

BASE_DIR = Path(__file__).resolve().parents[1]
API_DIR = BASE_DIR / "api"
sys.path.append(str(API_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import Corpus, ReadingPassage, ReadingPassageToken, ReadingSource  # noqa: E402

TOKEN_RE = re.compile(r"[A-Za-z\u0400-\u04FF]+(?:['\u2019][A-Za-z\u0400-\u04FF]+)?")
DIGIT_RE = re.compile(r"\d")
NUM_TOKEN_RE = re.compile(r"\b\d+\b")
LETTER_RE = re.compile(r"[A-Za-z\u0400-\u04FF]")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
NON_LETTER_RE = re.compile(r"[^A-Za-z\u0400-\u04FF\s]")
NOISE_MARKERS = [
    "table of contents",
    "contents",
    "index",
    "bibliography",
    "references",
    "appendix",
    "copyright",
    "isbn",
    "all rights reserved",
    "\u0441\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435",
    "\u043e\u0433\u043b\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
    "\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    "\u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0430",
]


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def load_lang_map(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)
    lang_map: dict[str, str] = {}
    for key, meta in raw.items():
        source_lang = meta.get("source_lang")
        name = meta.get("name")
        if source_lang:
            lang_map[normalize_key(key)] = source_lang
            if name:
                lang_map[normalize_key(name)] = source_lang
    return lang_map


def chunked(items: list[dict], size: int) -> list[list[dict]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def tokenize_words(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


def is_noisy_paragraph(text: str) -> bool:
    lowered = text.lower()
    if any(marker in lowered for marker in NOISE_MARKERS):
        return True
    letters = len(LETTER_RE.findall(text))
    if letters < 20:
        return True
    digit_ratio = len(DIGIT_RE.findall(text)) / max(len(text), 1)
    if digit_ratio > 0.06:
        return True
    non_letters = len(NON_LETTER_RE.findall(text))
    if non_letters / max(len(text), 1) > 0.35:
        return True
    tokens = tokenize_words(text)
    if len(tokens) < 6:
        return True
    numeric_tokens = len(NUM_TOKEN_RE.findall(text))
    if numeric_tokens / max(len(tokens), 1) > 0.12:
        return True
    return False


def split_sentences(text: str) -> list[str]:
    parts = SENTENCE_RE.split(text)
    return [part.strip() for part in parts if part.strip()]


def is_noisy_sentence(text: str) -> bool:
    if len(text.split()) < 5:
        return True
    letters = len(LETTER_RE.findall(text))
    if letters < 20:
        return True
    digit_ratio = len(DIGIT_RE.findall(text)) / max(len(text), 1)
    if digit_ratio > 0.1:
        return True
    return False


def extract_paragraphs(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines()]
    paragraphs: list[str] = []
    buffer: list[str] = []
    for line in lines:
        if not line:
            if buffer:
                paragraphs.append(" ".join(buffer))
                buffer = []
            continue
        buffer.append(line)
    if buffer:
        paragraphs.append(" ".join(buffer))
    cleaned: list[str] = []
    for para in paragraphs:
        collapsed = " ".join(para.split())
        if not collapsed:
            continue
        if is_noisy_paragraph(collapsed):
            continue
        cleaned.append(collapsed)
    return cleaned


def build_passages(paragraphs: list[str], min_words: int, max_words: int) -> list[str]:
    passages: list[str] = []
    buffer: list[str] = []
    buffer_words = 0
    for paragraph in paragraphs:
        sentences = split_sentences(paragraph)
        if not sentences:
            continue
        clean_sentences = [item for item in sentences if not is_noisy_sentence(item)]
        if len(clean_sentences) < 2:
            continue
        for sentence in clean_sentences:
            tokens = tokenize_words(sentence)
            if not tokens:
                continue
            if buffer_words + len(tokens) > max_words and buffer:
                passages.append(" ".join(buffer))
                buffer = [sentence]
                buffer_words = len(tokens)
            else:
                buffer.append(sentence)
                buffer_words += len(tokens)
            if buffer_words >= min_words:
                passages.append(" ".join(buffer))
                buffer = []
                buffer_words = 0
    if buffer:
        passages.append(" ".join(buffer))
    return passages


async def load_corpus_map(session) -> dict[str, int]:
    result = await session.execute(select(Corpus.id, Corpus.slug, Corpus.name))
    corpus_map: dict[str, int] = {}
    for corpus_id, slug, name in result.fetchall():
        corpus_map[normalize_key(slug)] = corpus_id
        corpus_map[normalize_key(name)] = corpus_id
    return corpus_map


async def import_file(
    session,
    file_path: Path,
    folder_key: str,
    lang: str,
    corpus_id: int | None,
    min_words: int,
    max_words: int,
    replace: bool,
) -> None:
    source_slug = f"{folder_key}-{normalize_key(file_path.stem)}"
    source_slug = source_slug[:120]
    existing_result = await session.execute(
        select(ReadingSource).where(ReadingSource.slug == source_slug, ReadingSource.lang == lang)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        if not replace:
            print(f"Skip {file_path.name}: source exists.")
            return
        await session.execute(
            delete(ReadingSource).where(
                ReadingSource.slug == source_slug, ReadingSource.lang == lang
            )
        )
        await session.commit()

    text = file_path.read_text(encoding="utf-8", errors="ignore")
    paragraphs = extract_paragraphs(text)
    passages = build_passages(paragraphs, min_words=min_words, max_words=max_words)
    if not passages:
        print(f"Skip {file_path.name}: no passages.")
        return

    source = ReadingSource(
        corpus_id=corpus_id,
        slug=source_slug,
        title=file_path.stem,
        lang=lang,
    )
    session.add(source)
    await session.flush()

    position = 1
    for passage_text in passages:
        tokens = tokenize_words(passage_text)
        if not tokens:
            continue
        passage = ReadingPassage(
            source_id=source.id,
            position=position,
            text=passage_text,
            word_count=len(tokens),
        )
        session.add(passage)
        await session.flush()

        token_counts: dict[str, int] = {}
        for token in tokens:
            token_counts[token] = token_counts.get(token, 0) + 1
        rows = [
            {"passage_id": passage.id, "token": token, "count": count}
            for token, count in token_counts.items()
        ]
        for batch in chunked(rows, 500):
            await session.execute(insert(ReadingPassageToken).values(batch))

        position += 1

    await session.commit()
    print(f"Imported {file_path.name}: {position - 1} passages.")


async def run_import(args) -> None:
    root = Path(args.path)
    if not root.exists():
        raise SystemExit(f"Path not found: {root}")

    lang_map = load_lang_map(BASE_DIR / "scripts" / "import_map.json")

    async with AsyncSessionLocal() as session:
        corpus_map = await load_corpus_map(session)

        for folder in sorted([item for item in root.iterdir() if item.is_dir()]):
            folder_key = normalize_key(folder.name)
            lang = lang_map.get(folder_key) or args.lang
            if not lang:
                print(f"Skip {folder.name}: language not resolved.")
                continue
            corpus_id = corpus_map.get(folder_key)
            for file_path in sorted(folder.rglob("*.txt")):
                await import_file(
                    session,
                    file_path,
                    folder_key,
                    lang,
                    corpus_id,
                    args.min_words,
                    args.max_words,
                    args.replace,
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import reading texts from .txt files.")
    parser.add_argument("--path", required=True, help="Root folder with corpus directories.")
    parser.add_argument("--lang", default=None, help="Fallback language code (en/ru).")
    parser.add_argument("--min-words", type=int, default=80, help="Minimum words per passage.")
    parser.add_argument("--max-words", type=int, default=140, help="Maximum words per passage.")
    parser.add_argument("--replace", action="store_true", help="Replace existing sources.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    asyncio.run(run_import(args))


if __name__ == "__main__":
    main()
