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

set "CURRENT_PNPM_VERSION="
where pnpm >nul 2>nul
if not errorlevel 1 (
  for /f "usebackq delims=" %%v in (`pnpm --version 2^>nul`) do set "CURRENT_PNPM_VERSION=%%v"
)

if "%CURRENT_PNPM_VERSION%"=="%PNPM_VERSION%" (
  echo [.opencode] pnpm@%PNPM_VERSION% already available; skipping global install.
) else (
  if defined CURRENT_PNPM_VERSION (
    echo [.opencode] Found pnpm@%CURRENT_PNPM_VERSION%; activating pnpm@%PNPM_VERSION%...
  ) else (
    echo [.opencode] Installing pnpm@%PNPM_VERSION%...
  )

  where corepack >nul 2>nul
  if errorlevel 1 (
    call npm install -g "pnpm@%PNPM_VERSION%"
  ) else (
    call corepack enable
    if errorlevel 1 goto :fail
    call corepack prepare "pnpm@%PNPM_VERSION%" --activate
  )
  if errorlevel 1 goto :fail
)

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
