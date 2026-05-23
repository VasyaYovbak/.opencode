#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PNPM_VERSION=10.33.0

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '[.opencode] Node.js is required but was not found.' >&2
  printf '%s\n' '[.opencode] Please install Node.js 18+ from https://nodejs.org/ and rerun this script.' >&2
  exit 1
fi

printf '%s\n' '[.opencode] Installing/updating OpenCode globally...'
npm install -g opencode-ai

printf '%s\n' '[.opencode] Installing root dependencies...'
(cd "$SCRIPT_DIR" && npm ci)

printf '%s\n' "[.opencode] Installing pnpm@$PNPM_VERSION..."
npm install -g "pnpm@$PNPM_VERSION"

printf '%s\n' '[.opencode] Installing smart-explore MCP dependencies...'
node "$SCRIPT_DIR/mcp/smart-explore/scripts/bootstrap-mcp.cjs"

printf '%s\n' '[.opencode] Linking smart-explore-mcp command globally...'
(cd "$SCRIPT_DIR/mcp/smart-explore" && npm link)

printf '%s\n' '[.opencode] Install complete.'
