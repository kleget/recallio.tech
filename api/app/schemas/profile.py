from pydantic import BaseModel


class ProfileOut(BaseModel):
    interface_lang: str
    theme: str


class ProfileAvatarOut(BaseModel):
    avatar_url: str | None


class ProfileUpdateRequest(BaseModel):
    interface_lang: str | None = None
    theme: str | None = None
