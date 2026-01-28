"""
Debug script to test RAG retrieval.
"""

import asyncio
from app.modules.vector_store import vector_store
from app.modules.embedding import embedding_generator

# Test retrieval directly
query = 'artificial intelligence'
print(f'Testing query: {query}')

# Get embedding
emb = embedding_generator.embed_query(query)
print(f'Embedding generated (dim={len(emb)})')

# Query ChromaDB
results = vector_store.query(
    tenant_id='default_tenant',
    query_embedding=emb.tolist(),
    top_k=5
)

docs = results.get('documents', [[]])[0]
metas = results.get('metadatas', [[]])[0]
dists = results.get('distances', [[]])[0]

print(f'Documents found: {len(docs)}')

if docs:
    for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
        similarity = 1 - (dist / 2)
        print(f'\n{i+1}. Score: {similarity:.4f}, Distance: {dist:.4f}')
        print(f'   Source: {meta.get("source_filename", "N/A")}')
        print(f'   Content: {doc[:150]}...')
else:
    print('No documents found in vector store!')
    
    # Check collection stats
    stats = vector_store.get_collection_stats('default_tenant')
    print(f'\nCollection stats: {stats}')
