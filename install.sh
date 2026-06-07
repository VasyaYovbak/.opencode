#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PNPM_VERSION=10.33.0

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    CURRENT_PNPM_VERSION=$(pnpm --version 2>/dev/null || printf '')
    if [ "$CURRENT_PNPM_VERSION" = "$PNPM_VERSION" ]; then
      printf '%s\n' "[.opencode] pnpm@$PNPM_VERSION already available; skipping global install."
      return
    fi

    if [ -n "$CURRENT_PNPM_VERSION" ]; then
      printf '%s\n' "[.opencode] Found pnpm@$CURRENT_PNPM_VERSION; activating pnpm@$PNPM_VERSION..."
    else
      printf '%s\n' "[.opencode] Found pnpm, but could not read its version; activating pnpm@$PNPM_VERSION..."
    fi
  else
    printf '%s\n' "[.opencode] Installing pnpm@$PNPM_VERSION..."
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare "pnpm@$PNPM_VERSION" --activate
  else
    npm install -g "pnpm@$PNPM_VERSION"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '[.opencode] Node.js is required but was not found.' >&2
  printf '%s\n' '[.opencode] Please install Node.js 18+ from https://nodejs.org/ and rerun this script.' >&2
  exit 1
fi

printf '%s\n' '[.opencode] Installing/updating OpenCode globally...'
npm install -g opencode-ai

printf '%s\n' '[.opencode] Installing root dependencies...'
(cd "$SCRIPT_DIR" && npm ci)

ensure_pnpm

printf '%s\n' '[.opencode] Installing smart-explore MCP dependencies...'
node "$SCRIPT_DIR/mcp/smart-explore/scripts/bootstrap-mcp.cjs"

printf '%s\n' '[.opencode] Linking smart-explore-mcp command globally...'
(cd "$SCRIPT_DIR/mcp/smart-explore" && npm link)

printf '%s\n' '[.opencode] Install complete.'
