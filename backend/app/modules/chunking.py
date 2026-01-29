"""
Text chunking module with sentence-aware splitting.
Chunks text into segments optimized for semantic retrieval.
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

from app.config import get_settings
from app.utils.logger import logger, log_processing_step


def simple_sent_tokenize(text: str) -> List[str]:
    """Simple sentence tokenization using regex."""
    # Split on period, exclamation, question mark followed by space or end
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


settings = get_settings()




@dataclass
class Chunk:
    """Represents a text chunk with metadata."""
    content: str
    document_id: str
    document_version: int
    source_filename: str
    chunk_index: int
    token_count: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert chunk to dictionary."""
        return asdict(self)


class TextChunker:
    """
    Sentence-aware text chunking.
    
    Splits text into chunks of 300-500 tokens with 50-100 token overlap,
    preferring sentence and paragraph boundaries.
    """
    
    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None
    ):
        """
        Initialize the chunker.
        
        Args:
            chunk_size: Target chunk size in tokens (default: from settings)
            chunk_overlap: Overlap size in tokens (default: from settings)
        """
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap
    
    def chunk(
        self,
        text: str,
        document_id: str,
        document_version: int,
        source_filename: str
    ) -> List[Chunk]:
        """
        Split text into chunks with metadata.
        
        Args:
            text: Input text to chunk
            document_id: ID of the source document
            document_version: Version of the source document
            source_filename: Original filename
            
        Returns:
            List of Chunk objects with metadata
        """
        if not text or not text.strip():
            return []
        
        log_processing_step(str(document_id), "chunking", "started")
        
        try:
            # Split into paragraphs first
            paragraphs = self._split_paragraphs(text)
            
            # Split paragraphs into sentences
            all_sentences = []
            for para in paragraphs:
                sentences = simple_sent_tokenize(para)
                all_sentences.extend(sentences)
                # Add paragraph break marker
                if sentences:
                    all_sentences.append("")  # Empty string as paragraph marker
            
            # Remove trailing empty marker
            while all_sentences and not all_sentences[-1]:
                all_sentences.pop()
            
            # Create chunks from sentences
            chunks = self._create_chunks(
                all_sentences,
                document_id,
                document_version,
                source_filename
            )
            
            log_processing_step(
                str(document_id),
                "chunking",
                "completed",
                f"Created {len(chunks)} chunks"
            )
            
            return chunks
            
        except Exception as e:
            log_processing_step(str(document_id), "chunking", "failed", str(e))
            raise
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        # Split on double newlines or more
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Clean up and filter empty paragraphs
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _count_tokens(self, text: str) -> int:
        """Count approximate tokens in text (word-based)."""
        return len(text.split())
    
    def _create_chunks(
        self,
        sentences: List[str],
        document_id: str,
        document_version: int,
        source_filename: str
    ) -> List[Chunk]:
        """Create chunks from sentences with overlap."""
        chunks = []
        current_chunk_sentences = []
        current_token_count = 0
        chunk_index = 0
        
        sentence_idx = 0
        while sentence_idx < len(sentences):
            sentence = sentences[sentence_idx]
            
            # Skip empty paragraph markers
            if not sentence:
                sentence_idx += 1
                continue
            
            sentence_tokens = self._count_tokens(sentence)
            
            # Check if adding this sentence exceeds chunk size
            if current_token_count + sentence_tokens > self.chunk_size and current_chunk_sentences:
                # Create chunk from current sentences
                chunk_content = " ".join(current_chunk_sentences)
                chunks.append(Chunk(
                    content=chunk_content,
                    document_id=str(document_id),
                    document_version=document_version,
                    source_filename=source_filename,
                    chunk_index=chunk_index,
                    token_count=current_token_count
                ))
                chunk_index += 1
                
                # Calculate overlap - keep last few sentences
                overlap_sentences = []
                overlap_tokens = 0
                
                for sent in reversed(current_chunk_sentences):
                    sent_tokens = self._count_tokens(sent)
                    if overlap_tokens + sent_tokens <= self.chunk_overlap:
                        overlap_sentences.insert(0, sent)
                        overlap_tokens += sent_tokens
                    else:
                        break
                
                # Start new chunk with overlap
                current_chunk_sentences = overlap_sentences
                current_token_count = overlap_tokens
            
            # Add sentence to current chunk
            current_chunk_sentences.append(sentence)
            current_token_count += sentence_tokens
            sentence_idx += 1
        
        # Don't forget the last chunk
        if current_chunk_sentences:
            chunk_content = " ".join(current_chunk_sentences)
            chunks.append(Chunk(
                content=chunk_content,
                document_id=str(document_id),
                document_version=document_version,
                source_filename=source_filename,
                chunk_index=chunk_index,
                token_count=current_token_count
            ))
        
        return chunks


# Global instance
text_chunker = TextChunker()
