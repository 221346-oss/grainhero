# GrainHero ML Server — Startup Script
# Run this from the project root:
#   .\start_ml_server.ps1

$env:SUPABASE_URL             = "https://frfgmbgzildtfchtmchr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY= "YOUR_SUPABASE_SERVICE_ROLE_KEY"
$env:OPENWEATHER_API_KEY      = "YOUR_OPENWEATHER_API_KEY"
$env:MQTT_BROKER_URL          = "mqtt://10.10.40.137:1883"
$env:MQTT_USERNAME            = "admin"
$env:MQTT_PASSWORD            = "password"
$env:SUPABASE_INGEST_URL      = "https://frfgmbgzildtfchtmchr.supabase.co/functions/v1/ingest"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GrainHero ML Inference Server" -ForegroundColor Cyan
Write-Host "  http://localhost:8000" -ForegroundColor Green
Write-Host "  http://localhost:8000/docs  (Swagger UI)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\ml-deploy"

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
    param($dir, $url, $key, $mqttUrl, $mqttUser, $mqttPass, $ingestUrl)
    $env:SUPABASE_URL             = $url
    $env:SUPABASE_SERVICE_ROLE_KEY= $key
    $env:MQTT_BROKER_URL          = $mqttUrl
    $env:MQTT_USERNAME            = $mqttUser
    $env:MQTT_PASSWORD            = $mqttPass
    $env:SUPABASE_INGEST_URL      = $ingestUrl
    Set-Location $dir
    node mqtt_bridge.js
} -ArgumentList (Get-Location).Path, $env:SUPABASE_URL, $env:SUPABASE_SERVICE_ROLE_KEY, $env:MQTT_BROKER_URL, $env:MQTT_USERNAME, $env:MQTT_PASSWORD, $env:SUPABASE_INGEST_URL

Write-Host "✅ MQTT Bridge running (Job ID: $($bridgeJob.Id))" -ForegroundColor Green
Write-Host ""

# ── Launch FastAPI inference server (foreground) ──────────────────────────────
Write-Host "🚀 Starting FastAPI Inference Server..." -ForegroundColor Yellow
if (Test-Path "..\.venv\Scripts\Activate.ps1") {
    . "..\.venv\Scripts\Activate.ps1"
}
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# ── Cleanup jobs when server exits ─────────────────────────────────────────
Write-Host ""
Write-Host "🛑 Server stopped. Stopping background jobs..." -ForegroundColor Red
Stop-Job -Job $watcherJob
Remove-Job -Job $watcherJob
Stop-Job -Job $bridgeJob
Remove-Job -Job $bridgeJob

