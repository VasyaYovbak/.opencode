@echo off
if not defined CBM_BINARY (
  echo CBM_BINARY must be set by the OpenCode plugin 1>&2
  exit /b 1
)
"%CBM_BINARY%" cli %*
exit /b %errorlevel%
