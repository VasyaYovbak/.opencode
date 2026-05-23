# .opencode Setup

Run the `.opencode` install script before starting OpenCode in this repository.

## Install

macOS / Linux:

```bash
sh ./.opencode/install.sh
```

Windows:

```bat
.\.opencode\install.bat
```

The install script sets up:

- `.opencode/node_modules`
- `.opencode/mcp/smart-explore/node_modules`

## Notes

- `smart-explore` uses a committed `scripts/mcp-server.cjs` bundle, so the install step only installs dependencies.
- If you change files under `.opencode/mcp/smart-explore/src/`, rebuild the bundle manually:

```bash
cd .opencode/mcp/smart-explore
npm run build
```
