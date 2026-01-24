from datetime import datetime

from pydantic import BaseModel


class WeakWordOut(BaseModel):
    word_id: int
    word: str
    translations: list[str]
    wrong_count: int
    correct_count: int
    accuracy: float
    learned_at: datetime | None
    next_review_at: datetime | None


class WeakWordsOut(BaseModel):
    total: int
    items: list[WeakWordOut]


class ReviewPlanItemOut(BaseModel):
    word_id: int
    word: str
    translations: list[str]
    learned_at: datetime | None
    next_review_at: datetime
    stage: int | None = None


class ReviewPlanOut(BaseModel):
    total: int
    items: list[ReviewPlanItemOut]
