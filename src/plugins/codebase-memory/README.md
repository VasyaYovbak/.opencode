# Codebase Memory runtime

`bin/codebase-memory-mcp-linux-amd64-portable-v0.12.1.tar.gz` is the compressed
Linux x86_64 portable asset from the upstream `v0.12.1` GitHub release:

- Release: https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.12.1
- Asset: `codebase-memory-mcp-linux-amd64-portable.tar.gz`
- Verified SHA-256 of the downloaded archive: `8c3d0341064301e78ecc84cf7348d4e2c6562a0f57448243ea560aaa34de36c1`
- SHA-256 of the extracted executable: `77745491f0a9c346d6da23eed4d92b5feaa31a27a883c9faa4fa9f47c8183705`

The archive was checksum-verified and is under GitHub's 100 MiB regular-Git file
limit. On first plugin startup, only the executable is extracted into the
Git-ignored `bin/.runtime-v0.12.1-<platform>-<arch>/` directory after archive/member/hash checks.
The bundled `install.sh` is never run. `CBM_BINARY` can override the extracted
executable path.

Windows x64 and arm64 archives are bundled from the same release. Their archive
SHA-256 values are respectively `4e4e0f16b45233af5c757a1fcbe3c3b16e9056375b1fbe2ce020b6de75dedcc0`
and `934ab6bd67a76c6ebd9e110d87b7090ffd629919bedaeddabe5a19175038b063`.
The Windows executables are extracted with the system `tar.exe`; `install.ps1`
is never run. Windows uses the native CLI instead of the Unix-socket bridge.
