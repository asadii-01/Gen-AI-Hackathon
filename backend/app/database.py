"""
SQLite database layer for SocraticCanvas.
Uses aiosqlite for async SQLite operations.
"""

import aiosqlite
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)

DATABASE_PATH = "socratic_canvas.db"


async def get_db() -> aiosqlite.Connection:
    """Get a database connection."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Initialize the database — create tables if they don't exist."""
    logger.info("📦 Initializing SQLite database...")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # ── Users Table ──────────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                email           TEXT UNIQUE NOT NULL,
                username        TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                study_domain    TEXT DEFAULT '',
                bio             TEXT DEFAULT '',
                interests       TEXT DEFAULT '[]',
                strengths       TEXT DEFAULT '[]',
                weaknesses      TEXT DEFAULT '[]',
                learning_goals  TEXT DEFAULT '[]',
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL
            )
        """)

        # ── Gap Reports Table ────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS gap_reports (
                id                      TEXT PRIMARY KEY,
                user_id                 TEXT NOT NULL,
                debate_session_id       TEXT NOT NULL,
                topic_title             TEXT DEFAULT '',
                reasoning_blind_spots   TEXT DEFAULT '[]',
                evidence_gaps           TEXT DEFAULT '[]',
                rhetorical_opportunities TEXT DEFAULT '[]',
                follow_up_questions     TEXT DEFAULT '[]',
                recommended_readings    TEXT DEFAULT '[]',
                overall_summary         TEXT DEFAULT '',
                judge_evaluations       TEXT DEFAULT '[]',
                created_at              TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Index for fast lookup of gap reports by user
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_gap_reports_user_id
            ON gap_reports(user_id)
        """)

        await db.commit()

    logger.info("✅ Database initialized successfully.")
