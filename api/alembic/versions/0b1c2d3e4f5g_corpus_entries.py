"""corpus entries

Revision ID: 0b1c2d3e4f5g
Revises: 7a1b2c3d4e5f
Create Date: 2026-01-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0b1c2d3e4f5g"
down_revision = "7a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "corpus_entries",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("corpus_id", sa.BigInteger(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["corpus_id"], ["corpora.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_corpus_entries_corpus",
        "corpus_entries",
        ["corpus_id"],
        unique=False,
    )
    op.create_table(
        "corpus_entry_terms",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("entry_id", sa.BigInteger(), nullable=False),
        sa.Column("word_id", sa.BigInteger(), nullable=False),
        sa.Column("lang", sa.String(length=2), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["entry_id"], ["corpus_entries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["word_id"], ["words.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entry_id", "word_id", name="uq_corpus_entry_terms_entry_word"),
    )
    op.create_index(
        "ix_corpus_entry_terms_entry_lang",
        "corpus_entry_terms",
        ["entry_id", "lang"],
        unique=False,
    )
    op.create_index(
        "ix_corpus_entry_terms_word",
        "corpus_entry_terms",
        ["word_id"],
        unique=False,
    )
    op.create_index(
        "ix_corpus_entry_terms_lang",
        "corpus_entry_terms",
        ["lang"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_corpus_entry_terms_lang", table_name="corpus_entry_terms")
    op.drop_index("ix_corpus_entry_terms_word", table_name="corpus_entry_terms")
    op.drop_index("ix_corpus_entry_terms_entry_lang", table_name="corpus_entry_terms")
    op.drop_table("corpus_entry_terms")
    op.drop_index("ix_corpus_entries_corpus", table_name="corpus_entries")
    op.drop_table("corpus_entries")
