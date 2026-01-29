"""
Content moderation module with keyword blocklist.
"""

import re
from typing import Tuple, Optional, List
from app.utils.logger import logger

# Default blocklist - can be extended per tenant
DEFAULT_BLOCKLIST = [
    # Profanity (basic examples - extend as needed)
    r'\b(fuck|shit|damn|ass|bitch)\b',
    # Hate speech indicators
    r'\b(hate|kill|murder|die)\s+(all|every)\b',
    # Personal info patterns (to protect privacy)
    r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone numbers
    r'\b\d{3}[-]?\d{2}[-]?\d{4}\b',     # SSN pattern
]

# Custom tenant blocklists (loaded from settings if needed)
TENANT_BLOCKLISTS = {}


class ContentModerator:
    """
    Content moderation using keyword blocklist.
    Checks both user input and AI responses.
    """
    
    def __init__(self, additional_patterns: Optional[List[str]] = None):
        """Initialize with optional additional patterns."""
        self.patterns = DEFAULT_BLOCKLIST.copy()
        if additional_patterns:
            self.patterns.extend(additional_patterns)
        
        # Compile patterns for efficiency
        self._compiled = [
            re.compile(p, re.IGNORECASE) 
            for p in self.patterns
        ]
    
    def check(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Check text for blocked content.
        
        Args:
            text: Text to check
            
        Returns:
            Tuple of (is_flagged, reason)
            - is_flagged: True if content should be blocked
            - reason: Description of why content was flagged (None if not flagged)
        """
        if not text:
            return False, None
        
        for i, pattern in enumerate(self._compiled):
            match = pattern.search(text)
            if match:
                reason = f"Content matched blocked pattern: {match.group()}"
                logger.warning(f"Content moderation flagged: {reason}")
                return True, reason
        
        return False, None
    
    def filter_response(self, text: str) -> str:
        """
        Filter blocked content from AI responses.
        Replaces matched patterns with [filtered].
        
        Args:
            text: Response text to filter
            
        Returns:
            Filtered text
        """
        result = text
        for pattern in self._compiled:
            result = pattern.sub('[filtered]', result)
        return result
    
    def add_pattern(self, pattern: str) -> None:
        """Add a new pattern to the blocklist."""
        self.patterns.append(pattern)
        self._compiled.append(re.compile(pattern, re.IGNORECASE))
    
    def get_tenant_moderator(self, tenant_id: str) -> 'ContentModerator':
        """
        Get a moderator with tenant-specific patterns.
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            ContentModerator with tenant's custom patterns added
        """
        tenant_patterns = TENANT_BLOCKLISTS.get(tenant_id, [])
        return ContentModerator(additional_patterns=tenant_patterns)


# Global moderator instance
content_moderator = ContentModerator()


def check_content(text: str, tenant_id: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to check content.
    
    Args:
        text: Text to check
        tenant_id: Optional tenant for custom patterns
        
    Returns:
        Tuple of (is_flagged, reason)
    """
    if tenant_id:
        moderator = content_moderator.get_tenant_moderator(tenant_id)
        return moderator.check(text)
    return content_moderator.check(text)
