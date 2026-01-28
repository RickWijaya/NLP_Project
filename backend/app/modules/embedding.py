"""
Embedding generation module using sentence-transformers.
Uses BAAI/bge-small-en-v1.5 for semantic embeddings.
"""

from typing import List, Union
import numpy as np

from sentence_transformers import SentenceTransformer

from app.config import get_settings
from app.utils.logger import logger, log_processing_step

settings = get_settings()


class EmbeddingGenerator:
    """
    Generates embeddings using sentence-transformers.
    
    Uses BAAI/bge-small-en-v1.5 which is optimized for retrieval tasks.
    """
    
    def __init__(self, model_name: str = None):
        """
        Initialize the embedding generator.
        
        Args:
            model_name: Name of the sentence-transformer model
        """
        self.model_name = model_name or settings.embedding_model
        self._model = None
        logger.info(f"Embedding generator initialized with model: {self.model_name}")
    
    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")
        return self._model
    
    def embed(
        self,
        texts: Union[str, List[str]],
        document_id: str = "",
        batch_size: int = 32,
        show_progress: bool = False
    ) -> np.ndarray:
        """
        Generate embeddings for text(s).
        
        Args:
            texts: Single text or list of texts to embed
            document_id: Optional document ID for logging
            batch_size: Batch size for encoding
            show_progress: Whether to show progress bar
            
        Returns:
            Numpy array of embeddings (n_texts, embedding_dim)
        """
        if isinstance(texts, str):
            texts = [texts]
        
        if not texts:
            return np.array([])
        
        log_processing_step(
            document_id,
            "embedding",
            "started",
            f"Generating embeddings for {len(texts)} texts"
        )
        
        try:
            # For bge model, we can add an instruction prefix for better retrieval
            # Using "Represent this sentence for retrieval:" prefix
            processed_texts = texts
            
            embeddings = self.model.encode(
                processed_texts,
                batch_size=batch_size,
                show_progress_bar=show_progress,
                convert_to_numpy=True,
                normalize_embeddings=True  # L2 normalize for cosine similarity
            )
            
            log_processing_step(
                document_id,
                "embedding",
                "completed",
                f"Generated {len(embeddings)} embeddings of dim {embeddings.shape[1]}"
            )
            
            return embeddings
            
        except Exception as e:
            log_processing_step(document_id, "embedding", "failed", str(e))
            raise
    
    def embed_query(self, query: str) -> np.ndarray:
        """
        Embed a query for retrieval.
        
        For bge models, queries should use a different prefix than documents.
        
        Args:
            query: Query text
            
        Returns:
            Query embedding as numpy array
        """
        # BGE models recommend adding "query: " prefix for queries
        processed_query = query
        
        embedding = self.model.encode(
            [processed_query],
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        return embedding[0]
    
    @property
    def embedding_dim(self) -> int:
        """Get the embedding dimension."""
        return self.model.get_sentence_embedding_dimension()


# Global instance
embedding_generator = EmbeddingGenerator()
