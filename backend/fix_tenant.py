"""Fix tenant_id with leading space."""
import asyncio
from sqlalchemy import text
from app.database import engine

async def fix():
    async with engine.begin() as conn:
        # Fix tenant_id with leading space
        await conn.execute(text("UPDATE admins SET tenant_id = TRIM(tenant_id)"))
        await conn.execute(text("UPDATE tenant_settings SET tenant_id = TRIM(tenant_id)"))
        print("Fixed tenant_id whitespace issues")

if __name__ == "__main__":
    asyncio.run(fix())
