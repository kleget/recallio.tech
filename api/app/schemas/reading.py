from pydantic import BaseModel


class ReadingPreviewRequest(BaseModel):
    target_words: int = 10
    days: int | None = None
    variant: int | None = None


class ReadingPreviewOut(BaseModel):
    title: str = ""
    text: str = ""
    source_title: str | None = None
    corpus_name: str | None = None
    word_count: int = 0
    target_words: int = 0
    target_words_requested: int = 0
    hits: int = 0
    coverage: float = 0.0
    highlight_tokens: list[str] = []
    message: str | None = None
