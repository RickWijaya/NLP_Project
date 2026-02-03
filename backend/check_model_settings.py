"""Quick script to check current model settings."""
import asyncio
from app.database import async_session_maker
from sqlalchemy import text

async def check():
    async with async_session_maker() as db:
        result = await db.execute(text("SELECT tenant_id, model_type, api_model, local_model FROM tenant_settings"))
        rows = result.fetchall()
        for row in rows:
            print(f"Tenant: {row[0]}, Type: {row[1]}, API: {row[2]}, Local: {row[3]}")

if __name__ == "__main__":
    asyncio.run(check())
