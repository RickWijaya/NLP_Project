"""
Migration script to add new columns to existing tables.
Run this once to update the database schema.
"""

import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    """Add new columns to existing tables."""
    async with engine.begin() as conn:
        # Add business_name to admins table
        try:
            await conn.execute(text(
                "ALTER TABLE admins ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)"
            ))
            print("Added business_name column to admins table")
        except Exception as e:
            print(f"business_name column might already exist: {e}")
        
        # Make tenant_id unique in admins table if not already
        try:
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_admins_tenant_id_unique ON admins (tenant_id)"
            ))
            print("Added unique constraint to tenant_id")
        except Exception as e:
            print(f"Unique constraint might already exist: {e}")
    
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
