"""add localized corpus names

Revision ID: 3c4d5e6f7a8b
Revises: 0b1c2d3e4f5g
Create Date: 2026-01-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "3c4d5e6f7a8b"
down_revision = "0b1c2d3e4f5g"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("corpora", sa.Column("name_ru", sa.String(length=128), nullable=True))
    op.add_column("corpora", sa.Column("name_en", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("corpora", "name_en")
    op.drop_column("corpora", "name_ru")
