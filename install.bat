@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PNPM_VERSION=10.33.0"

where node >nul 2>nul
if errorlevel 1 (
  echo [.opencode] Node.js is required but was not found.
  echo [.opencode] Please install Node.js 18+ from https://nodejs.org/ and rerun this script.
  exit /b 1
)

echo [.opencode] Installing/updating OpenCode globally...
call npm install -g opencode-ai
if errorlevel 1 goto :fail

echo [.opencode] Installing root dependencies...
pushd "%SCRIPT_DIR%" >nul
call npm ci
if errorlevel 1 goto :fail
popd >nul

echo [.opencode] Installing pnpm@%PNPM_VERSION%...
call npm install -g "pnpm@%PNPM_VERSION%"
if errorlevel 1 goto :fail

echo [.opencode] Installing smart-explore MCP dependencies...
call node "%SCRIPT_DIR%mcp\smart-explore\scripts\bootstrap-mcp.cjs"
if errorlevel 1 goto :fail

echo [.opencode] Linking smart-explore-mcp command globally...
pushd "%SCRIPT_DIR%mcp\smart-explore" >nul
call npm link
if errorlevel 1 goto :fail
popd >nul

echo [.opencode] Install complete.
pause
exit /b 0

:fail
set "EXIT_CODE=%ERRORLEVEL%"
if exist "%SCRIPT_DIR%" popd >nul 2>nul
echo [.opencode] Install failed with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
