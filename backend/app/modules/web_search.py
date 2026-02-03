from tavily import TavilyClient
from app.utils.logger import logger
from app.config import get_settings
from typing import List, Dict
import asyncio

settings = get_settings()

class WebSearch:
    def __init__(self):
        try:
            self.client = TavilyClient(api_key=settings.tavily_api_key)
            logger.info("Tavily Search Client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Tavily Client: {e}")
            self.client = None

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        Perform a web search using Tavily API.
        Returns a list of dictionaries with 'title', 'href', and 'body'.
        """
        if not self.client:
            logger.error("Tavily client is not initialized.")
            return []

        try:
            logger.info(f"Performing Tavily search for: '{query}'")
            
            # Tavily client is synchronous, so we run it in a thread
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.client.search(query, search_depth="advanced", max_results=max_results)
            )
            
            results = response.get("results", [])
            
            if not results:
                logger.warning("Tavily returned empty results")
                return []
                
            logger.info(f"Tavily search completed. Found {len(results)} results.")
            
            # Map Tavily format (url, content) to our format (href, body)
            mapped_results = []
            for res in results:
                mapped_results.append({
                    "title": res.get("title", "No Title"),
                    "href": res.get("url", "#"),
                    "body": res.get("content", "")
                })
                
            return mapped_results
            
        except Exception as e:
            logger.error(f"Tavily search failed: {e}", exc_info=True)
            return []

    def format_for_context(self, results: List[Dict[str, str]]) -> str:
        """Helper to format structured results into a string for LLM context."""
        if not results:
            return "No web search results found."
            
        formatted_results = ""
        for i, result in enumerate(results):
            formatted_results += f"Result {i+1}:\nTitle: {result.get('title', 'No Title')}\nURL: {result.get('href', '#')}\nSnippet: {result.get('body', '')}\n\n"
            
        return formatted_results.strip()

web_search = WebSearch()
