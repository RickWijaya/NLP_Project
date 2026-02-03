"""
Model Evaluation Script for RAG Service

This script evaluates the RAG model's performance using various metrics:
- Response Quality (Relevance, Accuracy, Completeness)
- Retrieval Performance (Precision, Recall, MRR)
- Latency Metrics (Response Time, Token Generation Speed)
- Context Adherence (Does it stay within provided context?)

Usage:
    python evaluate_model.py --tenant_id <tenant_id> [--output <output_file>]
"""

import asyncio
import argparse
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from sqlalchemy import select

from app.database import async_session_maker
from app.models.document import TenantSettings, Admin
from app.modules.retrieval import retriever
from app.modules.prompt import prompt_assembler
from app.modules.llm import llm_generator
from app.modules.intelligence import intelligence
from app.config import get_settings

settings = get_settings()


@dataclass
class ComprehensiveMetrics:
    """RAGAS-inspired comprehensive evaluation metrics."""
    faithfulness_score: float = 0.0      # 0-1, how well grounded in context
    answer_relevancy: float = 0.0        # 0-1, relevance to question
    context_precision: float = 0.0       # 0-1, precision of retrieval
    context_recall: float = 0.0          # 0-1, recall of necessary info
    hallucination_score: float = 0.0     # 0-1, lower is better
    answer_correctness: float = 0.0      # 0-1, accuracy vs expected
    semantic_similarity: float = 0.0     # 0-1, embedding similarity


@dataclass
class EvaluationResult:
    """Single evaluation result for a test case."""
    question: str
    expected_answer: Optional[str]
    generated_answer: str
    chunks_retrieved: int
    relevance_scores: List[float]
    avg_relevance: float
    response_time_ms: float
    tokens_used: int
    model_used: str
    context_adherence: str  # "strict", "partial", "external"
    # New comprehensive metrics
    comprehensive_metrics: Optional[ComprehensiveMetrics] = None
    

@dataclass
class EvaluationSummary:
    """Summary of all evaluation results."""
    total_tests: int
    avg_response_time_ms: float
    avg_chunks_retrieved: float
    avg_relevance_score: float
    avg_tokens_used: float
    context_adherence_stats: Dict[str, int]
    model_used: str
    timestamp: str
    # New comprehensive averages
    avg_faithfulness: float = 0.0
    avg_answer_relevancy: float = 0.0
    avg_context_precision: float = 0.0
    avg_context_recall: float = 0.0
    avg_hallucination_score: float = 0.0
    avg_answer_correctness: float = 0.0
    avg_semantic_similarity: float = 0.0



# Test cases for evaluation
# Format: {"question": str, "expected_keywords": List[str], "category": str}
DEFAULT_TEST_CASES = [
    {
        "question": "What services do you offer?",
        "expected_keywords": ["service", "offer", "provide"],
        "category": "general_info"
    },
    {
        "question": "What are your operating hours?",
        "expected_keywords": ["hour", "open", "close", "time"],
        "category": "business_info"
    },
    {
        "question": "How can I contact you?",
        "expected_keywords": ["contact", "phone", "email", "call"],
        "category": "contact_info"
    },
    {
        "question": "What is your pricing?",
        "expected_keywords": ["price", "cost", "fee", "rate"],
        "category": "pricing"
    },
    {
        "question": "Where are you located?",
        "expected_keywords": ["location", "address", "place", "find"],
        "category": "location"
    },
    # Test for context adherence (out-of-scope question)
    {
        "question": "Who is the president of the United States?",
        "expected_keywords": [],
        "category": "out_of_scope"
    },
    {
        "question": "What is the weather today?",
        "expected_keywords": [],
        "category": "out_of_scope"
    }
]


