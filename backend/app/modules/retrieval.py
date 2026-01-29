"""
Retrieval module for semantic search.
Implements vector similarity search with optional hybrid BM25.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import numpy as np
from rank_bm25 import BM25Okapi

from app.config import get_settings
from app.modules.embedding import embedding_generator
from app.modules.vector_store import vector_store
from app.utils.logger import logger

settings = get_settings()


@dataclass
class RetrievalResult:
    """Represents a retrieved chunk with relevance score."""
    content: str
    document_id: str
    document_version: int
    source_filename: str
    chunk_index: int
    relevance_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "document_id": self.document_id,
            "document_version": self.document_version,
            "source_filename": self.source_filename,
            "chunk_index": self.chunk_index,
            "relevance_score": self.relevance_score
        }


class Retriever:
    """
    Semantic retrieval with optional hybrid search.
    
    Primary: Vector similarity search (cosine distance)
    Optional: Hybrid with BM25 keyword matching
    """
    
    def __init__(
        self,
        top_k: int = None,
        relevance_threshold: float = None
    ):
        """
        Initialize the retriever.
        
        Args:
            top_k: Number of results to return
            relevance_threshold: Minimum relevance score
        """
        self.top_k = top_k or settings.top_k
        self.relevance_threshold = relevance_threshold or settings.relevance_threshold
    
    def retrieve(
        self,
        query: str,
        tenant_id: str,
        top_k: int = None,
        use_hybrid: bool = False,
        hybrid_alpha: float = 0.7,
        relevance_threshold: float = None
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant chunks for a query.
        
        Args:
            query: User query text
            tenant_id: Tenant identifier
            top_k: Optional override for number of results
            use_hybrid: Whether to use hybrid BM25 + vector search
            hybrid_alpha: Weight for vector similarity in hybrid (0-1)
            relevance_threshold: Optional override for minimum relevance score
            
        Returns:
            List of RetrievalResult sorted by relevance
        """
        k = top_k or self.top_k
        threshold = relevance_threshold if relevance_threshold is not None else self.relevance_threshold
        
        logger.info(f"Retrieving for query: '{query[:50]}...' (tenant: {tenant_id})")
        
        # Generate query embedding
        query_embedding = embedding_generator.embed_query(query)
        
        # Vector similarity search
        results = vector_store.query(
            tenant_id=tenant_id,
            query_embedding=query_embedding.tolist(),
            top_k=k * 2 if use_hybrid else k  # Get more for hybrid reranking
        )
        
        if not results["documents"] or not results["documents"][0]:
            logger.info("No results found")
            return []
        
        # Parse vector search results
        vector_results = self._parse_results(results)
        
        if use_hybrid and vector_results:
            # Apply hybrid BM25 reranking
            vector_results = self._hybrid_rerank(
                query,
                vector_results,
                hybrid_alpha,
                k
            )
        
        # Log scores for debugging
        if vector_results:
            scores = [r.relevance_score for r in vector_results]
            logger.info(f"Raw scores: {scores}, Threshold: {threshold}")
        
        # Filter by relevance threshold
        filtered = [
            r for r in vector_results
            if r.relevance_score >= threshold
        ]
        
        logger.info(f"Before filter: {len(vector_results)}, After filter: {len(filtered)}")
        
        # Limit to top_k
        final_results = filtered[:k]
        
        logger.info(f"Retrieved {len(final_results)} relevant chunks")
        
        return final_results
    
    def _parse_results(self, results: Dict[str, Any]) -> List[RetrievalResult]:
        """Parse ChromaDB results into RetrievalResult objects."""
        parsed = []
        
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]
        
        for doc, meta, dist in zip(documents, metadatas, distances):
            # Convert distance to similarity score
            # ChromaDB uses L2 distance for normalized vectors
            # For cosine similarity: similarity = 1 - (distance / 2)
            similarity = 1 - (dist / 2)
            
            parsed.append(RetrievalResult(
                content=doc,
                document_id=meta["document_id"],
                document_version=meta["document_version"],
                source_filename=meta["source_filename"],
                chunk_index=meta["chunk_index"],
                relevance_score=float(similarity)
            ))
        
        return parsed
    
    def _hybrid_rerank(
        self,
        query: str,
        results: List[RetrievalResult],
        alpha: float,
        top_k: int
    ) -> List[RetrievalResult]:
        """
        Rerank results using hybrid BM25 + vector scoring.
        
        Args:
            query: Original query
            results: Vector search results
            alpha: Weight for vector score (1-alpha for BM25)
            top_k: Number of results to return
            
        Returns:
            Reranked results
        """
        if not results:
            return results
        
        # Tokenize documents for BM25
        tokenized_docs = [r.content.lower().split() for r in results]
        bm25 = BM25Okapi(tokenized_docs)
        
        # Get BM25 scores
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        
        # Normalize BM25 scores to 0-1 range
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
        normalized_bm25 = [s / max_bm25 for s in bm25_scores]
        
        # Calculate hybrid scores
        for i, result in enumerate(results):
            vector_score = result.relevance_score
            bm25_score = normalized_bm25[i]
            
            # Weighted combination
            hybrid_score = alpha * vector_score + (1 - alpha) * bm25_score
            result.relevance_score = hybrid_score
        
        # Sort by hybrid score
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return results[:top_k]


# Global instance
retriever = Retriever()
