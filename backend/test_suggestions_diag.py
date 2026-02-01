import sys
import os

# Add the project directory to sys.path
sys.path.append(os.getcwd())

from app.modules.suggestions import generate_suggestions
import asyncio

async def test():
    print("Testing English with professional question...")
    en_sug = generate_suggestions("What are the system requirements?", "The software requires 8GB RAM.")
    print(f"English suggestions: {en_sug}")
    
    print("\nTesting Indonesian...")
    id_sug = generate_suggestions("Apa syarat sistemnya?", "Perangkat lunak ini butuh RAM 8GB.")
    print(f"Indonesian suggestions: {id_sug}")

if __name__ == "__main__":
    asyncio.run(test())
