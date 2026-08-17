# GrainHero RAG - Academic Paper Harvester Runner
# ================================================
# Fetches grain storage research papers from:
#   - Semantic Scholar  (best for agricultural science)
#   - CORE              (open-access supplement)
#   - arXiv             (ML/IoT/CV grain quality papers)
#
# Usage:
#   .\run_rag_harvest.ps1                         # Run with default queries
#   .\run_rag_harvest.ps1 -Query "grain moisture" # Custom query
#   .\run_rag_harvest.ps1 -Limit 5 -Ingest        # Download 5 papers + auto-ingest
#
param (
    [string]$Query  = "",
    [int]$Limit     = 3,
    [switch]$Ingest,
    [string[]]$Sources = @("semantic_scholar", "core", "arxiv")
)

# ── API Keys (fill in your free keys here) ────────────────────────────────────
# Semantic Scholar: https://www.semanticscholar.org/product/api  (free, 1 req/sec)
$env:SEMANTIC_SCHOLAR_API_KEY = ""   # <-- OPTIONAL but recommended

# CORE: https://core.ac.uk/services/api  (free after registration)
$env:CORE_API_KEY             = ""   # <-- REQUIRED for CORE source

# arXiv: no key needed, always works

# ── Paths ─────────────────────────────────────────────────────────────────────
$VenvPython     = Join-Path $PSScriptRoot "ml-deploy\rag\.venv\Scripts\python.exe"
$HarvestScript  = Join-Path $PSScriptRoot "ml-deploy\rag\rag_harvester.py"

if (-not (Test-Path $VenvPython)) {
    Write-Host "ERROR: RAG venv not found. Please run activate_rag.ps1 first." -ForegroundColor Red
    exit 1
}

# ── Build argument list ───────────────────────────────────────────────────────
$args_list = @(
    $HarvestScript,
    "--limit", $Limit,
    "--sources"
) + $Sources

if ($Query -ne "") {
    $args_list += "--query"
    $args_list += $Query
}

if ($Ingest) {
    $args_list += "--ingest"
}

# ── Run ───────────────────────────────────────────────────────────────────────
& $VenvPython @args_list
