from duckduckgo_search import DDGS
from app.utils.logger import logger
from typing import List, Dict

class WebSearch:
    def __init__(self):
        self.ddgs = DDGS()

    def search(self, query: str, max_results: int = 3) -> str:
        """
        Perform a web search using DuckDuckGo.
        Returns a formatted string of results suitable for LLM context.
        """
        try:
            results = self.ddgs.text(query, max_results=max_results)
            
            if not results:
                return "No web search results found."
                
            # Format results for readability
            formatted_results = ""
            for i, result in enumerate(results):
                formatted_results += f"Result {i+1}:\nTitle: {result['title']}\nURL: {result['href']}\nSnippet: {result['body']}\n\n"
                
            logger.info(f"Web search completed for query: '{query}'")
            return formatted_results.strip()
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return f"Web search unavailable: {str(e)}"

web_search = WebSearch()
