from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, exists, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.auth import get_current_user
from app.core.audit import log_audit_event
from app.core.config import ADMIN_EMAILS
from app.db.session import get_db
from app.models import (
    ContentReport,
    Corpus,
    CorpusEntry,
    CorpusEntryTerm,
    CorpusWordStat,
    ReviewEvent,
    Translation,
    User,
    UserCustomWord,
    UserWordTranslation,
    UserWord,
    Word,
)
from app.schemas.admin_content import (
    AdminEntryTermCreate,
    AdminEntryTermUpdate,
    AdminTranslationCreate,
    AdminTranslationOut,
    AdminTranslationUpdate,
    AdminWordOut,
    AdminWordUpdate,
)
from app.schemas.admin_corpora import (
    AdminCorpusOut,
    AdminCorpusEntryOut,
    AdminCorpusEntryTermOut,
    AdminCorpusEntriesOut,
)

router = APIRouter(prefix="/admin/content", tags=["admin"])


def ensure_admin(user: User) -> None:
    if user.email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


LANG_CODES = {"ru", "en"}


def normalize_lang(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized not in LANG_CODES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid language")
    return normalized


def resolve_corpus_name(corpus: Corpus, ui_lang: str | None) -> str:
    if ui_lang == "ru" and getattr(corpus, "name_ru", None):
        return corpus.name_ru
    if ui_lang == "en" and getattr(corpus, "name_en", None):
        return corpus.name_en
    return corpus.name


@router.get("/corpora", response_model=list[AdminCorpusOut])
async def list_corpora(
    source_lang: str | None = None,
    ui_lang: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AdminCorpusOut]:
    ensure_admin(user)
    source_lang = normalize_lang(source_lang) if source_lang else None
    ui_lang = normalize_lang(ui_lang) if ui_lang else None
    stmt = (
        select(
            Corpus.id,
            Corpus.slug,
            Corpus.name,
            Corpus.name_ru,
            Corpus.name_en,
            func.count(CorpusEntry.id).label("words_total"),
        )
        .select_from(Corpus)
        .join(CorpusEntry, CorpusEntry.corpus_id == Corpus.id, isouter=True)
        .group_by(Corpus.id, Corpus.slug, Corpus.name, Corpus.name_ru, Corpus.name_en)
        .order_by(Corpus.name)
    )
    result = await db.execute(stmt)
    return [
        AdminCorpusOut(
            id=row.id,
            slug=row.slug,
            name=resolve_corpus_name(row, ui_lang),
            words_total=row.words_total,
        )
        for row in result.fetchall()
    ]


@router.get("/corpora/{corpus_id}/words", response_model=AdminCorpusEntriesOut)
async def list_corpus_words(
    corpus_id: int,
    query: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "rank",
    order: str | None = None,
    source_lang: str | None = None,
    target_lang: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminCorpusEntriesOut:
    ensure_admin(user)
    if limit < 1 or limit > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid limit")
    if offset < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid offset")

    source_lang = normalize_lang(source_lang) if source_lang else None
    if not source_lang:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language required")
    target_lang = normalize_lang(target_lang) if target_lang else None

    corpus_result = await db.execute(select(Corpus.id).where(Corpus.id == corpus_id))
    corpus = corpus_result.first()
    if not corpus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Corpus not found")

    source_term = aliased(CorpusEntryTerm)
    source_word = aliased(Word)
    stmt = (
        select(
            CorpusEntry.id.label("entry_id"),
            CorpusEntry.count,
            CorpusEntry.rank,
        )
        .select_from(CorpusEntry)
        .where(CorpusEntry.corpus_id == corpus_id)
    )

    if query and query.strip():
        like = f"%{query.strip()}%"
        term_alias = aliased(CorpusEntryTerm)
        word_alias = aliased(Word)
        term_match = exists(
            select(1)
            .select_from(term_alias)
            .join(word_alias, word_alias.id == term_alias.word_id)
            .where(term_alias.entry_id == CorpusEntry.id, word_alias.lemma.ilike(like))
        )
        stmt = stmt.where(term_match)

    if sort not in {"rank", "count", "lemma"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort")
    order_dir = (order or ("desc" if sort == "count" else "asc")).lower()
    if order_dir not in {"asc", "desc"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order")

    if sort == "count":
        sort_col = CorpusEntry.count
    elif sort == "lemma":
        stmt = stmt.join(
            source_term,
            (source_term.entry_id == CorpusEntry.id)
            & (source_term.lang == source_lang)
            & (source_term.is_primary.is_(True)),
            isouter=True,
        ).join(source_word, source_word.id == source_term.word_id, isouter=True)
        sort_col = source_word.lemma
    else:
        sort_col = CorpusEntry.rank

    order_expr = sort_col.desc() if order_dir == "desc" else sort_col.asc()
    if sort in {"rank", "lemma"}:
        order_expr = order_expr.nulls_last()

    stmt = stmt.order_by(order_expr, CorpusEntry.count.desc(), CorpusEntry.id.asc())

    count_stmt = select(func.count()).select_from(CorpusEntry).where(CorpusEntry.corpus_id == corpus_id)
    if query and query.strip():
        like = f"%{query.strip()}%"
        term_alias = aliased(CorpusEntryTerm)
        word_alias = aliased(Word)
        count_stmt = count_stmt.where(
            exists(
                select(1)
                .select_from(term_alias)
                .join(word_alias, word_alias.id == term_alias.word_id)
                .where(term_alias.entry_id == CorpusEntry.id, word_alias.lemma.ilike(like))
            )
        )
    total_result = await db.execute(count_stmt)
    total_count = int(total_result.scalar_one() or 0)

    rows = await db.execute(stmt.limit(limit).offset(offset))
    items = rows.fetchall()
    entry_ids = [row.entry_id for row in items]
    if not entry_ids:
        return AdminCorpusEntriesOut(total=total_count, items=[])

    terms_result = await db.execute(
        select(
            CorpusEntryTerm.id,
            CorpusEntryTerm.entry_id,
            CorpusEntryTerm.word_id,
            CorpusEntryTerm.lang,
            CorpusEntryTerm.is_primary,
            Word.lemma,
        )
        .select_from(CorpusEntryTerm)
        .join(Word, Word.id == CorpusEntryTerm.word_id)
        .where(CorpusEntryTerm.entry_id.in_(entry_ids))
        .order_by(
            CorpusEntryTerm.entry_id,
            CorpusEntryTerm.lang,
            CorpusEntryTerm.is_primary.desc(),
            Word.lemma.asc(),
        )
    )
    term_map: dict[int, list[AdminCorpusEntryTermOut]] = {}
    for row in terms_result.fetchall():
        term_map.setdefault(row.entry_id, []).append(
            AdminCorpusEntryTermOut(
                id=row.id,
                word_id=row.word_id,
                lemma=row.lemma,
                lang=row.lang,
                is_primary=row.is_primary,
            )
        )

    payload = [
        AdminCorpusEntryOut(
            entry_id=row.entry_id,
            count=row.count,
            rank=row.rank,
            terms=term_map.get(row.entry_id, []),
        )
        for row in items
    ]
    return AdminCorpusEntriesOut(total=total_count, items=payload)


STATUS_PRIORITY = {"known": 3, "learned": 2, "new": 1}


def status_rank(value: str | None) -> int:
    if not value:
        return 1
    return STATUS_PRIORITY.get(value, 1)


def is_better_progress(source: UserWord, target: UserWord) -> bool:
    if status_rank(source.status) != status_rank(target.status):
        return status_rank(source.status) > status_rank(target.status)
    if (source.repetitions or 0) != (target.repetitions or 0):
        return (source.repetitions or 0) > (target.repetitions or 0)
    if (source.stage or 0) != (target.stage or 0):
        return (source.stage or 0) > (target.stage or 0)
    return False


def copy_progress(target: UserWord, source: UserWord) -> None:
    target.status = source.status
    target.stage = source.stage
    target.repetitions = source.repetitions
    target.interval_days = source.interval_days
    target.ease_factor = source.ease_factor
    target.learned_at = source.learned_at
    target.last_review_at = source.last_review_at
    target.next_review_at = source.next_review_at
    target.correct_streak = source.correct_streak
    target.wrong_streak = source.wrong_streak


async def word_has_user_data(db: AsyncSession, word_id: int) -> bool:
    stmt = select(
        or_(
            exists(select(1).where(UserWord.word_id == word_id)),
            exists(select(1).where(UserCustomWord.word_id == word_id)),
            exists(select(1).where(UserWordTranslation.word_id == word_id)),
            exists(select(1).where(ReviewEvent.word_id == word_id)),
        )
    )
    return bool(await db.scalar(stmt))


async def word_has_corpora(db: AsyncSession, word_id: int) -> bool:
    stmt = select(
        or_(
            exists(select(1).where(CorpusWordStat.word_id == word_id)),
            exists(select(1).where(CorpusEntryTerm.word_id == word_id)),
        )
    )
    return bool(await db.scalar(stmt))


async def missing_user_translations(db: AsyncSession, word_id: int, target_lang: str) -> bool:
    missing = exists(
        select(1)
        .select_from(UserWord)
        .where(UserWord.word_id == word_id)
        .where(
            ~exists(
                select(1).where(
                    UserWordTranslation.profile_id == UserWord.profile_id,
                    UserWordTranslation.word_id == UserWord.word_id,
                    UserWordTranslation.target_lang == target_lang,
                )
            )
        )
    )
    return bool(await db.scalar(select(missing)))


async def detach_word_from_corpora(db: AsyncSession, word_id: int) -> int:
    removed_stats = await db.execute(delete(CorpusWordStat).where(CorpusWordStat.word_id == word_id))
    entry_ids = await db.execute(
        select(CorpusEntryTerm.entry_id).where(CorpusEntryTerm.word_id == word_id)
    )
    ids = [row[0] for row in entry_ids.fetchall()]
    removed_terms = await db.execute(delete(CorpusEntryTerm).where(CorpusEntryTerm.word_id == word_id))
    if ids:
        await db.execute(
            delete(CorpusEntry).where(
                CorpusEntry.id.in_(ids),
                ~exists(select(1).where(CorpusEntryTerm.entry_id == CorpusEntry.id)),
            )
        )
    return int((removed_stats.rowcount or 0) + (removed_terms.rowcount or 0))


async def copy_translations(db: AsyncSession, source_id: int, target_id: int) -> None:
    rows = await db.execute(
        select(Translation.translation, Translation.target_lang, Translation.source).where(
            Translation.word_id == source_id
        )
    )
    values = [
        {
            "word_id": target_id,
            "translation": row.translation,
            "target_lang": row.target_lang,
            "source": row.source,
        }
        for row in rows.fetchall()
    ]
    if not values:
        return
    stmt = insert(Translation).values(values)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=["word_id", "target_lang", "translation"]
    )
    await db.execute(stmt)


async def move_corpus_stats(db: AsyncSession, source_id: int, target_id: int) -> None:
    stat_target = aliased(CorpusWordStat)
    await db.execute(
        update(CorpusWordStat)
        .where(CorpusWordStat.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (stat_target.corpus_id == CorpusWordStat.corpus_id)
                    & (stat_target.word_id == target_id)
                )
            )
        )
        .values(word_id=target_id)
    )
    stat_source = aliased(CorpusWordStat)
    stat_target = aliased(CorpusWordStat)
    stat_rows = await db.execute(
        select(stat_source, stat_target)
        .join(
            stat_target,
            (stat_target.word_id == target_id)
            & (stat_target.corpus_id == stat_source.corpus_id),
        )
        .where(stat_source.word_id == source_id)
    )
    for source_row, target_row in stat_rows.all():
        target_row.count = max(target_row.count or 0, source_row.count or 0)
        if source_row.rank is not None:
            if target_row.rank is None or source_row.rank < target_row.rank:
                target_row.rank = source_row.rank
        await db.delete(source_row)

    await move_entry_terms(db, source_id, target_id)


async def move_entry_terms(db: AsyncSession, source_id: int, target_id: int) -> None:
    term_target = aliased(CorpusEntryTerm)
    await db.execute(
        update(CorpusEntryTerm)
        .where(CorpusEntryTerm.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (term_target.entry_id == CorpusEntryTerm.entry_id)
                    & (term_target.word_id == target_id)
                )
            )
        )
        .values(word_id=target_id)
    )
    term_target = aliased(CorpusEntryTerm)
    dup_rows = await db.execute(
        select(CorpusEntryTerm, term_target)
        .join(
            term_target,
            (term_target.entry_id == CorpusEntryTerm.entry_id)
            & (term_target.word_id == target_id),
        )
        .where(CorpusEntryTerm.word_id == source_id)
    )
    for source_row, target_row in dup_rows.all():
        if source_row.is_primary and not target_row.is_primary:
            target_row.is_primary = True
        await db.delete(source_row)


