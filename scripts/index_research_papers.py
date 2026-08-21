"""
GrainHero Research Paper Indexer v2.0
======================================
Scans ALL PDF folders, extracts key info in ~500-word chunks, 
and enriches with OpenAlex/Unpaywall API data.
Run this script every time new PDFs are added.
Output: _ANALYSIS/RESEARCH_KNOWLEDGE_BASE.md

Usage:
    python scripts/index_research_papers.py
"""

import sys
import os
import re
import glob
import json
import time
import hashlib
import requests
from datetime import datetime

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    from pypdf import PdfReader
except ImportError:
    print("Installing pypdf...")
    os.system("pip install pypdf")
    from pypdf import PdfReader

# ─── CONFIG ────────────────────────────────────────────────────────────────────
# All PDF source folders (add new ones here as you get more papers)
PDF_SOURCE_DIRS = [
    r"c:\Users\Nexgen\Downloads\FYP\Research Papers",
    r"c:\Users\Nexgen\Projects\GrainHero_latest\newly_added_papers",
    r"c:\Users\Nexgen\Projects\GrainHero_latest\research papers",
]

OUTPUT_FILE = r"c:\Users\Nexgen\Projects\GrainHero_latest\_ANALYSIS\RESEARCH_KNOWLEDGE_BASE.md"
HASH_CACHE_FILE = r"c:\Users\Nexgen\Projects\GrainHero_latest\_ANALYSIS\.paper_hashes.json"

# How many characters to extract per paper (~500 words = ~3000 chars)
CHARS_PER_PAPER = 3500

# OpenAlex email (required for polite pool — faster rate limits)
CONTACT_EMAIL = "grainhero@teqrock.com"

# Irrelevant papers to skip (exact filename matches)
SKIP_PAPERS = {
    "Polycrystal_enengy storage_supplementary material_APL_24-9-9.pdf",  # Materials science, irrelevant
}

# ─── HELPERS ───────────────────────────────────────────────────────────────────

