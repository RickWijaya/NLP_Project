import sys
import os
import asyncio

# Add the project directory to sys.path
sys.path.append(os.getcwd())

from app.modules.extraction import text_extractor
from app.modules.chunking import text_chunker

def test():
    # Create a dummy text file
    test_file = "backend/test_doc.txt"
    with open(test_file, "w") as f:
        f.write("This is a test document.\nIt has multiple lines.")
    
    print("Testing Extraction...")
    segments = text_extractor.extract(test_file)
    print(f"Extracted segments: {segments}")
    
    print("\nTesting Chunking...")
    chunks = text_chunker.chunk(
        segments=segments,
        document_id="test_id",
        document_version=1,
        source_filename="test_doc.txt"
    )
    print(f"Created {len(chunks)} chunks.")
    for i, c in enumerate(chunks):
        print(f"Chunk {i}: Page {c.page_label}, Content: {c.content}")

    os.remove(test_file)

if __name__ == "__main__":
    test()
