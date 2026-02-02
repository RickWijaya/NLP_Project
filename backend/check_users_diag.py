import asyncio
import os
from app.database import engine
from sqlalchemy import text

async def check_users():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT username, email, is_active FROM admins"))
            users = result.fetchall()
            if not users:
                print("No users found in database.")
            else:
                print("Users in database:")
                for user in users:
                    print(f"  - Username: {user[0]}, Email: {user[1]}, Active: {user[2]}")
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
