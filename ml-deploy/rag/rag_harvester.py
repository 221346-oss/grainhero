"""
GrainHero RAG — Academic Paper Harvester
=========================================
Automatically fetches grain-storage research papers from 3 academic APIs:
  1. Semantic Scholar  — Best for agricultural science / post-harvest research
  2. CORE              — Open-access papers (supplements Semantic Scholar)
  3. arXiv             — ML/IoT/Computer Vision papers on grain quality detection

Downloads open-access PDFs into ml-deploy/rag/doc/ and optionally triggers
the RAG ingestion pipeline automatically.

Usage:
  python rag_harvester.py
  python rag_harvester.py --query "grain hotspot detection" --limit 5
  python rag_harvester.py --sources semantic_scholar core arxiv --ingest

API Keys (all free):
  SEMANTIC_SCHOLAR_API_KEY  → https://www.semanticscholar.org/product/api
  CORE_API_KEY              → https://core.ac.uk/services/api (free registration)
  arXiv needs NO key        → completely open
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus

import requests
import fitz  # PyMuPDF
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("rag_harvester")

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
DOC_DIR      = SCRIPT_DIR / "doc"
DOC_DIR.mkdir(parents=True, exist_ok=True)

SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
CORE_API_KEY             = os.getenv("CORE_API_KEY", "4Y5A7TfLctRhSjJ8UsW6nE9VQlZvzrO1")
# arXiv needs no key

# ── Default grain-storage search queries ──────────────────────────────────────
DEFAULT_QUERIES = [
    "grain storage hotspot temperature detection",
    "post-harvest grain spoilage mycotoxin prevention",
    "silo aeration moisture control grain quality",
    "grain storage pest insect detection IoT sensor",
    "stored grain temperature monitoring real-time",
    "grain moisture content predictive model",
    "aflatoxin contamination grain storage prevention",
    "grain bin temperature cable monitoring system",
]

# ── Data Model ────────────────────────────────────────────────────────────────
@dataclass
class PaperRecord:
    title:      str
    source:     str          # "semantic_scholar" | "core" | "arxiv"
    pdf_url:    Optional[str] = None
    paper_id:   str = ""
    year:       Optional[int] = None
    abstract:   str = ""
    authors:    List[str] = field(default_factory=list)


# =============================================================================
# Source 1: Semantic Scholar
# =============================================================================

def search_semantic_scholar(query: str, limit: int = 5) -> List[PaperRecord]:
    """Queries Semantic Scholar API for open-access grain research papers."""
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    headers = {}
    if SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

    params = {
        "query":  query,
        "limit":  min(limit, 20),
        "fields": "title,year,authors,abstract,openAccessPdf,externalIds",
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("Semantic Scholar search failed for '%s': %s", query, e)
        return []

    papers = []
    for item in data.get("data", []):
        pdf_info = item.get("openAccessPdf") or {}
        pdf_url  = pdf_info.get("url")
        if not pdf_url:
            continue  # Skip papers without open-access PDFs

        authors = [a.get("name", "") for a in item.get("authors", [])]
        papers.append(PaperRecord(
            title    = item.get("title", "Unknown"),
            source   = "semantic_scholar",
            pdf_url  = pdf_url,
            paper_id = item.get("paperId", ""),
            year     = item.get("year"),
            abstract = item.get("abstract", ""),
            authors  = authors,
        ))

    logger.info("[Semantic Scholar] '%s' -> %d open-access papers", query, len(papers))
    return papers


# =============================================================================
# Source 2: CORE
# =============================================================================

def search_core(query: str, limit: int = 5) -> List[PaperRecord]:
    """Queries CORE API for open-access agricultural papers."""
    if not CORE_API_KEY:
        logger.warning("[CORE] No CORE_API_KEY set — skipping CORE search.")
        return []

    url = "https://api.core.ac.uk/v3/search/works"
    headers = {"Authorization": f"Bearer {CORE_API_KEY}"}
    payload = {
        "q":      query,
        "limit":  min(limit, 20),
        "scroll": False,
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("CORE search failed for '%s': %s", query, e)
        return []

    papers = []
    for item in data.get("results", []):
        pdf_url = item.get("downloadUrl") or item.get("sourceFulltextUrls", [None])[0]
        if not pdf_url or not pdf_url.endswith(".pdf"):
            continue

        authors = [a.get("name", "") for a in item.get("authors", [])]
        papers.append(PaperRecord(
            title    = item.get("title", "Unknown"),
            source   = "core",
            pdf_url  = pdf_url,
            paper_id = str(item.get("id", "")),
            year     = item.get("yearPublished"),
            abstract = item.get("abstract", ""),
            authors  = authors,
        ))

    logger.info("[CORE] '%s' -> %d open-access papers", query, len(papers))
    return papers


# =============================================================================
# Source 3: arXiv
# =============================================================================

def search_arxiv(query: str, limit: int = 5) -> List[PaperRecord]:
    """Queries arXiv API for grain quality / IoT / ML sensor papers."""
    import xml.etree.ElementTree as ET

    encoded = quote_plus(query)
    url = (
        f"http://export.arxiv.org/api/query"
        f"?search_query=all:{encoded}"
        f"&start=0&max_results={min(limit, 20)}"
        f"&sortBy=relevance&sortOrder=descending"
    )

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("arXiv search failed for '%s': %s", query, e)
        return []

    ns = {
        "atom":   "http://www.w3.org/2005/Atom",
        "arxiv":  "http://arxiv.org/schemas/atom",
    }
    root = ET.fromstring(resp.text)
    papers = []

    for entry in root.findall("atom:entry", ns):
        title    = (entry.findtext("atom:title", "", ns) or "").strip()
        abstract = (entry.findtext("atom:summary", "", ns) or "").strip()
        paper_id = (entry.findtext("atom:id", "", ns) or "").strip()

        # arXiv always has a PDF — construct it from the abstract URL
        pdf_url = paper_id.replace("abs", "pdf") + ".pdf" if "abs" in paper_id else None
        if not pdf_url:
            continue

        year_raw = entry.findtext("atom:published", "", ns)
        year = int(year_raw[:4]) if year_raw else None

        authors = [
            a.findtext("atom:name", "", ns)
            for a in entry.findall("atom:author", ns)
        ]

        papers.append(PaperRecord(
            title    = title,
            source   = "arxiv",
            pdf_url  = pdf_url,
            paper_id = paper_id,
            year     = year,
            abstract = abstract,
            authors  = authors,
        ))

    logger.info("[arXiv] '%s' -> %d papers", query, len(papers))
    return papers


# =============================================================================
# PDF Downloader
# =============================================================================

def _safe_filename(title: str, source: str, paper_id: str) -> str:
    """Creates a safe, deduplicated filename from paper metadata."""
    slug = title[:60].strip()
    slug = "".join(c if c.isalnum() or c in " -_" else "_" for c in slug).strip()
    slug = slug.replace(" ", "_")
    uid  = hashlib.md5(paper_id.encode()).hexdigest()[:8]
    return f"{source}_{slug}_{uid}.pdf"

def check_relevance(title: str, abstract: str) -> bool:
    """Uses Gemini to check if a paper is relevant to GrainHero."""
    if not GEMINI_API_KEY:
        return True # Fallback if no key
        
    prompt = f"Title: {title}\nAbstract: {abstract}\n\nIs this paper highly relevant to grain storage, silos, post-harvest agriculture, IoT monitoring, or grain quality detection? Reply only with 'YES' or 'NO'."
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10}
    }
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            text = resp.json().get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "").strip().upper()
            return "YES" in text
    except Exception as e:
        logger.warning("Relevance check failed: %s", e)
    return True # Default to True on failure

def download_pdf(paper: PaperRecord, out_dir: Path, timeout: int = 30) -> Optional[Path]:
    """Downloads a single PDF. Returns the file path if successful."""
    filename = _safe_filename(paper.title, paper.source, paper.paper_id)
    out_path = out_dir / filename

    if out_path.exists():
        logger.info("  [SKIP] Already downloaded: %s", filename)
        return out_path

    try:
        headers = {"User-Agent": "GrainHero-RAG-Harvester/1.0 (academic research)"}
        resp = requests.get(paper.pdf_url, headers=headers, timeout=timeout, stream=True)
        resp.raise_for_status()

        # Verify it's actually a PDF
        content_type = resp.headers.get("Content-Type", "")
        if "pdf" not in content_type and not paper.pdf_url.endswith(".pdf"):
            logger.warning("  [SKIP] Not a PDF (%s): %s", content_type, paper.pdf_url)
            return None

        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        # Parse check
        try:
            doc = fitz.open(str(out_path))
            text = ""
            for page in doc[:3]: # check first 3 pages
                text += page.get_text("text")
            doc.close()
            
            if len(text.strip()) < 100:
                # Unparseable
                logger.warning("  [UNPARSEABLE] Saved link for manual review.")
                with open(out_dir.parent / "UNPARSEABLE_LINKS.md", "a", encoding="utf-8") as link_file:
                    link_file.write(f"- [{paper.title}]({paper.pdf_url})\n")
                out_path.unlink()
                return None
        except Exception:
            logger.warning("  [UNPARSEABLE] Saved link for manual review.")
            with open(out_dir.parent / "UNPARSEABLE_LINKS.md", "a", encoding="utf-8") as link_file:
                link_file.write(f"- [{paper.title}]({paper.pdf_url})\n")
            out_path.unlink()
            return None

        size_kb = out_path.stat().st_size // 1024
        logger.info("  [OK] %s (%d KB) from %s", filename, size_kb, paper.source)
        return out_path

    except Exception as e:
        logger.warning("  [FAIL] Could not download '%s': %s", paper.title[:60], e)
        if out_path.exists():
            out_path.unlink()
        return None


# =============================================================================
# Main Harvester
# =============================================================================

def harvest(
    queries: List[str],
    sources: List[str],
    limit_per_query: int = 5,
    ingest: bool = False,
) -> List[Path]:
    """
    Main entry point. Searches all enabled sources for each query,
    downloads open-access PDFs, and optionally triggers RAG ingestion.
    """
    all_papers: List[PaperRecord] = []
    seen_urls: set = set()

    for query in queries:
        logger.info("=== Searching: '%s' ===", query)

        if "semantic_scholar" in sources:
            papers = search_semantic_scholar(query, limit=limit_per_query)
            all_papers.extend(papers)
            time.sleep(0.5)  # Be polite to API

        if "core" in sources:
            papers = search_core(query, limit=limit_per_query)
            all_papers.extend(papers)
            time.sleep(0.5)

        if "arxiv" in sources:
            papers = search_arxiv(query, limit=limit_per_query)
            all_papers.extend(papers)
            time.sleep(0.5)

    # Deduplicate by PDF URL
    unique_papers = []
    for paper in all_papers:
        if paper.pdf_url and paper.pdf_url not in seen_urls:
            seen_urls.add(paper.pdf_url)
            
            # Semantic relevance check
            if check_relevance(paper.title, paper.abstract):
                unique_papers.append(paper)
            else:
                logger.info("  [SKIP] Irrelevant paper: %s", paper.title[:60])

    logger.info("=== Found %d unique relevant downloadable papers across all sources ===", len(unique_papers))

    # Download all PDFs
    downloaded: List[Path] = []
    for i, paper in enumerate(unique_papers, 1):
        logger.info("[%d/%d] Downloading: %s (%s, %s)",
                    i, len(unique_papers), paper.title[:60], paper.source, paper.year or "?")
        path = download_pdf(paper, DOC_DIR)
        if path:
            downloaded.append(path)
        time.sleep(1.0)  # Rate limit — be respectful to servers

    logger.info("=== Download complete: %d/%d PDFs saved to %s ===",
                len(downloaded), len(unique_papers), DOC_DIR)

    # Optionally trigger RAG ingestion
    if ingest and downloaded:
        logger.info("=== Triggering RAG ingestion for new documents ===")
        ingest_script = SCRIPT_DIR / "rag_ingest.py"
        python_exe    = SCRIPT_DIR / ".venv" / "Scripts" / "python.exe"
        if python_exe.exists() and ingest_script.exists():
            import subprocess
            result = subprocess.run(
                [str(python_exe), str(ingest_script), "--dir", str(DOC_DIR)],
                capture_output=False,
            )
            if result.returncode == 0:
                logger.info("Ingestion completed successfully.")
            else:
                logger.error("Ingestion failed with exit code %d.", result.returncode)
        else:
            logger.warning("Could not find python venv or rag_ingest.py — run ingestion manually.")

    return downloaded


# =============================================================================
# CLI Entry Point
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="GrainHero RAG Academic Paper Harvester"
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Single search query (default: runs all built-in grain queries)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=3,
        help="Max papers to fetch per query per source (default: 3)",
    )
    parser.add_argument(
        "--sources",
        nargs="+",
        default=["semantic_scholar", "core", "arxiv"],
        choices=["semantic_scholar", "core", "arxiv"],
        help="Which sources to query (default: all 3)",
    )
    parser.add_argument(
        "--ingest",
        action="store_true",
        help="Auto-run RAG ingestion after downloading",
    )
    args = parser.parse_args()

    queries = [args.query] if args.query else DEFAULT_QUERIES

    print("\n" + "="*65)
    print("  GrainHero RAG - Academic Paper Harvester")
    print("="*65)
    print(f"  Sources  : {', '.join(args.sources)}")
    print(f"  Queries  : {len(queries)}")
    print(f"  Limit    : {args.limit} papers/query/source")
    print(f"  Output   : {DOC_DIR}")
    print(f"  Auto-ingest: {'YES' if args.ingest else 'NO'}")
    print("="*65 + "\n")

    # API key warnings
    if "semantic_scholar" in args.sources and not SEMANTIC_SCHOLAR_API_KEY:
        print("[!] SEMANTIC_SCHOLAR_API_KEY not set — using unauthenticated (100 req/5min limit)")
        print("    Get a free key at: https://www.semanticscholar.org/product/api\n")

    if "core" in args.sources and not CORE_API_KEY:
        print("[!] CORE_API_KEY not set — CORE search will be SKIPPED")
        print("    Get a free key at: https://core.ac.uk/services/api\n")

    downloaded = harvest(
        queries=queries,
        sources=args.sources,
        limit_per_query=args.limit,
        ingest=args.ingest,
    )

    print(f"\n  Successfully downloaded {len(downloaded)} new papers.")
    print(f"  Saved to: {DOC_DIR}\n")
