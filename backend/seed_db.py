"""
Simple database seeding script.
Run with: python seed_db.py
"""

import asyncio
import sys

async def main():
    try:
        from passlib.context import CryptContext
        # Use pbkdf2_sha256 - more compatible than bcrypt
        pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
        hashed_password = pwd_context.hash("admin123")
        print(f"Password hashed successfully")
        
        from sqlalchemy import text
        from app.database import engine, init_db
        
        # Init tables
        await init_db()
        print("Tables initialized")
        
        async with engine.begin() as conn:
            # Check if admin exists
            result = await conn.execute(
                text("SELECT id FROM admins WHERE username = 'admin'")
            )
            existing = result.fetchone()
            
            if existing:
                # Update password
                await conn.execute(
                    text("UPDATE admins SET hashed_password = :pw WHERE username = 'admin'"),
                    {"pw": hashed_password}
                )
                print("Admin password updated!")
            else:
                # Insert new admin
                await conn.execute(
                    text("""
                        INSERT INTO admins (id, username, email, hashed_password, tenant_id, is_active, created_at)
                        VALUES (gen_random_uuid(), 'admin', 'admin@example.com', :pw, 'default_tenant', true, NOW())
                    """),
                    {"pw": hashed_password}
                )
                print("Admin created!")
            
            # Verify
            result = await conn.execute(text("SELECT username, email, tenant_id FROM admins"))
            for row in result:
                print(f"  Admin: {row[0]} | {row[1]} | tenant: {row[2]}")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("=== Seeding Database ===")
    asyncio.run(main())
    print("\nLogin credentials:")
    print("  Username: admin")
    print("  Password: admin123")
