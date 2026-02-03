"""
Suggested questions module.
Generates contextually relevant follow-up questions based on the conversation.
"""

from typing import List, Optional
from app.modules.llm import llm_generator
import re
from app.utils.logger import logger

# Template-based suggestions for common scenarios
SUGGESTION_TEMPLATES = {
    "greeting": [
        "What products/services do you offer?",
        "How can I contact support?",
        "What are your business hours?"
    ],
    "product": [
        "What are the pricing options?",
        "Are there any discounts available?",
        "How do I place an order?"
    ],
    "support": [
        "How do I track my order?",
        "What is your return policy?",
        "How do I reset my password?"
    ],
    "general": [
        "Can you tell me more about this?",
        "What are my options?",
        "Is there anything else I should know?"
    ]
}


async def generate_suggestions(
    question: str,
    answer: str,
    context_snippets: Optional[List[str]] = None,
    max_suggestions: int = 3
) -> List[str]:
    """
    Generate suggested follow-up questions using LLM with template fallback.
    """
    try:
        # Prepare context for LLM
        context_str = "\\n".join([f"- {s[:200]}" for s in context_snippets]) if context_snippets else "No specific document context available."
        
        prompt = f"""You are an AI assistant helping a customer. 
Based on the conversation below, generate {max_suggestions} short, relevant follow-up questions that the user might want to ask next.

User Question: "{question}"
AI Response: "{answer[:500]}..."

Retrieved Context Info:
{context_str}

Rules:
1. Questions must be brief (max 10 words).
2. Questions must be relevant to the AI response or the context provided.
3. Output ONLY a bulleted list of {max_suggestions} questions.
4. No intro/outro text.
5. Use the same language as the conversation (e.g., if the user asks in Indonesian, suggest in Indonesian).

Output Format:
- Question 1?
- Question 2?
- Question 3?
"""
        
        response = await llm_generator.generate(
            messages=[
                {"role": "system", "content": "You are a helpful customer support assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        # Extract questions
        # Extract questions - allow for lines without question marks but ensure they are cleaned
        content = response["content"]
        suggestions = re.findall(r'^\s*[-*•\d\.]+\s*(.+)$', content, re.MULTILINE)
        
        # Clean up: remove quotes and ensure a question mark if missing
        processed_suggestions = []
        for s in suggestions:
            clean_s = s.strip().strip('"').strip("'")
            if clean_s:
                if not clean_s.endswith('?'):
                    clean_s += '?'
                processed_suggestions.append(clean_s)
        
        if not processed_suggestions:
            logger.warning("LLM generated no valid suggestions, falling back to templates")
            return _get_template_suggestions(question, max_suggestions)
            
        # Deduplicate while preserving order
        unique_suggestions = list(dict.fromkeys(processed_suggestions))
        return unique_suggestions[:max_suggestions]

    except Exception as e:
        logger.error(f"Failed to generate LLM suggestions: {e}")
        return _get_template_suggestions(question, max_suggestions)


def _get_template_suggestions(question: str, max_suggestions: int) -> List[str]:
    """Fallback template-based suggestions."""
    suggestions = []
    question_lower = question.lower()
    
    if any(word in question_lower for word in ['hello', 'hi', 'hey', 'help']):
        suggestions.extend(SUGGESTION_TEMPLATES["greeting"])
    elif any(word in question_lower for word in ['product', 'buy', 'price', 'cost', 'service']):
        suggestions.extend(SUGGESTION_TEMPLATES["product"])
    elif any(word in question_lower for word in ['order', 'return', 'refund', 'issue', 'problem', 'help']):
        suggestions.extend(SUGGESTION_TEMPLATES["support"])
    else:
        suggestions.extend(SUGGESTION_TEMPLATES["general"])
    
    return list(dict.fromkeys(suggestions))[:max_suggestions]


def get_default_suggestions() -> List[str]:
    """Get default suggestions for new conversations."""
    return [
        "What can you help me with?",
        "Tell me about your products/services",
        "How can I contact support?"
    ]
