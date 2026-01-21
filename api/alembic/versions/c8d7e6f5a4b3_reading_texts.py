"""add reading texts

Revision ID: c8d7e6f5a4b3
Revises: b7c8d9e0f1a2
Create Date: 2026-01-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "c8d7e6f5a4b3"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reading_sources",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("corpus_id", sa.BigInteger(), nullable=True),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("lang", sa.String(length=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["corpus_id"], ["corpora.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("slug", "lang", name="uq_reading_sources_slug_lang"),
    )
    op.create_index(
        "ix_reading_sources_corpus",
        "reading_sources",
        ["corpus_id"],
    )

    op.create_table(
        "reading_passages",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("source_id", sa.BigInteger(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["reading_sources.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_reading_passages_source_position",
        "reading_passages",
        ["source_id", "position"],
    )

    op.create_table(
        "reading_passage_tokens",
        sa.Column("passage_id", sa.BigInteger(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["passage_id"], ["reading_passages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("passage_id", "token"),
    )
    op.create_index(
        "ix_reading_passage_tokens_token",
        "reading_passage_tokens",
        ["token"],
    )


def downgrade() -> None:
    op.drop_index("ix_reading_passage_tokens_token", table_name="reading_passage_tokens")
    op.drop_table("reading_passage_tokens")
    op.drop_index("ix_reading_passages_source_position", table_name="reading_passages")
    op.drop_table("reading_passages")
    op.drop_index("ix_reading_sources_corpus", table_name="reading_sources")
    op.drop_table("reading_sources")
