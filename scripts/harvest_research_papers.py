"""
GrainHero Research Paper Harvester v1.0
=========================================
Uses OpenAlex + CORE + Unpaywall APIs to find and download
grain storage research papers automatically.

Usage:
    python scripts/harvest_research_papers.py

Adds new PDFs to: newly_added_papers/
Then automatically runs the indexer to update the knowledge base.
"""

import sys
import os
import re
import time
import json
import requests
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ─── CONFIG ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = r"c:\Users\Nexgen\Projects\GrainHero_latest\newly_added_papers"
CONTACT_EMAIL = "grainhero@teqrock.com"  # Required for OpenAlex polite pool
MAX_PAPERS_PER_QUERY = 20
DOWNLOAD_PDFS = True  # Set False to only discover, not download

# SEARCH QUERIES — Highly curated for GrainHero deep-tech and frugal engineering
SEARCH_QUERIES = [
    "wireless architecture for silo monitoring",
    "frugal engineering low cost automated smart silo",
    "grain silo auxiliary systems and infrastructure",
    "grain science techniques prolonged shelf life storage",
    "eco-friendly sustainable silo storage monitoring",
    "off-grid solar power solutions agriculture warehouses mills",
    "low-cost IoT grain storage monitoring",
    "cost-effective post-harvest grain loss reduction",
    "wireless sensor network grain temperature humidity",
    "automated grain silo aeration fan control",
    "carbon dioxide monitoring stored grain pests",
    "hermetic storage monitoring smart agriculture",
    "pneumatic grain conveyor performance optimization",
    "grain silo structural engineering dynamics",
    "blockchain supply chain traceability food security",
    "grain bulk moisture content capacitive sensing",
    "mycotoxin aflatoxin prevention storage conditions",
    "predictive maintenance grain silo microclimate",
    "machine learning early grain spoilage prediction",
    "solar powered wireless sensor node agriculture"
]

# OpenAlex concept IDs for filtering (grain/agriculture related)
RELEVANT_CONCEPTS = [
    "grain storage", "food security", "post-harvest",
    "precision agriculture", "Internet of Things", "machine learning"
]

# ─── OPENALEX ──────────────────────────────────────────────────────────────────

def search_openalex(query: str, per_page: int = MAX_PAPERS_PER_QUERY) -> list[dict]:
    """Search OpenAlex for papers matching the query."""
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "filter": "open_access.is_oa:true",  # Only papers with free PDFs
        "per-page": per_page,
        "sort": "cited_by_count:desc",
        "mailto": CONTACT_EMAIL,
        "select": "id,doi,title,publication_year,cited_by_count,open_access,primary_location,abstract_inverted_index"
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            return resp.json().get("results", [])
    except Exception as e:
        print(f"   [OpenAlex Error] {e}")
    return []

def get_oa_pdf_url(work: dict) -> str | None:
    """Extract open access PDF URL from OpenAlex work."""
    oa = work.get("open_access", {})
    if oa.get("oa_url"):
        return oa["oa_url"]
    loc = work.get("best_oa_location", {})
    if loc.get("url_for_pdf"):
        return loc["url_for_pdf"]
    return None

def reconstruct_abstract(inverted_index: dict | None) -> str:
    """Reconstruct abstract from OpenAlex inverted index format."""
    if not inverted_index:
        return ""
    positions = []
    for word, pos_list in inverted_index.items():
        for pos in pos_list:
            positions.append((pos, word))
    positions.sort(key=lambda x: x[0])
    return " ".join(word for _, word in positions)

# ─── CORE API ──────────────────────────────────────────────────────────────────

def search_core(query: str, limit: int = 10) -> list[dict]:
    """Search CORE for open access papers."""
    url = "https://api.core.ac.uk/v3/search/works"
    params = {
        "q": query,
        "limit": limit,
        "exclude": "fullText",
    }
    # CORE works without API key but has lower limits
    try:
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            return resp.json().get("results", [])
    except Exception as e:
        print(f"   [CORE Error] {e}")
    return []

# ─── DOWNLOADER ────────────────────────────────────────────────────────────────

def sanitize_filename(title: str) -> str:
    """Create a safe filename from a paper title."""
    clean = re.sub(r'[^\w\s-]', '', title)
    clean = re.sub(r'\s+', '_', clean.strip())
    return clean[:80] + ".pdf"

