"""
Intelligence module for advanced chatbot features.
Handles intent recognition, context extraction, and conversation summarization.
"""

from typing import List, Dict, Optional
import json
from app.modules.llm import llm_generator
from app.modules.local_llm import local_llm_generator
from app.utils.logger import logger

class Intelligence:
    """
    Intelligence engine for the chatbot.
    """
    
    SYSTEM_PROMPT = """You are an advanced AI analyzer for a customer service chatbot.
    Your job is to analyze the user's latest message and the conversation history to perform specific tasks.
    Output valid JSON only."""

    def __init__(self):
        pass

    async def classify_intent(self, query: str, history: List[Dict]) -> List[str]:
        """
        Classify the intent of the user's message.
        Returns a list of intents (e.g., ["GREETING"], ["QUESTION", "COMPLAINT"]).
        """
        prompt = f"""Analyze the User's latest message and determine the intent.
        
        Possible Intents:
        - GREETING: Hello, hi, good morning
        - QUESTION: Asking for information, how-to, pricing, etc.
        - COMPLAINT: Expressing dissatisfaction, reporting a problem
        - TASK_REQUEST: Asking to perform an action (cancel order, etc.)
        - CLARIFICATION: Clarifying previous statement
        - CLOSING: Thank you, bye, that's all, I'm done
        - FEEDBACK: Giving feedback
        - OTHER: Anything else

        Conversation History:
        {json.dumps(history[-3:] if history else [], indent=2)}

        User Message: "{query}"

        Return a JSON object with a single key "intents" containing a list of strings.
        Example: {{"intents": ["QUESTION"]}}
        """
        
        try:
            response = await llm_generator.generate(
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=50
            )
            content = json.loads(response["content"])
            return content.get("intents", ["OTHER"])
        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            return ["OTHER"]

    async def extract_context(self, query: str, history: List[Dict], current_summary: Optional[str]) -> str:
        """
        Extract and update the context summary (User Goal, Key Entities).
        """
        prompt = f"""Update the conversation context summary based on the new message.
        
        Current Summary: {current_summary or "None"}
        
        User Message: "{query}"

        Task:
        1. Identify the User's Main Goal (e.g., "Trying to fix login issue").
        2. Extract Key Entities (e.g., "Product: Laptop", "ID: 12345").
        3. Merge with Current Summary. Do not lose important past details.
        
        Return a JSON object with a key "summary" containing the updated text summary (max 2 sentences).
        """
        
        try:

            response = await llm_generator.generate(
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=100
            )
            content = json.loads(response["content"])
            return content.get("summary", current_summary)
        except Exception as e:
            logger.error(f"Context extraction failed: {e}")
            return current_summary

    async def generate_conversation_summary(self, history: List[Dict]) -> str:
        """
        Generate a final summary of the conversation.
        """
        if not history:
            return "No conversation history."

        prompt = f"""Summarize this customer service conversation.
        
        History:
        {json.dumps(history, indent=2)}
        
        Structure your response as a polite closing message that includes:
        1. A brief recap of what was discussed/resolved.
        2. Any key information provided.
        3. A professional sign-off.
        
        Keep it concise (max 3 sentences).
        """
        
        try:

            response = await llm_generator.generate(
                messages=[
                    {"role": "system", "content": "You are a helpful customer service AI."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response["content"]
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return "Thank you for contacting us. Have a great day!"

intelligence = Intelligence()
