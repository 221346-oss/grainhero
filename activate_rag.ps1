`# GrainHero RAG — Virtual Environment Activator
# ================================================
# Run this script before working on the RAG pipeline:
#   .\activate_rag.ps1
#
# After running, your terminal will show (.venv) prefix
# and 'python' / 'pip' will correctly point to Python 3.11

$VenvPath = Join-Path $PSScriptRoot "ml-deploy\rag\.venv\Scripts\Activate.ps1"

if (Test-Path $VenvPath) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  GrainHero RAG Environment" -ForegroundColor Cyan
    Write-Host "  Activating Python 3.11 venv..." -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    & $VenvPath
    Write-Host "✅ RAG venv activated! Python version:" -ForegroundColor Green
    python --version
    Write-Host ""
    Write-Host "To run ingestion:" -ForegroundColor Yellow
    Write-Host "  python ml-deploy\rag\rag_ingest.py --file <doc.pdf> --category manual --tenant-id <UUID>" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Virtual environment not found at: $VenvPath" -ForegroundColor Red
    Write-Host "   Run setup first:" -ForegroundColor Yellow
    Write-Host "   C:\Users\lenovo\AppData\Local\Programs\Python\Python311\python.exe -m venv ml-deploy\rag\.venv" -ForegroundColor White
}
