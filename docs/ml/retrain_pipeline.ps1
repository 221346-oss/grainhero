<#
.SYNOPSIS
GrainHero Automated ML Retraining Pipeline

.DESCRIPTION
This script executes the entire ML continuous learning loop:
1. Triggers live_append_pipeline.py to fetch new sensor data from Supabase and append to local datasets.
2. Loops through all supported grains and trains the Soft Voting Ensemble (XGBoost, RF, LightGBM).
3. Outputs the fresh model (.pkl) files directly into huggingface_deployment.
#>

$ErrorActionPreference = "Stop"
$PythonPath = "python" # Adjust if you use py, python3, or a venv path
$BaseDir = $PSScriptRoot
$MLDir = Join-Path $BaseDir "legacy-backend\ml"
$HFDir = Join-Path $BaseDir "huggingface_deployment"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " GrainHero ML Continuous Learning Pipeline" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# Step 1: Fetch Live Data
Write-Host "`n[1/2] Fetching Live Sensor Data from Supabase..." -ForegroundColor Yellow
$AppendScript = Join-Path $MLDir "live_append_pipeline.py"

# Try to run the append pipeline (requires SUPABASE_URL and SUPABASE_SERVICE_KEY in env)
try {
    & $PythonPath $AppendScript --limit 1000
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: live_append_pipeline.py exited with code $LASTEXITCODE. (Make sure your Supabase ENV vars are set!)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error running live_append_pipeline.py: $_" -ForegroundColor Red
}

# Step 2: Retrain Ensembles
Write-Host "`n[2/2] Retraining Ensemble Models for all grains..." -ForegroundColor Yellow
$TrainScript = Join-Path $MLDir "ensemble_train.py"
$Grains = @("rice", "wheat", "maize", "sorghum", "barley")

foreach ($grain in $Grains) {
    Write-Host "`n-> Training model for: $grain" -ForegroundColor Magenta
    & $PythonPath $TrainScript $grain
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error training $grain model!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " PIPELINE COMPLETE!" -ForegroundColor Green
Write-Host " All fresh .pkl models have been saved to:`n $HFDir" -ForegroundColor White
Write-Host " You can now drag and drop the contents of huggingface_deployment into your Hugging Face Space!" -ForegroundColor Yellow
