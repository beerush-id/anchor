@echo off
bun run prepublish
if %errorlevel% neq 0 exit /b %errorlevel%

set /p VERSION="Enter version (e.g., 1.0.1): "

if "%VERSION%"=="" (
  echo Error: Version cannot be empty.
  exit /b 1
)

echo Updating packages to version %VERSION%...

bpkg info set peerDependencies.@anchorlib/core="%VERSION%" -f ^
  packages/storage ^
  packages/react ^
  packages/router ^
  packages/solid ^
  packages/svelte ^
  packages/vue ^
  irpclib/irpc ^
  irpclib/http ^
  packages/vite-ssr

bpkg info set peerDependencies.@anchorlib/router="%VERSION%" -f ^
  packages/react ^
  packages/solid

bpkg info set peerDependencies.@anchorlib/storage="%VERSION%" -f ^
  packages/react ^
  packages/solid ^
  packages/svelte ^
  packages/vue

bpkg info set peerDependencies.@irpclib/http="%VERSION%" -f ^
  packages/vite-ssr

bpkg info set peerDependencies.@irpclib/irpc="%VERSION%" -f ^
  irpclib/http ^
  irpclib/ws ^
  irpclib/broadcast ^
  packages/vite-ssr

bpkg info set peerDependencies.@irpclib/ws="%VERSION%" -f ^
  packages/vite-ssr

bpkg info set optionalDependencies.@irpclib/http="%VERSION%" -f ^
  packages/react ^
  packages/solid
