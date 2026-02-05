"""Clean corpora entries by relative frequency across corpora."""

from __future__ import annotations

import argparse
import re
import shutil
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

SLUG_RE = re.compile(r"_(ru|en)_(ru|en)$", re.IGNORECASE)


@dataclass
class EntryMeta:
    entry_id: int
    corpus_slug: str
    count: int


def parse_direction(slug: str) -> tuple[str | None, str | None]:
    match = SLUG_RE.search(slug or "")
    if not match:
        return None, None
    return match.group(1).lower(), match.group(2).lower()


def load_rows(conn: sqlite3.Connection, query: str):
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    return cur.execute(query).fetchall()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=Path("corpora.db"))
    parser.add_argument("--out", type=Path, default=Path("corpora_clean_freq.db"))
    parser.add_argument("--apply", action="store_true", help="Write cleaned db to --out.")
    parser.add_argument("--min-ratio", type=float, default=0.2)
    parser.add_argument("--min-count", type=int, default=30)
    parser.add_argument("--keep-top", type=int, default=1)
    parser.add_argument("--report", type=Path, default=Path("corpora_clean_freq_report.txt"))
    args = parser.parse_args()

    if args.min_ratio < 0 or args.min_ratio > 1:
        raise SystemExit("--min-ratio must be between 0 and 1.")
    if args.keep_top < 1:
        raise SystemExit("--keep-top must be >= 1.")

    db_path = args.db
    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    conn = sqlite3.connect(db_path)
    entries = load_rows(conn, "SELECT id, corpus_slug, count FROM entries")
    terms = load_rows(conn, "SELECT entry_id, lemma, lang, is_primary FROM terms")
    conn.close()

    primary_by_entry_lang: dict[int, dict[str, str]] = defaultdict(dict)
    for row in terms:
        if not row["is_primary"]:
            continue
        lemma = (row["lemma"] or "").strip()
        lang = (row["lang"] or "").strip().lower()
        if not lemma or not lang:
            continue
        primary_by_entry_lang[int(row["entry_id"])][lang] = lemma

    grouped: dict[tuple[str, str], list[EntryMeta]] = defaultdict(list)
    skipped_entries = 0
    for row in entries:
        entry_id = int(row["id"])
        slug = row["corpus_slug"]
        source_lang, _target_lang = parse_direction(slug)
        if not source_lang:
            skipped_entries += 1
            continue
        lemma = primary_by_entry_lang.get(entry_id, {}).get(source_lang)
        if not lemma:
            skipped_entries += 1
            continue
        grouped[(source_lang, lemma)].append(
            EntryMeta(entry_id=entry_id, corpus_slug=slug, count=int(row["count"] or 0))
        )

    remove_entry_ids: set[int] = set()
    removed_by_corpus: dict[str, int] = defaultdict(int)
    keep_by_corpus: dict[str, int] = defaultdict(int)

    for _key, items in grouped.items():
        items.sort(key=lambda x: x.count, reverse=True)
        if not items:
            continue
        max_count = items[0].count
        keep_ids = {item.entry_id for item in items[: args.keep_top]}
        for item in items:
            if item.entry_id in keep_ids:
                keep_by_corpus[item.corpus_slug] += 1
                continue
            threshold = max_count * args.min_ratio
            if item.count >= threshold or item.count >= args.min_count:
                keep_by_corpus[item.corpus_slug] += 1
                continue
            remove_entry_ids.add(item.entry_id)
            removed_by_corpus[item.corpus_slug] += 1

    report_lines = []
    report_lines.append(f"Entries total: {len(entries)}")
    report_lines.append(f"Skipped entries (no primary source lemma): {skipped_entries}")
    report_lines.append(f"Marked for removal: {len(remove_entry_ids)}")
    report_lines.append("")
    report_lines.append("Removed by corpus:")
    for slug, count in sorted(removed_by_corpus.items(), key=lambda x: x[1], reverse=True):
        report_lines.append(f"  {slug}: {count}")

    report_lines.append("")
    report_lines.append("Kept by corpus:")
    for slug, count in sorted(keep_by_corpus.items(), key=lambda x: x[1], reverse=True):
        report_lines.append(f"  {slug}: {count}")

    args.report.write_text("\n".join(report_lines), encoding="utf-8")

    if not args.apply:
        print("\n".join(report_lines))
        print(f"Dry run. Report saved to {args.report}")
        return

    if args.out.exists():
        args.out.unlink()
    shutil.copy(db_path, args.out)

    out_conn = sqlite3.connect(args.out)
    out_cur = out_conn.cursor()
    if remove_entry_ids:
        ids = ",".join(str(entry_id) for entry_id in remove_entry_ids)
        out_cur.execute(f"DELETE FROM terms WHERE entry_id IN ({ids})")
        out_cur.execute(f"DELETE FROM entries WHERE id IN ({ids})")
    out_conn.commit()
    out_conn.close()

    print("\n".join(report_lines))
    print(f"Cleaned db saved to {args.out}")


if __name__ == "__main__":
    main()
