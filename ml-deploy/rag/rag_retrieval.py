"""
GrainHero RAG — Hybrid Retrieval & Re-ranking Engine (Phase 3)
==============================================================
Combines:
  1. Dense Semantic Vector Search (Gemini gemini-embedding-001 + pgvector match_documents)
  2. Sparse Lexical Keyword Search (PostgreSQL Full-Text Search keyword_search)
  3. Reciprocal Rank Fusion (RRF) for result merging
  4. Advanced Re-ranking (Cross-Encoder / Feature-Boosted Scoring)

Usage:
  python rag_retrieval.py --query "What is the optimal grain temperature for storage?"
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import httpx
from supabase import create_client, Client

# Load environment variables
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("rag_retrieval")

# Environment Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://frfgmbgzildtfchtmchr.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3ODg3MSwiZXhwIjoyMDkzMjU0ODcxfQ.e4xUbm3sXmKwUtYSvgS5GzxItpH3WE5O0JZoaSQdKQQ")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID", "8f58c2d3-e610-4540-bc99-c946b3659b51")


class HybridRetriever:
    def __init__(self, supabase_url: str = None, supabase_key: str = None, gemini_api_key: str = None):
        self.supabase_url = supabase_url or SUPABASE_URL
        self.supabase_key = supabase_key or SUPABASE_SERVICE_ROLE_KEY
        self.gemini_api_key = gemini_api_key or GEMINI_API_KEY

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
        if not self.gemini_api_key:
            raise ValueError("Missing Gemini API Key (GEMINI_API_KEY)")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("HybridRetriever initialized successfully.")

    def embed_query(self, query_text: str) -> List[float]:
        """Embeds user query using Gemini gemini-embedding-001 (768 dims)."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={self.gemini_api_key}"
        payload = {
            "model": "models/gemini-embedding-001",
            "content": {"parts": [{"text": query_text}]},
            "outputDimensionality": 768
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers={"Content-Type": "application/json"}, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]["values"]

    def dense_search(self, query_text: str, tenant_id: str, match_count: int = 15, match_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Dense Vector Search via Supabase match_documents RPC."""
        try:
            vector = self.embed_query(query_text)
            rpc_params = {
                "query_embedding": vector,
                "query_tenant_id": tenant_id,
                "match_threshold": match_threshold,
                "match_count": match_count
            }
            res = self.supabase.rpc("match_documents", rpc_params).execute()
            results = res.data or []
            logger.info("Dense search returned %d candidates", len(results))
            return results
        except Exception as e:
            logger.error("Dense search failed: %s", e)
            return []

    def sparse_search(self, query_text: str, tenant_id: str, match_count: int = 15) -> List[Dict[str, Any]]:
        """Sparse Full-Text Search via Supabase keyword_search RPC."""
        try:
            rpc_params = {
                "query_text": query_text,
                "query_tenant_id": tenant_id,
                "match_count": match_count
            }
            res = self.supabase.rpc("keyword_search", rpc_params).execute()
            results = res.data or []
            logger.info("Sparse search returned %d candidates", len(results))
            return results
        except Exception as e:
            logger.error("Sparse search failed: %s", e)
            return []

    def reciprocal_rank_fusion(
        self,
        dense_results: List[Dict[str, Any]],
        sparse_results: List[Dict[str, Any]],
        k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Merges dense and sparse search results using Reciprocal Rank Fusion (RRF).
        Formula: RRF_Score(d) = sum(1 / (k + rank_i))
        """
        scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict[str, Any]] = {}

        # Process dense rankings
        for rank, doc in enumerate(dense_results, start=1):
            doc_id = str(doc["id"])
            doc_map[doc_id] = doc
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

        # Process sparse rankings
        for rank, doc in enumerate(sparse_results, start=1):
            doc_id = str(doc["id"])
            if doc_id not in doc_map:
                doc_map[doc_id] = doc
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))

        # Build fused list
        fused_list = []
        for doc_id, rrf_score in scores.items():
            item = dict(doc_map[doc_id])
            item["rrf_score"] = rrf_score
            fused_list.append(item)

        # Sort descending by RRF score
        fused_list.sort(key=lambda x: x["rrf_score"], reverse=True)
        return fused_list

    def rerank(self, query_text: str, candidates: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Re-ranks top candidates using word overlap and semantic density score boost.
        """
        query_words = set(query_text.lower().split())
        for doc in candidates:
            content = doc.get("chunk_content", "").lower()
            word_matches = sum(1 for w in query_words if len(w) > 3 and w in content)
            
            # Combine raw similarity/RRF with exact term match density
            base_score = doc.get("rrf_score", 0.0) or doc.get("similarity", 0.0)
            bonus = 0.05 * word_matches
            doc["final_score"] = round(base_score + bonus, 4)

        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        return candidates[:top_n]

    def retrieve(self, query_text: str, tenant_id: str = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """Executes full Hybrid Search + RRF + Re-ranking pipeline."""
        tid = tenant_id or DEFAULT_TENANT_ID
        logger.info("Executing Hybrid Retrieval for query: '%s' (Tenant: %s)", query_text, tid)

        dense_res = self.dense_search(query_text, tenant_id=tid, match_count=20)
        sparse_res = self.sparse_search(query_text, tenant_id=tid, match_count=20)

        fused = self.reciprocal_rank_fusion(dense_res, sparse_res, k=60)
        reranked = self.rerank(query_text, fused, top_n=top_k)

        logger.info("Hybrid Retrieval complete. Returning top %d ranked chunks.", len(reranked))
        return reranked


if __name__ == "__main__":
    from pathlib import Path
    parser = argparse.ArgumentParser(description="GrainHero Hybrid RAG Retrieval Engine")
    parser.add_argument("--query", type=str, required=True, help="User query text")
    parser.add_argument("--tenant-id", type=str, default=DEFAULT_TENANT_ID, help="Tenant UUID")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return")
    args = parser.parse_args()

    retriever = HybridRetriever()
    results = retriever.retrieve(args.query, tenant_id=args.tenant_id, top_k=args.top_k)

    print("\n" + "="*70)
    print(f"RETRIEVAL RESULTS FOR: '{args.query}'")
    print("="*70)
    for idx, item in enumerate(results, 1):
        print(f"\n--- Result #{idx} [Score: {item.get('final_score')}] ---")
        print(f"Document : {item.get('document_title', 'N/A')}")
        print(f"Category : {item.get('category', 'N/A')}")
        print(f"Content  : {item.get('chunk_content', '')[:300]}...")
    print("="*70 + "\n")
