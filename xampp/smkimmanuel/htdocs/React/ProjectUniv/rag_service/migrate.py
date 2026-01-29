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
        
        # Fix model_type column - change from enum to VARCHAR
        try:
            await conn.execute(text(
                "ALTER TABLE tenant_settings ALTER COLUMN model_type TYPE VARCHAR(20) USING model_type::text"
            ))
            print("Changed model_type column to VARCHAR")
        except Exception as e:
            print(f"model_type column might already be VARCHAR or doesn't exist: {e}")
        
        # Drop the old enum type if it exists
        try:
            await conn.execute(text("DROP TYPE IF EXISTS modeltype"))
            print("Dropped modeltype enum type")
        except Exception as e:
            print(f"Could not drop modeltype enum: {e}")
        
        # Create users table if not exists
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    tenant_id VARCHAR(100) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("Created users table")
        except Exception as e:
            print(f"users table might already exist: {e}")
        
        # Create index on users(email, tenant_id)
        try:
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_users_email_tenant ON users (email, tenant_id)"
            ))
            print("Created users email/tenant index")
        except Exception as e:
            print(f"Index might already exist: {e}")
        
        # Add user_id column to chat_sessions if not exists
        try:
            await conn.execute(text(
                "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)"
            ))
            print("Added user_id column to chat_sessions")
        except Exception as e:
            print(f"user_id column might already exist: {e}")
        
        # Create index on chat_sessions(user_id)
        try:
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id ON chat_sessions (user_id)"
            ))
            print("Created chat_sessions user_id index")
        except Exception as e:
            print(f"Index might already exist: {e}")
    
    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
