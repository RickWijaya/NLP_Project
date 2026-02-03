"""
Prompt assembly module for RAG.
Constructs LLM prompts with system instructions, context, and user query.
"""

from typing import List, Optional

from app.modules.retrieval import RetrievalResult
from app.utils.logger import logger


class PromptAssembler:
    """
    Assembles prompts for the LLM with proper role separation.
    
    Ensures:
    - Clear system/context/user role separation
    - No leakage of admin metadata
    - Graceful fallback when no context found
    """
    
    # System prompt for customer service AI
    SYSTEM_PROMPT = """You are a helpful, professional customer service AI assistant. Your role is to provide accurate, clear, and actionable answers based on the provided context.

**Guidelines:**
1. Only answer based on the information provided in the context below.
2. If the context doesn't contain relevant information, politely say you don't have that information.
3. Be concise but thorough in your responses.
4. Maintain a friendly, professional tone.
5. Do not make up information or speculate beyond what's in the context.
6. If appropriate, suggest related topics the user might want to know about.
7. Format your response clearly with bullet points or numbered lists when helpful."""

    NO_CONTEXT_SYSTEM_PROMPT = """You are a helpful, professional customer service AI assistant.

**Important:** I don't have specific information in my knowledge base to answer your question. However, I can:
1. Suggest you rephrase your question
2. Recommend contacting human support for detailed assistance
3. Help with general guidance based on common practices

Please be polite and helpful while being honest about the limitations."""

    def __init__(self):
        """Initialize the prompt assembler."""
        pass
    
    def assemble(
        self,
        query: str,
        retrieved_chunks: List[RetrievalResult],
        max_context_tokens: int = 3000,
        system_prompt: Optional[str] = None,
        no_context_prompt: Optional[str] = None,
        conversation_history: Optional[List[dict]] = None,
        context_summary: Optional[str] = None,
        web_context: Optional[str] = None
    ) -> dict:
        """
        Assemble the prompt for the LLM.
        
        Args:
            query: User's question
            retrieved_chunks: Retrieved context chunks
            max_context_tokens: Maximum tokens for context
            system_prompt: Custom system prompt (optional)
            no_context_prompt: Custom no-context prompt (optional)
            conversation_history: Previous messages for multi-turn chat
            context_summary: Extracted user goal/context from intelligence module
            web_context: Results from web search
            
        Returns:
            Dictionary with 'system', 'user', and optionally 'history' keys
        """
        # Use custom prompts if provided
        active_system_prompt = system_prompt if system_prompt else self.SYSTEM_PROMPT
        active_no_context_prompt = no_context_prompt if no_context_prompt else self.NO_CONTEXT_SYSTEM_PROMPT
        
        # Inject context summary into system prompt if available
        if context_summary:
            active_system_prompt += f"\n\n**Current Context/User Goal:**\n{context_summary}"
            active_no_context_prompt += f"\n\n**Current Context/User Goal:**\n{context_summary}"
            
        # Adjust System Prompt for Web Search priority
        if web_context:
            # Stronger instruction for LLM to trust web search
            active_system_prompt += "\n\n**CRITICAL INSTRUCTION: You have been provided with real-time Web Search Results. You MUST use this information to answer the user's question, especially for current events (prices, news, sports). Prioritize Web Search information over your internal knowledge or the document context if they conflict. If the Web Search contains the answer, do NOT say 'The context does not contain...'**"
        
        # Check if we have ANY valid context (docs or web)
        if not retrieved_chunks and not web_context:
            # No context fallback
            return self._assemble_no_context(query, active_no_context_prompt, conversation_history)
        
        # Build context from chunks (without exposing metadata)
        context_parts = []
        current_tokens = 0
        
        # Add Web Context first if available
        if web_context:
            context_parts.append(f"### WEB SEARCH RESULTS (Use this to answer '{query}'):\n{web_context}\n### END WEB SEARCH RESULTS")
            # Rough token estimate for web context
            current_tokens += len(web_context) // 4
        
        for i, chunk in enumerate(retrieved_chunks):
            # Estimate tokens (rough: 4 chars per token)
            chunk_tokens = len(chunk.content) // 4
            
            if current_tokens + chunk_tokens > max_context_tokens:
                break
            
            # Add chunk without exposing internal metadata
            context_parts.append(f"[Document Source {i + 1}]\n{chunk.content}")
            current_tokens += chunk_tokens
        
        context = "\n\n".join(context_parts)
        
        # Assemble user message with context
        user_message = f"""**Reference Context:**
        
{context}

---

**User Question:**
{query}

**Instructions:**
1. If the answer is found in the 'WEB SEARCH RESULTS' section above, answer the question directly using that information.
2. If the answer is found in the 'Document Source' sections, use that.
3. If the context contains relevant information, answer using it.
4. Cite your sources if possible."""

        return {
            "system": active_system_prompt,
            "user": user_message,
            "history": conversation_history or []
        }
    
    def _assemble_no_context(
        self, 
        query: str, 
        no_context_prompt: str = None,
        conversation_history: List[dict] = None
    ) -> dict:
        """Assemble prompt when no relevant context is found."""
        user_message = f"""**User Question:**
{query}

I was unable to find specific information in my knowledge base to answer this question. Please respond helpfully while being honest about this limitation."""

        return {
            "system": no_context_prompt or self.NO_CONTEXT_SYSTEM_PROMPT,
            "user": user_message,
            "history": conversation_history or []
        }
    
    def format_for_groq(self, prompt: dict) -> List[dict]:
        """
        Format prompt for Groq/OpenAI API message format.
        
        Args:
            prompt: Dictionary with 'system', 'user', and optionally 'history' keys
            
        Returns:
            List of message dicts for API
        """
        messages = [{"role": "system", "content": prompt["system"]}]
        
        # Add conversation history if present
        history = prompt.get("history", [])
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current user message
        messages.append({"role": "user", "content": prompt["user"]})
        
        return messages


# Global instance
prompt_assembler = PromptAssembler()

