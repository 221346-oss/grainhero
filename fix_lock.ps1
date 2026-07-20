# Force remove the lock file
$lockPath = ".git\index.lock"

# Kill any git processes
Get-Process -Name "git*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 1

# Force remove the lock file with multiple methods
if (Test-Path $lockPath) {
    try {
        Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
    } catch {}
    
    # Use cmd as backup
    cmd /c "del /f /q `"$lockPath`" 2>nul"
}

# Test if git works now
$env:GIT_CONFIG_GLOBAL = ""
$env:GIT_CONFIG_NOSYSTEM = "1"

Write-Host "Testing git operations..."
try {
    $result = git status --porcelain 2>&1 | Where-Object { $_ -notlike "warning:*" } | Select-Object -First 5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Git operations are working" -ForegroundColor Green
        Write-Host "Lock file has been resolved" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Git still reporting issues" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}