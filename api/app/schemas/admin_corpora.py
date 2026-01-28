from pydantic import BaseModel


class AdminCorpusOut(BaseModel):
    id: int
    slug: str
    name: str
    words_total: int


class AdminCorpusEntryTermOut(BaseModel):
    id: int
    word_id: int
    lemma: str
    lang: str
    is_primary: bool


class AdminCorpusEntryOut(BaseModel):
    entry_id: int
    count: int
    rank: int | None
    terms: list[AdminCorpusEntryTermOut]


class AdminCorpusEntriesOut(BaseModel):
    total: int
    items: list[AdminCorpusEntryOut]