def get_file_hash(path: str) -> str:
    """Get MD5 hash of file to detect changes."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def load_hash_cache() -> dict:
    if os.path.exists(HASH_CACHE_FILE):
        with open(HASH_CACHE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_hash_cache(cache: dict):
    os.makedirs(os.path.dirname(HASH_CACHE_FILE), exist_ok=True)
    with open(HASH_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

def extract_pdf_text(pdf_path: str, max_chars: int = CHARS_PER_PAPER) -> str:
    """Extract text from PDF, up to max_chars characters."""
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        text = ""
        # Extract first 4 pages (abstract, intro, methods, conclusion)
        pages_to_read = min(4, total_pages)
        for i in range(pages_to_read):
            page_text = reader.pages[i].extract_text()
            if page_text:
                text += page_text + "\n"
        # Also grab last page (often has conclusions)
        if total_pages > 4:
            last_text = reader.pages[-1].extract_text()
            if last_text:
                text += "\n--- CONCLUSION/LAST PAGE ---\n" + last_text
        
        # Clean up whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]{2,}', ' ', text)
        return text[:max_chars].strip()
    except Exception as e:
        return f"[PDF extraction error: {e}]"

def extract_doi_from_text(text: str) -> str | None:
    """Try to find a DOI in the extracted text."""
    doi_pattern = r'\b(10\.\d{4,}/[^\s\]>\"\']+)'
    match = re.search(doi_pattern, text)
    if match:
        doi = match.group(1).rstrip(".,;)")
        return doi
    return None

def query_openalex(doi: str = None, title: str = None) -> dict | None:
    """Query OpenAlex API for paper metadata."""
    try:
        if doi:
            url = f"https://api.openalex.org/works/doi:{doi}?mailto={CONTACT_EMAIL}"
        elif title:
            clean_title = re.sub(r'[^\w\s]', '', title)[:80]
            url = f"https://api.openalex.org/works?search={requests.utils.quote(clean_title)}&mailto={CONTACT_EMAIL}&per-page=1"
        else:
            return None
        
        resp = requests.get(url, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            if doi:
                return data  # direct work object
            elif "results" in data and data["results"]:
                return data["results"][0]
    except Exception:
        pass
    return None

def query_unpaywall(doi: str) -> str | None:
    """Get open-access PDF URL from Unpaywall."""
    try:
        url = f"https://api.unpaywall.org/v2/{doi}?email={CONTACT_EMAIL}"
        resp = requests.get(url, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("best_oa_location") and data["best_oa_location"].get("url_for_pdf"):
                return data["best_oa_location"]["url_for_pdf"]
    except Exception:
        pass
    return None

def format_openalex_metadata(meta: dict) -> str:
    """Format OpenAlex metadata into readable markdown."""
    if not meta or not isinstance(meta, dict):
        return ""
    lines = []
    if meta.get("title"):
        lines.append(f"**Title:** {meta['title']}")
    if meta.get("publication_year"):
        lines.append(f"**Year:** {meta['publication_year']}")
    if meta.get("cited_by_count") is not None:
        lines.append(f"**Citations:** {meta['cited_by_count']}")
    try:
        loc = meta.get("primary_location") or {}
        src = loc.get("source") or {} if isinstance(loc, dict) else {}
        journal = src.get("display_name") if isinstance(src, dict) else None
        if journal:
            lines.append(f"**Journal:** {journal}")
    except Exception:
        pass
    try:
        oa = meta.get("open_access") or {}
        if isinstance(oa, dict) and oa.get("oa_url"):
            lines.append(f"**Open Access PDF:** {oa['oa_url']}")
    except Exception:
        pass
    try:
        concepts = [c["display_name"] for c in (meta.get("concepts") or [])[:5] if isinstance(c, dict)]
        if concepts:
            lines.append(f"**Key Concepts:** {', '.join(concepts)}")
    except Exception:
        pass
    return "\n".join(lines)

# ─── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    # Collect all PDFs from all folders
    all_pdfs = []
    for folder in PDF_SOURCE_DIRS:
        if os.path.exists(folder):
            found = glob.glob(os.path.join(folder, "**/*.pdf"), recursive=True)
            found += glob.glob(os.path.join(folder, "*.pdf"))
            all_pdfs.extend(found)
        else:
            print(f"[WARN] Folder not found, skipping: {folder}")

    # Deduplicate by absolute path
    all_pdfs = list({os.path.abspath(p): p for p in all_pdfs}.values())
    
    # Filter irrelevant papers
    all_pdfs = [p for p in all_pdfs if os.path.basename(p) not in SKIP_PAPERS]
    all_pdfs.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    
    print(f"\n{'='*60}")
    print(f"GrainHero Research Indexer v2.0")
    print(f"Found {len(all_pdfs)} PDFs across {len(PDF_SOURCE_DIRS)} folders")
    print(f"{'='*60}\n")

    hash_cache = load_hash_cache()
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# GrainHero Research Knowledge Base\n")
        f.write(f"> **Auto-generated** | Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Papers: {len(all_pdfs)}\n\n")
        f.write("> This file is auto-generated by `scripts/index_research_papers.py`. DO NOT edit manually.\n")
        f.write("> Run `python scripts/index_research_papers.py` whenever new PDFs are added.\n\n")
        f.write("---\n\n")
        f.write("## TABLE OF CONTENTS\n\n")

        papers_data = []

        for i, pdf_path in enumerate(all_pdfs, 1):
            filename = os.path.basename(pdf_path)
            folder_name = os.path.basename(os.path.dirname(pdf_path))
            print(f"[{i}/{len(all_pdfs)}] Extracting: {filename}")
            
            # Extract text
            text = extract_pdf_text(pdf_path)
            
            # Try to find DOI
            doi = extract_doi_from_text(text)
            
            # Clean title from filename
            clean_title = os.path.splitext(filename)[0]
            clean_title = re.sub(r'[-_+]', ' ', clean_title).strip()
            clean_title = re.sub(r'\s+', ' ', clean_title)
            
            papers_data.append({
                "index": i,
                "filename": filename,
                "folder": folder_name,
                "clean_title": clean_title,
                "doi": doi,
                "text": text,
                "path": pdf_path,
            })
            
            # Write TOC entry
            anchor = re.sub(r'[^\w]', '-', filename.lower())[:60]
            f.write(f"{i}. [{clean_title[:80]}](#{anchor})\n")

        f.write("\n---\n\n")

        # Now write each paper's full entry
        for paper in papers_data:
            i = paper["index"]
            filename = paper["filename"]
            clean_title = paper["clean_title"]
            doi = paper["doi"]
            text = paper["text"]
            folder = paper["folder"]

            anchor = re.sub(r'[^\w]', '-', filename.lower())[:60]
            f.write(f"## {i}. {clean_title[:100]}\n")
            f.write(f'<a name="{anchor}"></a>\n\n')
            f.write(f"**Source Folder:** `{folder}` | **File:** `{filename}`\n\n")
            
            if doi:
                f.write(f"**DOI:** `{doi}`\n\n")

            # Query OpenAlex if we have DOI
            meta = None
            if doi:
                print(f"   -> Querying OpenAlex for DOI: {doi}")
                meta = query_openalex(doi=doi)
                time.sleep(0.3)  # Be polite to the API
            
            if meta:
                f.write("### 📊 Structured Metadata (OpenAlex)\n\n")
                f.write(format_openalex_metadata(meta) + "\n\n")
                
                # Check for open access PDF
                oa_url = meta.get("open_access", {}).get("oa_url")
                if oa_url:
                    f.write(f"**✅ Open Access PDF:** [{oa_url}]({oa_url})\n\n")
                elif doi:
                    # Try Unpaywall
                    oa_pdf = query_unpaywall(doi)
                    if oa_pdf:
                        f.write(f"**✅ Open Access PDF (Unpaywall):** [{oa_pdf}]({oa_pdf})\n\n")
                    time.sleep(0.3)

            # Key text extract (~500 words)
            f.write("### 📄 Key Information Extract (~500 words)\n\n")
            f.write("```text\n")
            f.write(text + "\n")
            f.write("```\n\n")
            f.write("---\n\n")

    save_hash_cache({p["path"]: get_file_hash(p["path"]) for p in papers_data})

    print(f"\n✅ Knowledge base written to: {OUTPUT_FILE}")
    print(f"   Total papers indexed: {len(papers_data)}")
    print(f"   Hash cache saved for incremental updates\n")

if __name__ == "__main__":
    main()
