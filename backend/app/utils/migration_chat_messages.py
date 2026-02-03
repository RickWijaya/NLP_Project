
import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings

settings = get_settings()

# Direct connection for migration
DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

# All columns that need to be added to chat_messages table
COLUMNS_TO_ADD = [
    ("intent", "VARCHAR(50)"),
    ("token_usage", "INTEGER DEFAULT 0"),
    ("processing_time_ms", "FLOAT"),
    ("rating", "INTEGER"),
    ("feedback_text", "VARCHAR(500)"),
]

async def migrate():
    print(f"Connecting to database to add missing columns...")
    engine = create_async_engine(DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        for column_name, column_type in COLUMNS_TO_ADD:
            try:
                print(f"Checking if '{column_name}' column exists in 'chat_messages' table...")
                # Check if column exists
                result = await conn.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='chat_messages' AND column_name='{column_name}';
                """))
                
                if result.fetchone():
                    print(f"Column '{column_name}' already exists. Skipping.")
                    continue

                print(f"Adding '{column_name}' column to 'chat_messages' table...")
                await conn.execute(text(f"ALTER TABLE chat_messages ADD COLUMN {column_name} {column_type};"))
                print(f"Migration successful: added '{column_name}' column.")
                
            except Exception as e:
                print(f"Migration failed for '{column_name}': {e}")
    
    await engine.dispose()
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
