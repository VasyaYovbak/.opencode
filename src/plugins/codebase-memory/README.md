# Codebase Memory runtime

`bin/codebase-memory-mcp-linux-amd64-portable-v0.11.0.tar.gz` is the compressed
Linux x86_64 portable asset from the upstream `v0.11.0` GitHub release:

- Release: https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.11.0
- Asset: `codebase-memory-mcp-linux-amd64-portable.tar.gz`
- Verified SHA-256 of the downloaded archive: `1f9e8293eb2bc5c05cfa27a7e8fc033da6d729ffad525ccfcdaa3fd606306683`
- SHA-256 of the extracted executable: `ce11c141431aeadd788506c3a7e6942db8fd438dec369d0707a39ec9fd8c6510`

The archive was checksum-verified and is under GitHub's 100 MiB regular-Git file
limit. On first plugin startup, only the executable is extracted into the
Git-ignored `bin/.runtime-v0.11.0/` directory after archive/member/hash checks.
The bundled `install.sh` is never run. `CBM_BINARY` can override the extracted
executable path.
