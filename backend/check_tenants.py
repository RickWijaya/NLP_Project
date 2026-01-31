"""Check existing tenants."""
import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT tenant_id, username, business_name FROM admins"))
        print("Existing tenants:")
        for row in result:
            print(f"  - tenant_id: {row[0]}, username: {row[1]}, business: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check())
