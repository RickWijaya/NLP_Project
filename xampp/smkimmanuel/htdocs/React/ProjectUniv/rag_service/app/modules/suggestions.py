"""
Suggested questions module.
Generates contextually relevant follow-up questions based on the conversation.
"""

from typing import List, Optional
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


def generate_suggestions(
    question: str,
    answer: str,
    context_snippets: Optional[List[str]] = None,
    max_suggestions: int = 3
) -> List[str]:
    """
    Generate suggested follow-up questions.
    
    Args:
        question: Original user question
        answer: AI's response
        context_snippets: Retrieved document snippets (for context-aware suggestions)
        max_suggestions: Maximum number of suggestions to return
        
    Returns:
        List of suggested follow-up questions
    """
    suggestions = []
    
    # Analyze the question type for template selection
    question_lower = question.lower()
    
    # Check for greeting/introduction
    if any(word in question_lower for word in ['hello', 'hi', 'hey', 'help']):
        suggestions.extend(SUGGESTION_TEMPLATES["greeting"])
    
    # Check for product-related
    elif any(word in question_lower for word in ['product', 'buy', 'price', 'cost', 'service']):
        suggestions.extend(SUGGESTION_TEMPLATES["product"])
    
    # Check for support-related
    elif any(word in question_lower for word in ['order', 'return', 'refund', 'issue', 'problem', 'help']):
        suggestions.extend(SUGGESTION_TEMPLATES["support"])
    
    # Default to general suggestions
    else:
        suggestions.extend(SUGGESTION_TEMPLATES["general"])
    
    # Generate context-aware suggestions if context is available
    if context_snippets:
        # Extract topics from context that weren't asked about
        for snippet in context_snippets[:2]:
            if len(suggestions) >= max_suggestions:
                break
            # Simple topic extraction (could be enhanced with NLP)
            words = snippet.split()[:10]
            if words:
                topic_hint = ' '.join(words[:5])
                if topic_hint not in question_lower:
                    suggestions.append(f"Tell me more about {topic_hint}...")
    
    # Deduplicate and limit
    seen = set()
    unique_suggestions = []
    for s in suggestions:
        if s.lower() not in seen:
            seen.add(s.lower())
            unique_suggestions.append(s)
    
    return unique_suggestions[:max_suggestions]


def get_default_suggestions() -> List[str]:
    """Get default suggestions for new conversations."""
    return [
        "What can you help me with?",
        "Tell me about your products/services",
        "How can I contact support?"
    ]
