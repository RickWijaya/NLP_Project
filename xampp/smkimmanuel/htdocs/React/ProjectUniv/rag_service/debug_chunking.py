"""
Debug script to test document chunking.
"""

from app.modules.chunking import text_chunker, simple_sent_tokenize
from app.config import get_settings

settings = get_settings()

# Sample text from the research paper
test_text = """
University Guide using Speech Recognition and Computer Vision

Abstract- Education is an important factor inside mankind's existence. However, choosing a great and promising place to learn is a very hard thing to do, especially for senior high school student who want to continue their education into the university. There are a lot of universities around us and a lot of major or concentration that we must choose before entering a university Considering this issue, Some application will be developed and the application will help people in understanding some majors those are available and help people to know about some universities in Indonesia whether about vision, mission, curriculum, etc.

I. INTRODUCTION

Nowadays, technology evolution is growing rapidly. People tend to like something more attractive and unique. One of the examples is about finding information using computer because it can gather all the important data that people want and it is more flexible and easier to use. However, people cannot deny that even by using computer, the procedure of gaining information compare to using books is the same. People must read it.

II. LITERATURE STUDY

Speech Recognition (SR) is the ability of a machine or program to identify words and phrases in spoken language and convert them to a machine-readable format. It is also can be concluded that Speech recognition is the process of capturing spoken words using a microphone or telephone and converting them into a digitally stored set of words. The quality of a speech recognition systems are assessed according to two factors: its accuracy (error rate in converting spoken words to digital data) and speed.

III. SYSTEM OVERVIEW

This application will accept input in a form of speech, provided university logo and button/label click. After receiving any kind of the input, System will process it and give the output. This application output is also varies and they are in a form of speech, printed out information, video, opening Microsoft word or any university website link.

IV. APPLICATION PREVIEW

This section is giving the application preview of its implementation. This section will include the use case and some application screenshots. The use case includes Download the University Logo, Choose Majors, Search Information about the Chosen Major, Upload Information about Certain Major, Scanning the University Logo, Open the Scanned University Website Link.

V. EXPERIMENTAL RESULTS

In order to check and be sure that application runs properly, some simulations are needed to check it. Simulations will be divided based on the activities of the program executed. Testing scenario describes the activities which have to be checked in order to prove that the system works properly.

VI. CONCLUSION AND FUTURE WORKS

This research has been successfully achieved all the objectives which are becoming a source of information about some majors and universities that is very useful for high school student who want to continue their study into the university and become a very attractive desktop application because of its special features which are speech and object recognition.
"""

print("=" * 60)
print(f"Chunk size: {settings.chunk_size} words")
print(f"Chunk overlap: {settings.chunk_overlap} words")
print("=" * 60)

# Test sentence tokenization
print(f"\nTotal text length: {len(test_text)} chars")
print(f"Total word count: {len(test_text.split())} words")

sentences = simple_sent_tokenize(test_text)
print(f"Sentences found: {len(sentences)}")
print("\nFirst 5 sentences:")
for i, sent in enumerate(sentences[:5]):
    print(f"  {i+1}. ({len(sent.split())} words): {sent[:60]}...")

# Test chunking
chunks = text_chunker.chunk(
    text=test_text,
    document_id="test-doc",
    document_version=1,
    source_filename="test.pdf"
)

print(f"\n{'=' * 60}")
print(f"CHUNKS CREATED: {len(chunks)}")
print("=" * 60)

for i, chunk in enumerate(chunks):
    print(f"\nChunk {i+1}: {chunk.token_count} words")
    print(f"  Content: {chunk.content[:100]}...")
