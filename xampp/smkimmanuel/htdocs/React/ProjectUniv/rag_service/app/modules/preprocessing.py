"""
Text preprocessing module with deterministic, repeatable pipeline.
Includes lowercasing, punctuation removal, tokenization, stopword removal,
lemmatization, and FAQ normalization.

Uses NLTK for lemmatization (Python 3.14 compatible).
Uses simple regex-based tokenization to avoid punkt_tab issues.
"""

import re
import string
from typing import List, Optional

import nltk

from app.utils.logger import logger, log_processing_step

# Download required NLTK data (only stopwords and wordnet needed now)
def _download_nltk_data():
    """Download all required NLTK data."""
    packages = [
        ('corpora/stopwords', 'stopwords'),
        ('corpora/wordnet', 'wordnet'),
        ('corpora/omw-1.4', 'omw-1.4'),
    ]
    
    for path, name in packages:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception as e:
                logger.warning(f"Failed to download NLTK {name}: {e}")

_download_nltk_data()

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


def simple_word_tokenize(text: str) -> List[str]:
    """Simple word tokenization using regex."""
    return re.findall(r'\b\w+\b', text.lower())


def simple_sent_tokenize(text: str) -> List[str]:
    """Simple sentence tokenization using regex."""
    # Split on period, exclamation, question mark followed by space or end
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


class TextPreprocessor:
    """
    Deterministic text preprocessing pipeline.
    
    Steps (in strict order):
    1. Lowercasing
    2. Punctuation and symbol removal
    3. Redundant whitespace removal
    4. Tokenization
    5. Stopword removal (language-aware)
    6. Lemmatization (NLTK WordNet)
    7. FAQ normalization (optional)
    """
    
    # FAQ normalization patterns
    FAQ_PATTERNS = {
        r"\bwhat is\b": "define",
        r"\bhow do i\b": "how to",
        r"\bhow can i\b": "how to",
        r"\bwhat are\b": "define",
        r"\bi need help with\b": "help",
        r"\bim having trouble\b": "issue",
        r"\bi am having trouble\b": "issue",
        r"\bcan you help me\b": "help",
        r"\bplease help\b": "help",
        r"\bcant\b": "cannot",
        r"\bwont\b": "will not",
        r"\bdont\b": "do not",
        r"\bdoesnt\b": "does not",
    }
    
    def __init__(self, language: str = "english"):
        """
        Initialize the preprocessor.
        
        Args:
            language: Language for stopwords (default: english)
        """
        self.language = language
        
        # Load stopwords
        try:
            self.stop_words = set(stopwords.words(language))
        except OSError:
            logger.warning(f"Stopwords not found for '{language}', using English")
            self.stop_words = set(stopwords.words("english"))
        
        # Initialize NLTK WordNet Lemmatizer
        self.lemmatizer = WordNetLemmatizer()
        logger.info("Using NLTK WordNetLemmatizer for lemmatization")
    
    def preprocess(
        self,
        text: str,
        document_id: str = "",
        apply_faq_normalization: bool = True,
        preserve_sentences: bool = True
    ) -> str:
        """
        Apply the full preprocessing pipeline.
        
        Args:
            text: Raw input text
            document_id: Optional document ID for logging
            apply_faq_normalization: Whether to apply FAQ patterns
            preserve_sentences: If True, process per sentence and rejoin
            
        Returns:
            Preprocessed text string
        """
        if not text or not text.strip():
            return ""
        
        log_processing_step(document_id, "preprocessing", "started")
        
        try:
            if preserve_sentences:
                # Process sentence by sentence to maintain structure
                sentences = simple_sent_tokenize(text)
                processed_sentences = []
                
                for sentence in sentences:
                    processed = self._process_text(
                        sentence,
                        apply_faq_normalization
                    )
                    if processed.strip():
                        processed_sentences.append(processed)
                
                result = " ".join(processed_sentences)
            else:
                result = self._process_text(text, apply_faq_normalization)
            
            log_processing_step(
                document_id,
                "preprocessing",
                "completed",
                f"Reduced from {len(text)} to {len(result)} characters"
            )
            
            return result
            
        except Exception as e:
            log_processing_step(document_id, "preprocessing", "failed", str(e))
            raise
    
    def _process_text(self, text: str, apply_faq_normalization: bool) -> str:
        """Apply preprocessing steps to text."""
        # Step 1: Lowercasing
        text = text.lower()
        
        # Step 2: FAQ normalization (before punctuation removal)
        if apply_faq_normalization:
            text = self._apply_faq_patterns(text)
        
        # Step 3: Remove punctuation and symbols
        text = self._remove_punctuation(text)
        
        # Step 4: Remove redundant whitespace
        text = self._normalize_whitespace(text)
        
        # Step 5: Tokenization
        tokens = simple_word_tokenize(text)
        
        # Step 6: Stopword removal
        tokens = [t for t in tokens if t not in self.stop_words]
        
        # Step 7: Lemmatization using NLTK
        tokens = self._lemmatize(tokens)
        
        return " ".join(tokens)
    
    def _remove_punctuation(self, text: str) -> str:
        """
        Remove punctuation EXCEPT sentence-ending marks.
        Preserves periods, exclamation marks, and question marks for sentence tokenization.
        """
        # Replace non-sentence-ending punctuation with space
        # Keep: . ! ? for sentence boundaries
        # Remove: , ; : " ' - _ @ # $ % ^ & * ( ) [ ] { } < > / \ | ` ~
        text = re.sub(r'[^\w\s.!?]', ' ', text)
        return text
    
    def _normalize_whitespace(self, text: str) -> str:
        """Remove redundant whitespace."""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _apply_faq_patterns(self, text: str) -> str:
        """Apply FAQ normalization patterns."""
        for pattern, replacement in self.FAQ_PATTERNS.items():
            text = re.sub(pattern, replacement, text)
        return text
    
    def _lemmatize(self, tokens: List[str]) -> List[str]:
        """Lemmatize tokens using NLTK WordNetLemmatizer."""
        lemmatized = []
        for token in tokens:
            # Try verb lemmatization first, then noun
            lemma = self.lemmatizer.lemmatize(token, pos='v')
            if lemma == token:
                lemma = self.lemmatizer.lemmatize(token, pos='n')
            if lemma.strip():
                lemmatized.append(lemma)
        return lemmatized
    
    def get_tokens(self, text: str) -> List[str]:
        """
        Get tokens from preprocessed text.
        
        Args:
            text: Preprocessed text
            
        Returns:
            List of tokens
        """
        return simple_word_tokenize(text)


# Global instance
text_preprocessor = TextPreprocessor()
