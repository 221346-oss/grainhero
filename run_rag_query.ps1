# GrainHero RAG — Query & Retrieval Runner
# ========================================
# Run this script to test hybrid retrieval & re-ranking against Supabase:
#   .\run_rag_query.ps1 -Query "How to detect hot spots in grain silos?"
#

param (
    [Parameter(Mandatory=$false)]
    [string]$Query = "hotspot detection in stored grain temperature"
)

$VenvPython = Join-Path $PSScriptRoot "ml-deploy\rag\.venv\Scripts\python.exe"
$RetrievalScript = Join-Path $PSScriptRoot "ml-deploy\rag\rag_retrieval.py"

if (-not (Test-Path $VenvPython)) {
    Write-Host "❌ RAG venv not found! Please run activate_rag.ps1 first." -ForegroundColor Red
    exit 1
}

$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3ODg3MSwiZXhwIjoyMDkzMjU0ODcxfQ.e4xUbm3sXmKwUtYSvgS5GzxItpH3WE5O0JZoaSQdKQQ"
$env:GEMINI_API_KEY            = "YOUR_GEMINI_API_KEY"
$env:SUPABASE_URL              = "https://frfgmbgzildtfchtmchr.supabase.co"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GrainHero RAG Retrieval Engine" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Query: $Query" -ForegroundColor Yellow
Write-Host ""

& $VenvPython $RetrievalScript --query $Query
