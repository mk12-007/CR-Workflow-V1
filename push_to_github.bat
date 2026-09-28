@echo off
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;%PATH%"
echo ========================================================
echo Pushing CR-Workflow-V1 to GitHub (mk12-007/CR-Workflow-V1)
echo ========================================================
git push -u origin main
echo.
pause
