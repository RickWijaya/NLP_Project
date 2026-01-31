"""Database migration script to add new columns for features."""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv

load_dotenv()

MIGRATIONS = [
    # Admin table
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE",
    
    # ChatMessage table - new fields
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS source_citations JSONB",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS suggested_questions JSONB",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS feedback VARCHAR(20)",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderation_flagged BOOLEAN DEFAULT FALSE",
    "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderation_reason TEXT",
]

async def run_migrations():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/rag_db")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        for migration in MIGRATIONS:
            try:
                await conn.execute(text(migration))
                print(f"✓ {migration[:60]}...")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"- Skipped (exists): {migration[:40]}...")
                else:
                    print(f"✗ Error: {e}")
    
    # Create new tables (analytics_events and chat_attachments will be created by init_db)
    print("\n✓ Column migrations complete!")
    print("Note: New tables will be created automatically on server restart.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migrations())
