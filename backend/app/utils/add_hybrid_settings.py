import asyncio
import os
import sys

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from app.database import engine

async def migrate_settings():
    """Add hybrid search columns to tenant_settings table."""
    print("Starting migration...")
    
    async with engine.begin() as conn:
        # Check if columns exist
        print("Checking for existing columns...")
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='tenant_settings'"
        ))
        columns = [row[0] for row in result.fetchall()]
        
        # Add use_hybrid if missing
        if 'use_hybrid' not in columns:
            print("Adding 'use_hybrid' column...")
            await conn.execute(text(
                "ALTER TABLE tenant_settings ADD COLUMN use_hybrid BOOLEAN DEFAULT FALSE"
            ))
        else:
            print("'use_hybrid' column already exists.")
            
        # Add hybrid_alpha if missing
        if 'hybrid_alpha' not in columns:
            print("Adding 'hybrid_alpha' column...")
            await conn.execute(text(
                "ALTER TABLE tenant_settings ADD COLUMN hybrid_alpha FLOAT DEFAULT 0.7"
            ))
        else:
            print("'hybrid_alpha' column already exists.")
            
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_settings())
