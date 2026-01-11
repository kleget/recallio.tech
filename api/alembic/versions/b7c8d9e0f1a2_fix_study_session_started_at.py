"""fix study_sessions.started_at

Revision ID: b7c8d9e0f1a2
Revises: 1a2b3c4d5e6f
Create Date: 2026-01-11 19:10:00.000000
"""

from alembic import op

revision = "b7c8d9e0f1a2"
down_revision = "1a2b3c4d5e6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE study_sessions "
        "ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE"
    )
    op.execute(
        "UPDATE study_sessions "
        "SET started_at = COALESCE(started_at, finished_at, now())"
    )
    op.execute(
        "ALTER TABLE study_sessions "
        "ALTER COLUMN started_at SET DEFAULT now()"
    )
    op.execute(
        "ALTER TABLE study_sessions "
        "ALTER COLUMN started_at SET NOT NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE study_sessions DROP COLUMN IF EXISTS started_at")
