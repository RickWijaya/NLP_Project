import asyncio
import uuid
import json
from app.database import async_session_maker
from app.modules.intelligence import intelligence

async def test_intelligence():
    print("--- Testing Intelligence Module ---")
    
    # Test 1: Intent Recognition
    print("\n[Test 1] Intent Recognition")
    queries = [
        "Hello there!",
        "How do I reset my password?",
        "This service is terrible.",
        "That's all for now, thanks.",
        "Can you clarify that?"
    ]
    
    for q in queries:
        intents = await intelligence.classify_intent(q, [])
        print(f"Query: '{q}' -> Intents: {intents}")

    # Test 2: Context Extraction
    print("\n[Test 2] Context Extraction")
    history = [
        {"role": "user", "content": "I have an issue with my laptop."},
        {"role": "assistant", "content": "What seems to be the problem?"}
    ]
    query = "The screen is flickering."
    summary = await intelligence.extract_context(query, history, "User has laptop issue.")
    print(f"Context Update: {summary}")

    # Test 3: Summarization
    print("\n[Test 3] Summarization")
    full_history = history + [
        {"role": "user", "content": "The screen is flickering."},
        {"role": "assistant", "content": "Try updating your drivers."},
        {"role": "user", "content": "That worked, thanks!"}
    ]
    summary = await intelligence.generate_conversation_summary(full_history)
    print(f"Summary: {summary}")
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    asyncio.run(test_intelligence())
