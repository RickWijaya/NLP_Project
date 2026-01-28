"""
ChromaDB vector storage module.
Manages embeddings with tenant-based collections.
"""

from typing import List, Dict, Any, Optional
import chromadb

from app.config import get_settings
from app.modules.chunking import Chunk
from app.utils.logger import logger, log_processing_step

settings = get_settings()


class VectorStore:
    """
    ChromaDB vector storage with tenant-based collections.
    
    Supports:
    - Persistent storage
    - One collection per tenant
    - Metadata-rich storage
    - Deletion by document_id and version
    """
    
    def __init__(self, persist_directory: str = None):
        """
        Initialize the vector store.
        
        Args:
            persist_directory: Directory for persistent storage
        """
        self.persist_directory = persist_directory or settings.chroma_persist_dir
        
        # Initialize ChromaDB client with persistent storage
        try:
            self._client = chromadb.PersistentClient(path=self.persist_directory)
        except Exception as e:
            logger.warning(f"PersistentClient failed, using Client: {e}")
            # Fallback to simple client
            self._client = chromadb.Client()
        
        logger.info(f"ChromaDB initialized at: {self.persist_directory}")
    
    def _get_collection_name(self, tenant_id: str) -> str:
        """Get collection name for a tenant."""
        # Sanitize tenant_id for collection name
        safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in tenant_id)
        return f"tenant_{safe_name}"
    
    def get_or_create_collection(self, tenant_id: str):
        """
        Get or create a collection for a tenant.
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            ChromaDB collection
        """
        collection_name = self._get_collection_name(tenant_id)
        
        collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"tenant_id": tenant_id}
        )
        
        return collection
    
    def add_chunks(
        self,
        tenant_id: str,
        chunks: List[Chunk],
        embeddings: List[List[float]],
        document_id: str = ""
    ) -> int:
        """
        Add chunks with embeddings to the vector store.
        
        Args:
            tenant_id: Tenant identifier
            chunks: List of Chunk objects
            embeddings: List of embedding vectors
            document_id: Document ID for logging
            
        Returns:
            Number of chunks added
        """
        if not chunks or not embeddings:
            return 0
        
        if len(chunks) != len(embeddings):
            raise ValueError("Number of chunks must match number of embeddings")
        
        log_processing_step(document_id, "storing", "started", f"Storing {len(chunks)} chunks")
        
        try:
            collection = self.get_or_create_collection(tenant_id)
            
            # Prepare data for ChromaDB
            ids = []
            documents = []
            metadatas = []
            
            for i, chunk in enumerate(chunks):
                # Create unique ID for each chunk
                chunk_id = f"{chunk.document_id}_v{chunk.document_version}_{chunk.chunk_index}"
                
                ids.append(chunk_id)
                documents.append(chunk.content)
                metadatas.append({
                    "document_id": chunk.document_id,
                    "document_version": chunk.document_version,
                    "source_filename": chunk.source_filename,
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count
                })
            
            # Add to collection
            collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
            
            log_processing_step(
                document_id,
                "storing",
                "completed",
                f"Stored {len(chunks)} chunks in collection"
            )
            
            return len(chunks)
            
        except Exception as e:
            log_processing_step(document_id, "storing", "failed", str(e))
            raise
    
    def delete_by_document(
        self,
        tenant_id: str,
        document_id: str,
        version: Optional[int] = None
    ) -> int:
        """
        Delete chunks by document ID and optionally version.
        
        Args:
            tenant_id: Tenant identifier
            document_id: Document ID to delete
            version: Optional specific version to delete
            
        Returns:
            Number of chunks deleted (approximate)
        """
        log_processing_step(
            document_id,
            "deletion",
            "started",
            f"Deleting chunks for version {version or 'all'}"
        )
        
        try:
            collection = self.get_or_create_collection(tenant_id)
            
            # Build where clause
            where = {"document_id": document_id}
            if version is not None:
                where["document_version"] = version
            
            # Get existing chunks to count
            existing = collection.get(where=where)
            count = len(existing["ids"]) if existing["ids"] else 0
            
            if count > 0:
                # Delete from collection
                collection.delete(where=where)
            
            log_processing_step(
                document_id,
                "deletion",
                "completed",
                f"Deleted {count} chunks"
            )
            
            return count
            
        except Exception as e:
            log_processing_step(document_id, "deletion", "failed", str(e))
            raise
    
    def query(
        self,
        tenant_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query the vector store for similar chunks.
        
        Args:
            tenant_id: Tenant identifier
            query_embedding: Query embedding vector
            top_k: Number of results to return
            where: Optional metadata filter
            
        Returns:
            Query results with documents, metadatas, and distances
        """
        collection = self.get_or_create_collection(tenant_id)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        
        return results
    
    def get_collection_stats(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get statistics for a tenant's collection.
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            Collection statistics
        """
        collection = self.get_or_create_collection(tenant_id)
        
        return {
            "name": collection.name,
            "count": collection.count(),
            "metadata": collection.metadata
        }


# Global instance
vector_store = VectorStore()
