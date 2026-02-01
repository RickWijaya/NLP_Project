import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add the project directory to sys.path
sys.path.append(os.getcwd())

from app.models.document import ChatSession
from app.routers.chat import generate_session_title

async def test():
    print("Testing Session Title Generation...")
    question = "How do I calculate the area of a circle?"
    answer = "To calculate the area of a circle, use the formula A = πr², where r is the radius."
    
    title = await generate_session_title(question, answer)
    print(f"Generated Title: '{title}'")
    
    question2 = "What are the benefits of drinking water?"
    answer2 = "Drinking water helps maintain fluid balance, boosts energy, and improves skin health."
    
    title2 = await generate_session_title(question2, answer2)
    print(f"Generated Title 2: '{title2}'")

if __name__ == "__main__":
    asyncio.run(test())
