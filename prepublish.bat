@echo off

if "%1"=="--revert" (
  set VERSION=workspace:*
  goto skip_build
)

if "%1"=="--skip-build" goto skip_build

bun run prepublish
if %errorlevel% neq 0 exit /b %errorlevel%

:skip_build
if not "%VERSION%"=="workspace:*" (
  set /p VERSION="Enter version (e.g., 1.0.1): "
)

if "%VERSION%"=="" (
  echo Error: Version cannot be empty.
  exit /b 1
)

echo Updating packages to version %VERSION%...

bpkg info set dependencies.@anchorlib/core="%VERSION%" -f ^
  packages/storage ^
  packages/react ^
  packages/router ^
  packages/solid ^
  packages/svelte ^
  packages/vue ^
  irpclib/irpc ^
  irpclib/http ^
  packages/ssr ^
  packages/vite-ssr

bpkg info set dependencies.@anchorlib/router="%VERSION%" -f ^
  packages/react ^
  packages/solid ^
  packages/ssr

bpkg info set dependencies.@anchorlib/storage="%VERSION%" -f ^
  packages/react ^
  packages/solid ^
  packages/svelte ^
  packages/vue

bpkg info set dependencies.@anchorlib/ssr="%VERSION%" -f ^
  packages/react ^
  packages/solid

bpkg info set dependencies.@irpclib/http="%VERSION%" -f ^
  packages/vite-ssr

bpkg info set dependencies.@irpclib/irpc="%VERSION%" -f ^
  irpclib/http ^
  irpclib/ws ^
  irpclib/broadcast ^
  packages/vite-ssr

bpkg info set dependencies.@irpclib/ws="%VERSION%" -f ^
  packages/vite-ssr

bpkg info set optionalDependencies.@irpclib/http="%VERSION%" -f ^
  packages/ssr

bpkg info set optionalDependencies.@irpclib/irpc="%VERSION%" -f ^
  packages/ssr

bpkg info set optionalDependencies.@irpclib/ws="%VERSION%" -f ^
  packages/ssr
