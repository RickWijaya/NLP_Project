"""
Query Expansion module for RAG.
Generates multiple variations of user queries to improve retrieval recall.
"""

from typing import List, Optional
import json
import re

from app.modules.llm import llm_generator
from app.utils.logger import logger
from app.config import get_settings

settings = get_settings()

class QueryExpander:
    """
    Expands a single user query into multiple variations using LLM.
    Useful for overcoming short or ambiguous queries.
    """
    
    def __init__(self, expansion_count: int = None):
        """
        Initialize the Query Expander.
        
        Args:
            expansion_count: Number of variations to generate
        """
        self.expansion_count = expansion_count or getattr(settings, "expansion_count", 3)
    
    def generate_variations(self, query: str) -> List[str]:
        """
        Generate variations of a query using LLM.
        
        Args:
            query: Original user query
            
        Returns:
            List of unique query variations (including original)
        """
        if not query or len(query.strip()) < 3:
            return [query] if query else []

        logger.info(f"Expanding query: '{query}'")
        
        prompt = f"""You are an AI assistant specialized in information retrieval.
Your task is to generate {self.expansion_count} different variations of the user's search query to improve retrieval from a vector database.
These variations should cover different ways of asking the same thing, including synonyms or related technical terms.

User Query: "{query}"

Rules:
1. Provide the variations as a simple bulleted list.
2. Do not explain anything, just give the variations.
3. Keep the variations concise and focused.
4. Output ONLY the list of variations.

Output format:
- variation 1
- variation 2
- variation 3
"""

        try:
            response = llm_generator.generate(
                messages=[
                    {"role": "system", "content": "You are a search query expansion specialist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4, # Lower temperature for focused variations
                max_tokens=256
            )
            
            content = response["content"]
            # Extract variations from bulleted or numbered list
            variations = re.findall(r'^\s*[-*•\d\.]+\s*(.+)$', content, re.MULTILINE)
            
            # Clean up and deduplicate
            unique_queries = {query.strip().lower()}
            for v in variations:
                clean_v = v.strip().lower()
                # Remove quotes if present
                clean_v = re.sub(r'^["\']|["\']$', '', clean_v)
                if clean_v and clean_v != query.strip().lower():
                    unique_queries.add(clean_v)
            
            # Return limited results, ensuring original is included
            result = list(unique_queries)
            logger.info(f"Generated {len(result)} unique variations (including original)")
            return result[:self.expansion_count + 1]
            
        except Exception as e:
            logger.error(f"Query expansion failed: {str(e)}")
            return [query] # Fallback to original query

# Global instance
query_expander = QueryExpander()
