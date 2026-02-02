"""
Web search module using DuckDuckGo.
Provides web search capability for RAG augmentation.
"""

import asyncio
from typing import List, Optional
from dataclasses import dataclass
from duckduckgo_search import DDGS

from app.utils.logger import logger


@dataclass
class WebSearchResult:
    """Structured web search result."""
    title: str
    snippet: str
    url: str
    

class WebSearcher:
    """
    DuckDuckGo web search integration.
    
    Features:
    - Text search with result limiting
    - Rate limiting (built into library)
    - Error handling with graceful fallback
    """
    
    def __init__(self, max_results: int = 5):
        """Initialize the web searcher."""
        self.max_results = max_results
        self._ddgs = None
    
    def _get_ddgs(self) -> DDGS:
        """Get or create DDGS instance."""
        if self._ddgs is None:
            self._ddgs = DDGS()
        return self._ddgs
    
    def search(
        self, 
        query: str, 
        max_results: Optional[int] = None
    ) -> List[WebSearchResult]:
        """
        Search the web using DuckDuckGo.
        
        Args:
            query: Search query string
            max_results: Maximum number of results (default: self.max_results)
            
        Returns:
            List of WebSearchResult objects
        """
        if not query or not query.strip():
            return []
        
        num_results = max_results or self.max_results
        
        try:
            logger.info(f"Web search: '{query[:50]}...' (max {num_results} results)")
            
            ddgs = self._get_ddgs()
            results = ddgs.text(
                query, 
                max_results=num_results,
                safesearch="moderate"
            )
            
            search_results = []
            for result in results:
                search_results.append(WebSearchResult(
                    title=result.get("title", ""),
                    snippet=result.get("body", ""),
                    url=result.get("href", "")
                ))
            
            logger.info(f"Web search returned {len(search_results)} results")
            return search_results
            
        except Exception as e:
            logger.error(f"Web search error: {str(e)}")
            return []
    
    async def search_async(
        self, 
        query: str, 
        max_results: Optional[int] = None
    ) -> List[WebSearchResult]:
        """
        Async wrapper for web search.
        Runs the synchronous search in a thread pool.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            lambda: self.search(query, max_results)
        )


# Global instance
web_searcher = WebSearcher(max_results=5)