async def merge_words(db: AsyncSession, source_id: int, target_id: int) -> None:
    if source_id == target_id:
        return

    t_src = aliased(Translation)
    t_tgt = aliased(Translation)
    dup_result = await db.execute(
        select(t_src.id, t_tgt.id).join(
            t_tgt,
            (t_src.translation == t_tgt.translation)
            & (t_src.target_lang == t_tgt.target_lang)
            & (t_tgt.word_id == target_id),
        ).where(t_src.word_id == source_id)
    )
    dup_pairs = dup_result.all()
    if dup_pairs:
        for source_translation_id, target_translation_id in dup_pairs:
            await db.execute(
                update(ContentReport)
                .where(ContentReport.translation_id == source_translation_id)
                .values(translation_id=target_translation_id)
            )
        await db.execute(
            delete(Translation).where(Translation.id.in_([row[0] for row in dup_pairs]))
        )
    await db.execute(
        update(Translation).where(Translation.word_id == source_id).values(word_id=target_id)
    )

    stat_target = aliased(CorpusWordStat)
    await db.execute(
        update(CorpusWordStat)
        .where(CorpusWordStat.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (stat_target.corpus_id == CorpusWordStat.corpus_id)
                    & (stat_target.word_id == target_id)
                )
            )
        )
        .values(word_id=target_id)
    )
    stat_source = aliased(CorpusWordStat)
    stat_target = aliased(CorpusWordStat)
    stat_rows = await db.execute(
        select(stat_source, stat_target)
        .join(
            stat_target,
            (stat_target.word_id == target_id)
            & (stat_target.corpus_id == stat_source.corpus_id),
        )
        .where(stat_source.word_id == source_id)
    )
    for source_row, target_row in stat_rows.all():
        target_row.count = max(target_row.count or 0, source_row.count or 0)
        if source_row.rank is not None:
            if target_row.rank is None or source_row.rank < target_row.rank:
                target_row.rank = source_row.rank
        await db.delete(source_row)

    custom_target = aliased(UserCustomWord)
    await db.execute(
        update(UserCustomWord)
        .where(UserCustomWord.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (custom_target.profile_id == UserCustomWord.profile_id)
                    & (custom_target.word_id == target_id)
                    & (custom_target.target_lang == UserCustomWord.target_lang)
                )
            )
        )
        .values(word_id=target_id)
    )
    custom_source = aliased(UserCustomWord)
    custom_target = aliased(UserCustomWord)
    custom_rows = await db.execute(
        select(custom_source)
        .join(
            custom_target,
            (custom_target.word_id == target_id)
            & (custom_target.profile_id == custom_source.profile_id)
            & (custom_target.target_lang == custom_source.target_lang),
        )
        .where(custom_source.word_id == source_id)
    )
    for row in custom_rows.scalars().all():
        await db.delete(row)

    trans_target = aliased(UserWordTranslation)
    await db.execute(
        update(UserWordTranslation)
        .where(UserWordTranslation.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (trans_target.profile_id == UserWordTranslation.profile_id)
                    & (trans_target.word_id == target_id)
                    & (trans_target.target_lang == UserWordTranslation.target_lang)
                    & (trans_target.translation == UserWordTranslation.translation)
                )
            )
        )
        .values(word_id=target_id)
    )
    trans_source = aliased(UserWordTranslation)
    trans_target = aliased(UserWordTranslation)
    trans_rows = await db.execute(
        select(trans_source)
        .join(
            trans_target,
            (trans_target.word_id == target_id)
            & (trans_target.profile_id == trans_source.profile_id)
            & (trans_target.target_lang == trans_source.target_lang)
            & (trans_target.translation == trans_source.translation),
        )
        .where(trans_source.word_id == source_id)
    )
    for row in trans_rows.scalars().all():
        await db.delete(row)

    user_target = aliased(UserWord)
    await db.execute(
        update(UserWord)
        .where(UserWord.word_id == source_id)
        .where(
            ~exists(
                select(1).where(
                    (user_target.profile_id == UserWord.profile_id)
                    & (user_target.word_id == target_id)
                )
            )
        )
        .values(word_id=target_id)
    )
    user_source = aliased(UserWord)
    user_target = aliased(UserWord)
    user_rows = await db.execute(
        select(user_source, user_target)
        .join(
            user_target,
            (user_target.profile_id == user_source.profile_id) & (user_target.word_id == target_id),
        )
        .where(user_source.word_id == source_id)
    )
    for source_row, target_row in user_rows.all():
        if is_better_progress(source_row, target_row):
            copy_progress(target_row, source_row)
        await db.delete(source_row)

    await db.execute(
        update(ReviewEvent).where(ReviewEvent.word_id == source_id).values(word_id=target_id)
    )
    await db.execute(
        update(ContentReport).where(ContentReport.word_id == source_id).values(word_id=target_id)
    )

    source_word = await db.get(Word, source_id)
    if source_word:
        await db.delete(source_word)


