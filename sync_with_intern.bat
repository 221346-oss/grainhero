@echo off
echo =======================================================
echo GrainHero: Syncing latest code changes from your intern
echo =======================================================
echo.
echo Stashing any uncommitted local changes...
git stash

echo.
echo Pulling latest code from Ai/Ml-Branch...
git pull origin Ai/Ml-Branch --rebase

echo.
echo Restoring your local changes...
git stash pop

echo.
echo =======================================================
echo SYNC COMPLETE! You now have the latest code.
echo =======================================================
pause
