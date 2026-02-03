import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.modules.web_search import web_search
from app.modules.prompt import prompt_assembler

async def test_web_search_logic():
    query = "current price of bitcoin"
    
    print(f"--- 1. Testing Web Search Module for: '{query}' ---")
    results = web_search.search(query, max_results=2)
    print(f"Results Found: {bool(results)}")
    if results:
        print(f"Snippet: {results[:200]}...")
    
    print("\n--- 2. Comparisons of Prompts ---")
    
    # Case A: Web Search OFF (No Context)
    prompt_off = prompt_assembler.assemble(
        query=query,
        retrieved_chunks=[],
        web_context=None
    )
    print("\n[Case A: Web Search OFF]")
    print(f"System Prompt Snippet: ...{prompt_off['system'][-200:]}")
    print(f"User Message Context: {prompt_off['user'][:200]}...")
    
    # Case B: Web Search ON
    prompt_on = prompt_assembler.assemble(
        query=query,
        retrieved_chunks=[],
        web_context=results
    )
    print("\n[Case B: Web Search ON]")
    print(f"System Prompt Snippet: ...{prompt_on['system'][-300:]}")
    print(f"User Message Context: {prompt_on['user'][:200]}...")
    
    print("\n--- Conclusion ---")
    print("If System Prompt in Case B contains 'Web Search Information' instructions, logic is working.")

if __name__ == "__main__":
    asyncio.run(test_web_search_logic())
