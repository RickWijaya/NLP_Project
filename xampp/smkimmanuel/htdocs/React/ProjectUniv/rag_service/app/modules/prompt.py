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
        web_results: Optional[List] = None
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
            web_results: Optional web search results
            
        Returns:
            Dictionary with 'system', 'user', and optionally 'history' keys
        """
        # Use custom prompts if provided
        active_system_prompt = system_prompt if system_prompt else self.SYSTEM_PROMPT
        active_no_context_prompt = no_context_prompt if no_context_prompt else self.NO_CONTEXT_SYSTEM_PROMPT
        
        has_documents = bool(retrieved_chunks)
        has_web = bool(web_results)
        
        if not has_documents and not has_web:
            # No context fallback
            return self._assemble_no_context(query, active_no_context_prompt, conversation_history)
        
        # Build context from document chunks
        context_parts = []
        current_tokens = 0
        
        if has_documents:
            context_parts.append("**📄 From Your Documents:**\n")
            for i, chunk in enumerate(retrieved_chunks):
                chunk_tokens = len(chunk.content) // 4
                if current_tokens + chunk_tokens > max_context_tokens:
                    break
                context_parts.append(f"[Document {i + 1}]\n{chunk.content}")
                current_tokens += chunk_tokens
        
        # Add web search results if available
        if has_web:
            context_parts.append("\n\n**🌐 From Web Search:**\n")
            for i, result in enumerate(web_results[:5]):  # Limit to 5 web results
                web_context = f"[Web {i + 1}] {result.title}\n{result.snippet}\nSource: {result.url}"
                web_tokens = len(web_context) // 4
                if current_tokens + web_tokens > max_context_tokens:
                    break
                context_parts.append(web_context)
                current_tokens += web_tokens
        
        context = "\n\n".join(context_parts)
        
        # Assemble user message with context
        user_message = f"""**Context:**

{context}

---

**User Question:**
{query}

Please provide a helpful answer based on the context above. Cite your sources when relevant."""

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