def download_pdf(url: str, output_path: str) -> bool:
    """Download a PDF from URL."""
    if os.path.exists(output_path):
        print(f"   [SKIP] Already downloaded: {os.path.basename(output_path)}")
        return False
    try:
        headers = {"User-Agent": "GrainHero Research Bot (mailto:grainhero@teqrock.com)"}
        resp = requests.get(url, headers=headers, timeout=30, stream=True)
        if resp.status_code == 200 and "pdf" in resp.headers.get("content-type", "").lower():
            with open(output_path, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
            size_kb = os.path.getsize(output_path) // 1024
            print(f"   [✅ Downloaded] {os.path.basename(output_path)} ({size_kb}KB)")
            return True
        else:
            print(f"   [SKIP] Not a PDF or bad status ({resp.status_code}): {url[:60]}")
    except Exception as e:
        print(f"   [Error] Failed to download {url[:60]}: {e}")
    return False

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Track already-known DOIs to avoid duplicates
    known_dois_file = os.path.join(OUTPUT_DIR, ".known_dois.json")
    known_dois = set()
    if os.path.exists(known_dois_file):
        with open(known_dois_file, "r") as f:
            known_dois = set(json.load(f))

    print(f"\n{'='*60}")
    print(f"GrainHero Research Harvester v1.0")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    new_papers = []
    all_results = []

    # ── Phase 1: OpenAlex ────────────────────────────────────────────────────
    print("📡 Phase 1: Searching OpenAlex (Open Access papers only)...\n")
    for query in SEARCH_QUERIES:
        print(f"  Query: '{query}'")
        results = search_openalex(query)
        print(f"  → Found {len(results)} papers")
        all_results.extend(results)
        time.sleep(0.5)  # Be polite to API

    # Deduplicate by DOI
    seen_dois = set(known_dois)
    unique_results = []
    for r in all_results:
        raw_doi = r.get("doi")
        doi = raw_doi.replace("https://doi.org/", "") if raw_doi else ""
        if doi and doi not in seen_dois:
            seen_dois.add(doi)
            unique_results.append(r)
    
    print(f"\n✅ Unique new papers found via OpenAlex: {len(unique_results)}\n")

    # ── Phase 2: Download ────────────────────────────────────────────────────
    if DOWNLOAD_PDFS:
        print("📥 Phase 2: Downloading open access PDFs...\n")
        for work in unique_results:
            title = work.get("title", "Unknown Paper")
            raw_doi = work.get("doi")
            doi = raw_doi.replace("https://doi.org/", "") if raw_doi else ""
            year = work.get("publication_year", "")
            citations = work.get("cited_by_count", 0)
            
            pdf_url = get_oa_pdf_url(work)
            abstract = reconstruct_abstract(work.get("abstract_inverted_index"))
            
            print(f"\n  📄 {title[:70]}...")
            print(f"     Year: {year} | Citations: {citations} | DOI: {doi[:40]}")
            
            downloaded = False
            if pdf_url:
                filename = sanitize_filename(f"{year}_{title[:60]}" if year else title[:70])
                output_path = os.path.join(OUTPUT_DIR, filename)
                downloaded = download_pdf(pdf_url, output_path)
            else:
                print(f"   [NO PDF] No open access PDF available")
            
            new_papers.append({
                "title": title,
                "doi": doi,
                "year": year,
                "citations": citations,
                "pdf_url": pdf_url,
                "abstract_preview": abstract[:300] if abstract else "",
                "downloaded": downloaded,
                "timestamp": datetime.now().isoformat(),
            })
            
            if doi:
                known_dois.add(doi)
            
            time.sleep(0.5)

    # Save updated known DOIs
    with open(known_dois_file, "w") as f:
        json.dump(list(known_dois), f, indent=2)

    # ── Phase 3: Weekly Approval Report ──────────────────────────────────────
    report_path = os.path.join(
        r"c:\Users\Nexgen\Projects\GrainHero_latest\_ANALYSIS",
        "DAILY_RESEARCH_APPROVAL.md"
    )
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# GrainHero Daily Research Approval Report\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write("> **INSTRUCTIONS:** Review the newly discovered papers below. Delete any papers that are irrelevant. Once approved, the AI assistant will integrate the findings and run the indexer.\n\n")
        f.write(f"**Total unique new papers discovered:** {len(new_papers)}\n")
        downloaded_count = sum(1 for p in new_papers if p.get("downloaded"))
        f.write(f"**PDFs Downloaded:** {downloaded_count}\n\n")
        f.write("---\n\n")
        
        for p in sorted(new_papers, key=lambda x: x.get("citations", 0), reverse=True):
            f.write(f"### {p['title']}\n")
            f.write(f"- **Year:** {p.get('year', 'N/A')} | **Citations:** {p.get('citations', 0)}\n")
            f.write(f"- **DOI:** `{p.get('doi', 'N/A')}`\n")
            if p.get("pdf_url"):
                f.write(f"- **PDF:** [{p['pdf_url'][:60]}]({p['pdf_url']})\n")
            if p.get("abstract_preview"):
                f.write(f"- **Abstract:** {p['abstract_preview']}...\n")
            f.write(f"- **Downloaded:** {'✅' if p.get('downloaded') else '❌ No OA PDF'}\n\n")

    print(f"\n📋 Daily Approval Report saved: {report_path}")
    print(f"\n🛑 AUTOMATION PAUSED FOR HUMAN APPROVAL.")
    print(f"Please review DAILY_RESEARCH_APPROVAL.md and tell the AI to integrate it.")
    print("\n✅ Harvester done!\n")

if __name__ == "__main__":
    main()