async def get_tenant_settings(tenant_id: str) -> Optional[TenantSettings]:
    """Get tenant settings from database."""
    async with async_session_maker() as db:
        result = await db.execute(
            select(TenantSettings).where(TenantSettings.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()


def calculate_faithfulness(response: str, chunks: list) -> float:
    """
    Calculate faithfulness score - how well the response is grounded in context.
    
    Measures the ratio of response claims that can be traced to retrieved context.
    Score: 0-1 (higher = more faithful to context)
    """
    if not chunks or not response:
        return 0.0
    
    response_lower = response.lower()
    context_text = " ".join([c.content.lower() for c in chunks])
    
    # Extract sentences/claims from response
    sentences = [s.strip() for s in response.replace('!', '.').replace('?', '.').split('.') if s.strip()]
    if not sentences:
        return 0.0
    
    grounded_claims = 0
    for sentence in sentences:
        # Check if key words from the sentence appear in context
        words = [w for w in sentence.split() if len(w) > 3]
        if not words:
            continue
        overlap = sum(1 for w in words if w in context_text)
        if overlap / len(words) > 0.3:  # 30% word overlap threshold
            grounded_claims += 1
    
    return grounded_claims / len(sentences) if sentences else 0.0


def calculate_answer_relevancy(question: str, response: str) -> float:
    """
    Calculate answer relevancy - how relevant the response is to the question.
    
    Uses keyword overlap and semantic indicators.
    Score: 0-1 (higher = more relevant)
    """
    if not question or not response:
        return 0.0
    
    question_lower = question.lower()
    response_lower = response.lower()
    
    # Extract question keywords (meaningful words)
    stop_words = {'what', 'is', 'are', 'the', 'a', 'an', 'how', 'when', 'where', 'who', 'why', 
                  'do', 'does', 'can', 'could', 'would', 'should', 'your', 'you', 'i', 'my', 'me'}
    question_words = [w for w in question_lower.split() if w not in stop_words and len(w) > 2]
    
    if not question_words:
        return 0.5  # Neutral if no meaningful keywords
    
    # Check keyword presence in response
    keyword_matches = sum(1 for w in question_words if w in response_lower)
    keyword_score = keyword_matches / len(question_words)
    
    # Check for direct answer indicators
    answer_indicators = ['is', 'are', 'we', 'our', 'the', 'yes', 'no', 'you can', 'located', 'available']
    has_answer_structure = any(ind in response_lower for ind in answer_indicators)
    structure_bonus = 0.2 if has_answer_structure else 0.0
    
    return min(1.0, keyword_score * 0.8 + structure_bonus)


def calculate_context_precision(chunks: list, relevance_threshold: float = 0.5) -> float:
    """
    Calculate context precision - ratio of relevant chunks to total retrieved chunks.
    
    Score: 0-1 (higher = more precise retrieval)
    """
    if not chunks:
        return 0.0
    
    relevant_chunks = sum(1 for c in chunks if c.relevance_score >= relevance_threshold)
    return relevant_chunks / len(chunks)


def calculate_context_recall(response: str, chunks: list, expected_keywords: List[str] = None) -> float:
    """
    Calculate context recall - coverage of necessary information in retrieved context.
    
    Score: 0-1 (higher = better recall of needed information)
    """
    if not chunks:
        return 0.0
    
    context_text = " ".join([c.content.lower() for c in chunks])
    
    # If expected keywords provided, check their presence in context
    if expected_keywords:
        found_keywords = sum(1 for kw in expected_keywords if kw.lower() in context_text)
        return found_keywords / len(expected_keywords) if expected_keywords else 0.0
    
    # Without expected keywords, use response coverage as proxy
    if not response:
        return 0.5  # Neutral
    
    response_words = set(response.lower().split())
    context_words = set(context_text.split())
    
    # What fraction of response content is covered by context
    if not response_words:
        return 0.5
    
    overlap = len(response_words.intersection(context_words))
    return min(1.0, overlap / len(response_words))


def calculate_hallucination_score(response: str, chunks: list) -> float:
    """
    Calculate hallucination score - likelihood of fabricated information.
    
    Score: 0-1 (LOWER is better - 0 = no hallucination, 1 = high hallucination)
    """
    if not response:
        return 0.0
    
    response_lower = response.lower()
    
    # Check for external knowledge indicators (signs of hallucination)
    external_phrases = [
        'in general', 'typically', 'usually', 'commonly', 'often',
        'based on my knowledge', 'i believe', 'i think',
        'as of my training', 'historically', 'research shows',
        'studies indicate', 'experts say', 'it is known that'
    ]
    
    external_count = sum(1 for phrase in external_phrases if phrase in response_lower)
    external_score = min(1.0, external_count * 0.2)
    
    # If no context, any detailed answer is likely hallucination
    if not chunks:
        # Check if it's a proper decline
        decline_phrases = ["don't have", "no information", "cannot find", "not in my knowledge"]
        if any(phrase in response_lower for phrase in decline_phrases):
            return 0.1  # Low hallucination - properly declined
        return 0.7  # High hallucination risk without context
    
    # Inverse of faithfulness as hallucination indicator
    faithfulness = calculate_faithfulness(response, chunks)
    
    return min(1.0, (1.0 - faithfulness) * 0.7 + external_score * 0.3)


def calculate_answer_correctness(response: str, expected_keywords: List[str] = None) -> float:
    """
    Calculate answer correctness based on expected keywords.
    
    Score: 0-1 (higher = more correct)
    """
    if not expected_keywords:
        return 0.5  # Neutral when no expected answer
    
    response_lower = response.lower()
    found_keywords = sum(1 for kw in expected_keywords if kw.lower() in response_lower)
    return found_keywords / len(expected_keywords)


def calculate_semantic_similarity(question: str, response: str, chunks: list) -> float:
    """
    Calculate semantic similarity using word overlap heuristics.
    
    Note: For production, use sentence embeddings (e.g., sentence-transformers).
    Score: 0-1 (higher = more semantically similar)
    """
    if not response:
        return 0.0
    
    # Combine question context with retrieved chunks for comparison
    reference_text = question.lower()
    if chunks:
        reference_text += " " + " ".join([c.content.lower() for c in chunks])
    
    response_lower = response.lower()
    
    # Calculate Jaccard similarity
    ref_words = set(reference_text.split())
    resp_words = set(response_lower.split())
    
    if not ref_words or not resp_words:
        return 0.0
    
    intersection = len(ref_words.intersection(resp_words))
    union = len(ref_words.union(resp_words))
    
    return intersection / union if union > 0 else 0.0


def calculate_comprehensive_metrics(
    question: str,
    response: str,
    chunks: list,
    expected_keywords: List[str] = None,
    relevance_threshold: float = 0.5
) -> ComprehensiveMetrics:
    """Calculate all comprehensive metrics for a single evaluation."""
    
    faithfulness = calculate_faithfulness(response, chunks)
    answer_relevancy = calculate_answer_relevancy(question, response)
    context_precision = calculate_context_precision(chunks, relevance_threshold)
    context_recall = calculate_context_recall(response, chunks, expected_keywords)
    hallucination = calculate_hallucination_score(response, chunks)
    correctness = calculate_answer_correctness(response, expected_keywords)
    similarity = calculate_semantic_similarity(question, response, chunks)
    
    return ComprehensiveMetrics(
        faithfulness_score=round(faithfulness, 3),
        answer_relevancy=round(answer_relevancy, 3),
        context_precision=round(context_precision, 3),
        context_recall=round(context_recall, 3),
        hallucination_score=round(hallucination, 3),
        answer_correctness=round(correctness, 3),
        semantic_similarity=round(similarity, 3)
    )




async def evaluate_single_query(
    question: str,
    tenant_id: str,
    tenant_settings: TenantSettings,
    expected_keywords: List[str] = None
) -> EvaluationResult:
    """Evaluate a single query and return metrics."""
    
    start_time = time.time()
    
    # 1. Retrieve relevant chunks
    chunks = await retriever.retrieve(
        query=question,
        tenant_id=tenant_id,
        top_k=tenant_settings.top_k_chunks,
        relevance_threshold=tenant_settings.relevance_threshold
    )
    
    relevance_scores = [c.relevance_score for c in chunks]
    avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.0
    
    # 2. Assemble prompt
    prompt = prompt_assembler.assemble(
        query=question,
        retrieved_chunks=chunks,
        system_prompt=tenant_settings.system_prompt,
        no_context_prompt=tenant_settings.no_context_prompt
    )
    
    # 3. Generate response using appropriate model
    messages = prompt_assembler.format_for_groq(prompt)
    
    if tenant_settings.model_type == "local":
        # Use local model
        from app.modules.local_llm import local_llm_generator
        
        if not local_llm_generator.is_available:
            raise Exception("Local LLM not available. Install transformers and torch.")
        
        model_name = tenant_settings.local_model
        response_text = local_llm_generator.generate(
            model_key=model_name,
            messages=messages,
            temperature=tenant_settings.temperature,
            max_new_tokens=tenant_settings.max_new_tokens,
            top_p=tenant_settings.top_p,
            top_k=tenant_settings.top_k,
            repetition_penalty=tenant_settings.repetition_penalty
        )
        tokens_used = 0  # Local models don't report tokens the same way
        model_name = f"local:{model_name}"
    else:
        # Use API model (Groq)
        model_name = tenant_settings.api_model
        response = await llm_generator.generate(
            messages=messages,
            model=model_name,
            temperature=tenant_settings.temperature,
            max_tokens=tenant_settings.max_new_tokens
        )
        response_text = response["content"]
        tokens_used = response.get("tokens", 0)
    
    end_time = time.time()
    response_time_ms = (end_time - start_time) * 1000
    
    # 4. Analyze context adherence
    context_adherence = analyze_context_adherence(
        response=response_text,
        chunks=chunks,
        expected_keywords=expected_keywords
    )
    
    # 5. Calculate comprehensive metrics
    comp_metrics = calculate_comprehensive_metrics(
        question=question,
        response=response_text,
        chunks=chunks,
        expected_keywords=expected_keywords,
        relevance_threshold=tenant_settings.relevance_threshold
    )
    
    return EvaluationResult(
        question=question,
        expected_answer=None,
        generated_answer=response_text,
        chunks_retrieved=len(chunks),
        relevance_scores=relevance_scores,
        avg_relevance=avg_relevance,
        response_time_ms=response_time_ms,
        tokens_used=tokens_used,
        model_used=model_name,
        context_adherence=context_adherence,
        comprehensive_metrics=comp_metrics
    )


def analyze_context_adherence(
    response: str,
    chunks: list,
    expected_keywords: List[str]
) -> str:
    """
    Analyze if the response adheres to the provided context.
    
    Returns:
        - "strict": Response is based purely on context
        - "partial": Response uses some context but may include external info
        - "external": Response appears to use external knowledge
        - "appropriate_decline": Correctly declined to answer out-of-scope
    """
    response_lower = response.lower()
    
    # Check for decline indicators (model correctly said it doesn't know)
    decline_phrases = [
        "don't have information",
        "not in my knowledge",
        "cannot find",
        "no information available",
        "not contain",
        "outside my knowledge",
        "i don't know"
    ]
    
    has_decline = any(phrase in response_lower for phrase in decline_phrases)
    
    # Check for external knowledge indicators
    external_indicators = [
        "general knowledge",
        "however, i can tell you",
        "based on my training",
        "as of my knowledge",
        "in general",
        "typically",
        "usually"
    ]
    
    has_external = any(phrase in response_lower for phrase in external_indicators)
    
    # If no chunks and it's an out-of-scope question
    if not chunks and not expected_keywords:
        if has_decline and not has_external:
            return "appropriate_decline"
        elif has_external:
            return "external"
        else:
            return "partial"
    
    # If we have chunks, check if response uses them
    if chunks:
        chunk_content = " ".join([c.content.lower() for c in chunks])
        
        # Check keyword overlap
        response_words = set(response_lower.split())
        chunk_words = set(chunk_content.split())
        overlap = len(response_words.intersection(chunk_words))
        
        if overlap > 10 and not has_external:
            return "strict"
        elif overlap > 5:
            return "partial"
    
    if has_external:
        return "external"
    
    return "partial"


def _print_progress_bar(label: str, value: float, width: int = 20):
    """Print a progress bar for a metric."""
    filled = int(width * value)
    bar = "█" * filled + "░" * (width - filled)
    print(f"  │ {label:<22} {value:.2f}  {bar}")


async def run_evaluation(
    tenant_id: str,
    test_cases: List[Dict] = None,
    output_file: str = None
) -> EvaluationSummary:
    """Run full evaluation suite."""
    
    print(f"\n{'='*60}")
    print(f"  RAG Model Evaluation - Tenant: {tenant_id}")
    print(f"{'='*60}\n")
    
    # Get tenant settings
    tenant_settings = await get_tenant_settings(tenant_id)
    if not tenant_settings:
        print(f"ERROR: Tenant settings not found for '{tenant_id}'")
        print("Creating default settings...")
        async with async_session_maker() as db:
            tenant_settings = TenantSettings(tenant_id=tenant_id)
            db.add(tenant_settings)
            await db.commit()
            await db.refresh(tenant_settings)
    
    model_name = tenant_settings.api_model if tenant_settings.model_type == "api" else tenant_settings.local_model
    print(f"Model: {model_name}")
    print(f"Temperature: {tenant_settings.temperature}")
    print(f"Top-K Chunks: {tenant_settings.top_k_chunks}")
    print(f"Relevance Threshold: {tenant_settings.relevance_threshold}")
    print()
    
    if test_cases is None:
        test_cases = DEFAULT_TEST_CASES
    
    results: List[EvaluationResult] = []
    context_adherence_stats = {
        "strict": 0,
        "partial": 0,
        "external": 0,
        "appropriate_decline": 0
    }
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] Testing: {test_case['question'][:50]}...")
        
        try:
            result = await evaluate_single_query(
                question=test_case["question"],
                tenant_id=tenant_id,
                tenant_settings=tenant_settings,
                expected_keywords=test_case.get("expected_keywords", [])
            )
            results.append(result)
            context_adherence_stats[result.context_adherence] += 1
            
            # Print brief result
            cm = result.comprehensive_metrics
            print(f"    ✓ Response time: {result.response_time_ms:.0f}ms | Chunks: {result.chunks_retrieved}")
            if cm:
                print(f"      Faithfulness: {cm.faithfulness_score:.2f} | Relevancy: {cm.answer_relevancy:.2f} | Hallucination: {cm.hallucination_score:.2f}")
            
        except Exception as e:
            print(f"    ✗ Error: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Calculate summary
    if results:
        avg_faithfulness = sum(r.comprehensive_metrics.faithfulness_score for r in results) / len(results)
        avg_answer_relevancy = sum(r.comprehensive_metrics.answer_relevancy for r in results) / len(results)
        avg_context_precision = sum(r.comprehensive_metrics.context_precision for r in results) / len(results)
        avg_context_recall = sum(r.comprehensive_metrics.context_recall for r in results) / len(results)
        avg_hallucination = sum(r.comprehensive_metrics.hallucination_score for r in results) / len(results)
        avg_correctness = sum(r.comprehensive_metrics.answer_correctness for r in results) / len(results)
        avg_similarity = sum(r.comprehensive_metrics.semantic_similarity for r in results) / len(results)
        
        summary = EvaluationSummary(
            total_tests=len(results),
            avg_response_time_ms=sum(r.response_time_ms for r in results) / len(results),
            avg_chunks_retrieved=sum(r.chunks_retrieved for r in results) / len(results),
            avg_relevance_score=sum(r.avg_relevance for r in results) / len(results),
            avg_tokens_used=sum(r.tokens_used for r in results) / len(results),
            context_adherence_stats=context_adherence_stats,
            model_used=model_name,
            timestamp=datetime.now().isoformat(),
            avg_faithfulness=avg_faithfulness,
            avg_answer_relevancy=avg_answer_relevancy,
            avg_context_precision=avg_context_precision,
            avg_context_recall=avg_context_recall,
            avg_hallucination_score=avg_hallucination,
            avg_answer_correctness=avg_correctness,
            avg_semantic_similarity=avg_similarity
        )
    else:
        summary = EvaluationSummary(
            total_tests=0,
            avg_response_time_ms=0,
            avg_chunks_retrieved=0,
            avg_relevance_score=0,
            avg_tokens_used=0,
            context_adherence_stats=context_adherence_stats,
            model_used=model_name,
            timestamp=datetime.now().isoformat()
        )
    
    # Print summary matrix
    print(f"\n{'='*60}")
    print("  COMPREHENSIVE EVALUATION MATRIX")
    print(f"{'='*60}")
    print(f"  Total Tests: {summary.total_tests} | Model: {summary.model_used}")
    print(f"  Avg Response Time: {summary.avg_response_time_ms:.0f}ms")
    
    print(f"\n  ┌{'─'*56}┐")
    print(f"  │ RETRIEVAL METRICS                                      │")
    print(f"  ├{'─'*56}┤")
    _print_progress_bar("Context Precision:", summary.avg_context_precision)
    _print_progress_bar("Context Recall:", summary.avg_context_recall)
    _print_progress_bar("Avg Relevance Score:", summary.avg_relevance_score)
    _print_progress_bar("Chunks Retrieved:", min(1.0, summary.avg_chunks_retrieved/5)) # Normalized to max 5
    
    print(f"  ├{'─'*56}┤")
    print(f"  │ GENERATION METRICS                                     │")
    print(f"  ├{'─'*56}┤")
    _print_progress_bar("Faithfulness:", summary.avg_faithfulness)
    _print_progress_bar("Answer Relevancy:", summary.avg_answer_relevancy)
    _print_progress_bar("Hallucination Score:", summary.avg_hallucination_score)
    print(f"  │ {'(lower is better)':<54} │")
    
    print(f"  ├{'─'*56}┤")
    print(f"  │ ACCURACY METRICS                                       │")
    print(f"  ├{'─'*56}┤")
    _print_progress_bar("Answer Correctness:", summary.avg_answer_correctness)
    _print_progress_bar("Semantic Similarity:", summary.avg_semantic_similarity)
    print(f"  └{'─'*56}┘\n")
    
    print(f"  Context Adherence Stats:")
    print(f"    - Strict:             {context_adherence_stats['strict']}")
    print(f"    - Partial:            {context_adherence_stats['partial']}")
    print(f"    - External Knowledge: {context_adherence_stats['external']}")
    print(f"    - Appropriate Decline:{context_adherence_stats['appropriate_decline']}")
    print(f"{'='*60}\n")
    
    # Save results
    if output_file is None:
        output_file = f"evaluation_results_{tenant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    output_data = {
        "summary": asdict(summary),
        "results": [asdict(r) for r in results]
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"Results saved to: {output_file}")
    
    return summary


async def quick_test(tenant_id: str, question: str):
    """Quick single question test."""
    tenant_settings = await get_tenant_settings(tenant_id)
    if not tenant_settings:
        print(f"ERROR: Tenant settings not found for '{tenant_id}'")
        return
    
    print(f"\nQuestion: {question}")
    print("-" * 60)
    
    result = await evaluate_single_query(
        question=question,
        tenant_id=tenant_id,
        tenant_settings=tenant_settings
    )
    
    print(f"Answer: {result.generated_answer}")
    print("-" * 60)
    print(f"Response Time:     {result.response_time_ms:.0f}ms")
    print(f"Chunks Used:       {result.chunks_retrieved}")
    print(f"Context Adherence: {result.context_adherence}")
    
    cm = result.comprehensive_metrics
    if cm:
        print(f"\nMetrics:")
        print(f"  Faithfulness:      {cm.faithfulness_score:.2f}")
        print(f"  Answer Relevancy:  {cm.answer_relevancy:.2f}")
        print(f"  Context Precision: {cm.context_precision:.2f}")
        print(f"  Hallucination:     {cm.hallucination_score:.2f}")



def main():
    parser = argparse.ArgumentParser(description="Evaluate RAG Model Performance")
    parser.add_argument(
        "--tenant_id", "-t",
        type=str,
        required=True,
        help="Tenant ID to evaluate"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Output file for results (JSON)"
    )
    parser.add_argument(
        "--question", "-q",
        type=str,
        default=None,
        help="Single question for quick test"
    )
    parser.add_argument(
        "--test-file", "-f",
        type=str,
        default=None,
        help="JSON file with custom test cases"
    )
    
    args = parser.parse_args()
    
    if args.question:
        # Quick single question test
        asyncio.run(quick_test(args.tenant_id, args.question))
    else:
        # Full evaluation
        test_cases = None
        if args.test_file:
            with open(args.test_file, "r", encoding="utf-8") as f:
                test_cases = json.load(f)
        
        asyncio.run(run_evaluation(
            tenant_id=args.tenant_id,
            test_cases=test_cases,
            output_file=args.output
        ))


if __name__ == "__main__":
    main()
