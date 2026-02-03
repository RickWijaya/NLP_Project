
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

async def migrate():
    print(f"Connecting to database to add 'token_usage' column...")
    engine = create_async_engine(DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        try:
            print("Checking if 'token_usage' column exists in 'chat_messages' table...")
            # Check if column exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chat_messages' AND column_name='token_usage';
            """))
            
            if result.fetchone():
                print("Column 'token_usage' already exists. Skipping.")
                return

            print("Adding 'token_usage' column to 'chat_messages' table...")
            await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN token_usage INTEGER DEFAULT 0;"))
            print("Migration successful: added 'token_usage' column.")
            
        except Exception as e:
            print(f"Migration failed: {e}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
