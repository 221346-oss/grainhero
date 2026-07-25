# GrainHero ML Server — Startup Script
# Run this from the project root:
#   .\start_ml_server.ps1

$env:SUPABASE_URL = "https://frfgmbgzildtfchtmchr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3ODg3MSwiZXhwIjoyMDkzMjU0ODcxfQ.e4xUbm3sXmKwUtYSvgS5GzxItpH3WE5O0JZoaSQdKQQ"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GrainHero ML Inference Server" -ForegroundColor Cyan
Write-Host "  http://localhost:8000" -ForegroundColor Green
Write-Host "  http://localhost:8000/docs  (Swagger UI)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\huggingface_deployment"

# ── Launch retrain watcher as a background job ────────────────────────────────
Write-Host "🚀 Starting Retrain Watcher (background)..." -ForegroundColor Yellow
$watcherJob = Start-Job -ScriptBlock {
    param($dir, $url, $key)
    $env:SUPABASE_URL = $url
    $env:SUPABASE_SERVICE_ROLE_KEY = $key
    Set-Location $dir
    python retrain_watcher.py
} -ArgumentList (Get-Location).Path, $env:SUPABASE_URL, $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "✅ Retrain Watcher running (Job ID: $($watcherJob.Id))" -ForegroundColor Green
Write-Host ""

# ── Launch MQTT to Supabase Bridge (background) ─────────────────────────────
Write-Host "🚀 Starting MQTT Bridge (background)..." -ForegroundColor Yellow
$bridgeJob = Start-Job -ScriptBlock {
    param($dir, $url, $key)
    $env:SUPABASE_URL = $url
    $env:SUPABASE_SERVICE_ROLE_KEY = $key
    Set-Location $dir
    node mqtt_bridge.js
} -ArgumentList (Get-Location).Path, $env:SUPABASE_URL, $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "✅ MQTT Bridge running (Job ID: $($bridgeJob.Id))" -ForegroundColor Green
Write-Host ""

# ── Launch FastAPI inference server (foreground) ──────────────────────────────
Write-Host "🚀 Starting FastAPI Inference Server..." -ForegroundColor Yellow
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# ── Cleanup jobs when server exits ─────────────────────────────────────────
Write-Host ""
Write-Host "🛑 Server stopped. Stopping background jobs..." -ForegroundColor Red
Stop-Job -Job $watcherJob
Remove-Job -Job $watcherJob
Stop-Job -Job $bridgeJob
Remove-Job -Job $bridgeJob