@router.patch("/words/{word_id}", response_model=AdminWordOut)
async def update_word(
    word_id: int,
    data: AdminWordUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminWordOut:
    ensure_admin(user)
    lemma = (data.lemma or "").strip()
    if not lemma:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma required")
    if len(lemma) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma too long")

    word = await db.get(Word, word_id)
    if word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found")

    existing = await db.execute(
        select(Word).where(
            Word.lemma == lemma,
            Word.lang == word.lang,
            Word.id != word.id,
        )
    )
    existing_word = existing.scalar_one_or_none()
    in_use = await word_has_user_data(db, word.id)

    if existing_word:
        if in_use:
            await copy_translations(db, word.id, existing_word.id)
            await move_corpus_stats(db, word.id, existing_word.id)
            await move_entry_terms(db, word.id, existing_word.id)
            await db.commit()
            await log_audit_event(
                "admin.word.corpus_reassign",
                user_id=user.id,
                meta={"source_word_id": word.id, "target_word_id": existing_word.id},
                request=request,
                db=db,
            )
            return AdminWordOut(
                id=existing_word.id, lemma=existing_word.lemma, lang=existing_word.lang
            )
        await merge_words(db, word.id, existing_word.id)
        await db.commit()
        await log_audit_event(
            "admin.word.merge",
            user_id=user.id,
            meta={"source_word_id": word.id, "target_word_id": existing_word.id},
            request=request,
            db=db,
        )
        return AdminWordOut(id=existing_word.id, lemma=existing_word.lemma, lang=existing_word.lang)

    if in_use:
        if not await word_has_corpora(db, word.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Word is already used by learners; create a new word instead.",
            )
        new_word = Word(lemma=lemma, lang=word.lang)
        db.add(new_word)
        await db.flush()
        await copy_translations(db, word.id, new_word.id)
        await move_corpus_stats(db, word.id, new_word.id)
        await move_entry_terms(db, word.id, new_word.id)
        await db.commit()
        await log_audit_event(
            "admin.word.clone",
            user_id=user.id,
            meta={"source_word_id": word.id, "target_word_id": new_word.id},
            request=request,
            db=db,
        )
        return AdminWordOut(id=new_word.id, lemma=new_word.lemma, lang=new_word.lang)

    word.lemma = lemma
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Word already exists") from exc
    except DataError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid lemma") from exc

    await log_audit_event(
        "admin.word.update",
        user_id=user.id,
        meta={"word_id": word.id},
        request=request,
        db=db,
    )
    return AdminWordOut(id=word.id, lemma=word.lemma, lang=word.lang)


@router.post("/entries/{entry_id}/terms", response_model=AdminCorpusEntryTermOut)
async def create_entry_term(
    entry_id: int,
    data: AdminEntryTermCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminCorpusEntryTermOut:
    ensure_admin(user)
    lemma = (data.lemma or "").strip()
    if not lemma:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma required")
    if len(lemma) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma too long")

    lang = normalize_lang(data.lang)

    entry = await db.get(CorpusEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    word_result = await db.execute(select(Word).where(Word.lemma == lemma, Word.lang == lang))
    word = word_result.scalar_one_or_none()
    if word is None:
        word = Word(lemma=lemma, lang=lang)
        db.add(word)
        await db.flush()

    existing = await db.execute(
        select(CorpusEntryTerm).where(
            CorpusEntryTerm.entry_id == entry_id,
            CorpusEntryTerm.word_id == word.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Term already exists")

    is_primary = bool(data.is_primary) if data.is_primary is not None else False
    if not is_primary:
        has_primary = await db.scalar(
            select(exists())
            .select_from(CorpusEntryTerm)
            .where(
                CorpusEntryTerm.entry_id == entry_id,
                CorpusEntryTerm.lang == lang,
                CorpusEntryTerm.is_primary.is_(True),
            )
        )
        if not has_primary:
            is_primary = True

    term = CorpusEntryTerm(
        entry_id=entry_id,
        word_id=word.id,
        lang=lang,
        is_primary=is_primary,
    )
    db.add(term)

    if is_primary:
        await db.execute(
            update(CorpusEntryTerm)
            .where(
                CorpusEntryTerm.entry_id == entry_id,
                CorpusEntryTerm.lang == lang,
                CorpusEntryTerm.id != term.id,
            )
            .values(is_primary=False)
        )

    await db.commit()
    await db.refresh(term)

    await log_audit_event(
        "admin.entry_term.create",
        user_id=user.id,
        meta={"entry_id": entry_id, "term_id": term.id},
        request=request,
        db=db,
    )

    return AdminCorpusEntryTermOut(
        id=term.id,
        word_id=term.word_id,
        lemma=word.lemma,
        lang=term.lang,
        is_primary=term.is_primary,
    )


@router.patch("/entries/{entry_id}/terms/{term_id}", response_model=AdminCorpusEntryTermOut)
async def update_entry_term(
    entry_id: int,
    term_id: int,
    data: AdminEntryTermUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminCorpusEntryTermOut:
    ensure_admin(user)
    term = await db.get(CorpusEntryTerm, term_id)
    if term is None or term.entry_id != entry_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")

    word = await db.get(Word, term.word_id)
    if word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found")

    if data.lemma is not None:
        lemma = data.lemma.strip()
        if not lemma:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma required")
        if len(lemma) > 255:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lemma too long")

        existing = await db.execute(select(Word).where(Word.lemma == lemma, Word.lang == term.lang))
        next_word = existing.scalar_one_or_none()
        if next_word is None:
            next_word = Word(lemma=lemma, lang=term.lang)
            db.add(next_word)
            await db.flush()

        if next_word.id != term.word_id:
            duplicate = await db.execute(
                select(CorpusEntryTerm).where(
                    CorpusEntryTerm.entry_id == entry_id,
                    CorpusEntryTerm.word_id == next_word.id,
                )
            )
            if duplicate.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Term already exists",
                )
            term.word_id = next_word.id
            word = next_word

    if data.is_primary is not None:
        term.is_primary = bool(data.is_primary)
        if term.is_primary:
            await db.execute(
                update(CorpusEntryTerm)
                .where(
                    CorpusEntryTerm.entry_id == entry_id,
                    CorpusEntryTerm.lang == term.lang,
                    CorpusEntryTerm.id != term.id,
                )
                .values(is_primary=False)
            )

    await db.commit()
    await db.refresh(term)

    if data.is_primary is False:
        has_primary = await db.scalar(
            select(exists())
            .select_from(CorpusEntryTerm)
            .where(
                CorpusEntryTerm.entry_id == entry_id,
                CorpusEntryTerm.lang == term.lang,
                CorpusEntryTerm.is_primary.is_(True),
            )
        )
        if not has_primary:
            replacement = await db.execute(
                select(CorpusEntryTerm)
                .where(
                    CorpusEntryTerm.entry_id == entry_id,
                    CorpusEntryTerm.lang == term.lang,
                )
                .order_by(CorpusEntryTerm.id.asc())
                .limit(1)
            )
            fallback = replacement.scalar_one_or_none()
            if fallback:
                fallback.is_primary = True
                await db.commit()
                term = fallback
                word = await db.get(Word, term.word_id)

    await log_audit_event(
        "admin.entry_term.update",
        user_id=user.id,
        meta={"entry_id": entry_id, "term_id": term.id},
        request=request,
        db=db,
    )

    return AdminCorpusEntryTermOut(
        id=term.id,
        word_id=term.word_id,
        lemma=word.lemma if word else "",
        lang=term.lang,
        is_primary=term.is_primary,
    )


@router.delete("/entries/{entry_id}/terms/{term_id}")
async def delete_entry_term(
    entry_id: int,
    term_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    ensure_admin(user)
    term = await db.get(CorpusEntryTerm, term_id)
    if term is None or term.entry_id != entry_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found")

    was_primary = term.is_primary
    lang = term.lang
    await db.delete(term)
    await db.flush()

    if was_primary:
        replacement = await db.execute(
            select(CorpusEntryTerm)
            .where(CorpusEntryTerm.entry_id == entry_id, CorpusEntryTerm.lang == lang)
            .order_by(CorpusEntryTerm.id.asc())
            .limit(1)
        )
        fallback = replacement.scalar_one_or_none()
        if fallback:
            fallback.is_primary = True

    remaining = await db.scalar(
        select(func.count()).select_from(CorpusEntryTerm).where(CorpusEntryTerm.entry_id == entry_id)
    )
    if remaining == 0:
        entry = await db.get(CorpusEntry, entry_id)
        if entry:
            await db.delete(entry)

    await db.commit()

    await log_audit_event(
        "admin.entry_term.delete",
        user_id=user.id,
        meta={"entry_id": entry_id, "term_id": term_id},
        request=request,
        db=db,
    )
    return {"status": "ok"}


@router.patch("/translations/{translation_id}", response_model=AdminTranslationOut)
async def update_translation(
    translation_id: int,
    data: AdminTranslationUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminTranslationOut:
    ensure_admin(user)
    value = (data.translation or "").strip()
    if not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation required")

    translation = await db.get(Translation, translation_id)
    if translation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation not found")

    if await missing_user_translations(db, translation.word_id, translation.target_lang):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Translation is used by learners without snapshots.",
        )

    existing = await db.execute(
        select(Translation).where(
            Translation.word_id == translation.word_id,
            Translation.target_lang == translation.target_lang,
            Translation.translation == value,
            Translation.id != translation.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation already exists")

    translation.translation = value
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation already exists") from exc

    await log_audit_event(
        "admin.translation.update",
        user_id=user.id,
        meta={"translation_id": translation.id},
        request=request,
        db=db,
    )
    return AdminTranslationOut(
        id=translation.id,
        word_id=translation.word_id,
        target_lang=translation.target_lang,
        translation=translation.translation,
    )


@router.post("/translations", response_model=AdminTranslationOut)
async def create_translation(
    data: AdminTranslationCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminTranslationOut:
    ensure_admin(user)
    value = (data.translation or "").strip()
    if not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation required")
    target_lang = normalize_lang(data.target_lang)

    word = await db.get(Word, data.word_id)
    if word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found")

    existing = await db.execute(
        select(Translation).where(
            Translation.word_id == data.word_id,
            Translation.target_lang == target_lang,
            Translation.translation == value,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation already exists")

    translation = Translation(
        word_id=data.word_id,
        target_lang=target_lang,
        translation=value,
        source="admin",
    )
    db.add(translation)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Translation already exists") from exc
    await db.refresh(translation)

    await log_audit_event(
        "admin.translation.create",
        user_id=user.id,
        meta={"translation_id": translation.id},
        request=request,
        db=db,
    )
    return AdminTranslationOut(
        id=translation.id,
        word_id=translation.word_id,
        target_lang=translation.target_lang,
        translation=translation.translation,
    )


@router.delete("/words/{word_id}")
async def delete_word(
    word_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    ensure_admin(user)
    word = await db.get(Word, word_id)
    if word is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Word not found")

    if await word_has_user_data(db, word_id):
        removed = await detach_word_from_corpora(db, word_id)
        await db.commit()
        await log_audit_event(
            "admin.word.detach",
            user_id=user.id,
            meta={"word_id": word_id, "removed_from_corpora": removed},
            request=request,
            db=db,
        )
        return {"status": "detached", "removed_from_corpora": removed}

    await db.delete(word)
    await db.commit()

    await log_audit_event(
        "admin.word.delete",
        user_id=user.id,
        meta={"word_id": word_id},
        request=request,
        db=db,
    )
    return {"status": "ok"}


@router.delete("/translations/{translation_id}")
async def delete_translation(
    translation_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    ensure_admin(user)
    translation = await db.get(Translation, translation_id)
    if translation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation not found")

    if await missing_user_translations(db, translation.word_id, translation.target_lang):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Translation is used by learners without snapshots.",
        )

    await db.delete(translation)
    await db.commit()

    await log_audit_event(
        "admin.translation.delete",
        user_id=user.id,
        meta={"translation_id": translation_id},
        request=request,
        db=db,
    )
    return {"status": "ok"}
