"""reading passage blocks

Revision ID: d9b8a7c6e5f4
Revises: c8d7e6f5a4b3
Create Date: 2026-01-22 06:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "d9b8a7c6e5f4"
down_revision = "c8d7e6f5a4b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reading_passage_blocks",
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("passage_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["passage_id"], ["reading_passages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["learning_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("profile_id", "passage_id"),
    )
    op.create_index(
        "ix_reading_passage_blocks_profile",
        "reading_passage_blocks",
        ["profile_id"],
    )
    op.create_index(
        "ix_reading_passage_blocks_passage",
        "reading_passage_blocks",
        ["passage_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_reading_passage_blocks_passage", table_name="reading_passage_blocks")
    op.drop_index("ix_reading_passage_blocks_profile", table_name="reading_passage_blocks")
    op.drop_table("reading_passage_blocks")
