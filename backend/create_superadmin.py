"""Create super admin account."""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

async def create_superadmin():
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    import uuid
    
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/rag_db")
    engine = create_async_engine(db_url)
    
    # Get password hash
    from app.auth.jwt_handler import get_password_hash
    hashed = get_password_hash("sadmin")
    new_id = str(uuid.uuid4())
    
    async with engine.begin() as conn:
        # Check if sadmin exists
        result = await conn.execute(text("SELECT id FROM admins WHERE username = 'sadmin'"))
        existing = result.fetchone()
        
        if existing:
            await conn.execute(
                text("UPDATE admins SET is_super_admin = TRUE, hashed_password = :pwd WHERE username = 'sadmin'"),
                {"pwd": hashed}
            )
            print("✓ Updated sadmin to super admin")
        else:
            await conn.execute(
                text("""
                    INSERT INTO admins (id, username, email, hashed_password, tenant_id, is_active, is_super_admin)
                    VALUES (:id, 'sadmin', 'sadmin@example.com', :pwd, 'superadmin_tenant', TRUE, TRUE)
                """),
                {"id": new_id, "pwd": hashed}
            )
            print("✓ Created super admin: sadmin / sadmin")
    
    await engine.dispose()
    print("✓ Done! Login at /static/superadmin.html")

if __name__ == "__main__":
    asyncio.run(create_superadmin())
