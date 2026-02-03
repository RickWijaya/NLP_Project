
import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.modules.web_search import web_search
from app.utils.logger import logger

async def test_search_async():
    query = "latest price of Bitcoin"
    print(f"Testing search for: '{query}'")
    
    try:
        results = await web_search.search(query)
        print(f"Results type: {type(results)}")
        print(f"Results count: {len(results)}")
        
        if results:
            print("First result:", results[0])
        else:
            print("No results returned.")
            
        formatted = web_search.format_for_context(results)
        print("\nFormatted Context:")
        print(formatted[:200] + "...")
        
    except Exception as e:
        print(f"Error during search: {e}")

if __name__ == "__main__":
    asyncio.run(test_search_async())
