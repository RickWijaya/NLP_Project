import asyncio
from sqlalchemy import text
from app.database import async_session_maker

async def migrate():
    print("Starting migration...")
    async with async_session_maker() as session:
        # Add columns to chat_sessions
        try:
            await session.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS context_summary TEXT"))
            await session.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS current_goal VARCHAR(255)"))
            print("Added columns to chat_sessions")
        except Exception as e:
            print(f"Error updating chat_sessions: {e}")

        # Add columns to chat_messages
        try:
            await session.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS intent VARCHAR(50)"))
            # content is already TEXT, changing generic nullability is complex in raw SQL across backends, 
            # but usually adding column is fine.
            # We don't strictly *need* to relax the content constraint in DB if we ensure we always put *something* there,
            # so I will skip altering the constraint for safety unless strictly needed.
            print("Added columns to chat_messages")
        except Exception as e:
            print(f"Error updating chat_messages: {e}")
            
        await session.commit()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
