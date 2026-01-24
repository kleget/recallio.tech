"""user word translations

Revision ID: 6c2d1e4f9a0b
Revises: f3a9b4c2d1e0
Create Date: 2026-01-25 03:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "6c2d1e4f9a0b"
down_revision = "f3a9b4c2d1e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_word_translations",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("word_id", sa.BigInteger(), nullable=False),
        sa.Column("target_lang", sa.String(length=2), nullable=False),
        sa.Column("translation", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["profile_id"], ["learning_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["word_id"], ["words.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_id",
            "word_id",
            "target_lang",
            "translation",
            name="uq_user_word_translations",
        ),
    )
    op.create_index(
        "ix_user_word_translations_profile",
        "user_word_translations",
        ["profile_id"],
        unique=False,
    )
    op.create_index(
        "ix_user_word_translations_word",
        "user_word_translations",
        ["word_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_word_translations_word", table_name="user_word_translations")
    op.drop_index("ix_user_word_translations_profile", table_name="user_word_translations")
    op.drop_table("user_word_translations")
