# GrainHero RAG — Ingestion Runner
# ====================================
# This script runs the RAG ingestion pipeline with all required environment
# variables pre-loaded. You only need to fill in SUPABASE_SERVICE_ROLE_KEY
# and optionally OPENAI_API_KEY below.
#
# Usage:
#   .\run_rag_ingest.ps1

# ── 1. FILL THESE IN ─────────────────────────────────────────────────────────
# Get your service role key from: Supabase Dashboard → Settings → API
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3ODg3MSwiZXhwIjoyMDkzMjU0ODcxfQ.e4xUbm3sXmKwUtYSvgS5GzxItpH3WE5O0JZoaSQdKQQ"

# Get your Gemini key from: https://aistudio.google.com/apikey
$env:GEMINI_API_KEY            = "YOUR_GEMINI_API_KEY"
$env:EMBEDDING_MODEL           = "gemini"

# ── 2. AUTO-LOADED FROM .env (do not change) ──────────────────────────────────
$env:SUPABASE_URL              = "https://frfgmbgzildtfchtmchr.supabase.co"

# ── 3. YOUR TENANT ID ─────────────────────────────────────────────────────────
# Find this in Supabase → SQL Editor → run: SELECT id FROM organizations LIMIT 1;
# OR use any user UUID from: SELECT id FROM auth.users LIMIT 1;
$TENANT_ID = "8f58c2d3-e610-4540-bc99-c946b3659b51"

# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GrainHero RAG Ingestion Pipeline"  -ForegroundColor Cyan
Write-Host "  Ingesting all docs in rag/doc/"    -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($env:SUPABASE_SERVICE_ROLE_KEY -eq "YOUR_SERVICE_ROLE_KEY_HERE") {
    Write-Host "❌ ERROR: Please fill in SUPABASE_SERVICE_ROLE_KEY in this script first!" -ForegroundColor Red
    Write-Host "   Get it from: Supabase Dashboard → Settings → API → service_role key" -ForegroundColor Yellow
    exit 1
}

if ($TENANT_ID -eq "YOUR_TENANT_UUID_HERE") {
    Write-Host "❌ ERROR: Please fill in your TENANT_ID in this script first!" -ForegroundColor Red
    Write-Host "   Run in Supabase SQL Editor: SELECT id FROM auth.users LIMIT 1;" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Starting ingestion of all PDFs in ml-deploy\rag\doc\" -ForegroundColor White
Write-Host ""

ml-deploy\rag\.venv\Scripts\python.exe ml-deploy\rag\rag_ingest.py `
    --dir ml-deploy\rag\doc `
    --category manual `
    --tenant-id $TENANT_ID

Write-Host ""
Write-Host "✅ Ingestion run complete!" -ForegroundColor Green
