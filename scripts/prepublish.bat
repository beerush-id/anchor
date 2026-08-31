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

bpkg info set dependencies.@airlib/core="%VERSION%" -f ^
  packages/storage ^
  packages/react ^
  packages/router ^
  packages/solid ^
  packages/svelte ^
  packages/vue ^
  irpclib/irpc ^
  irpclib/http ^
  irpclib/ws ^
  irpclib/broadcast ^
  packages/ssr ^
  packages/vite

bpkg info set dependencies.@airlib/router="%VERSION%" -f ^
  packages/react ^
  packages/solid ^
  packages/ssr
  packages/vite-ssr

bpkg info set dependencies.@airlib/storage="%VERSION%" -f ^
  packages/react ^
  packages/solid ^
  packages/svelte ^
  packages/vue

bpkg info set dependencies.@airlib/ssr="%VERSION%" -f ^
  packages/react ^
  packages/solid

bpkg info set dependencies.@irpclib/http="%VERSION%" -f ^
  packages/vite

bpkg info set dependencies.@irpclib/irpc="%VERSION%" -f ^
  irpclib/http ^
  irpclib/ws ^
  irpclib/broadcast ^
  packages/vite

bpkg info set dependencies.@irpclib/ws="%VERSION%" -f ^
  packages/vite

bpkg info set optionalDependencies.@irpclib/http="%VERSION%" -f ^
  packages/ssr

bpkg info set optionalDependencies.@irpclib/irpc="%VERSION%" -f ^
  packages/ssr

bpkg info set optionalDependencies.@irpclib/ws="%VERSION%" -f ^
  packages/ssr

bpkg info set peerDependencies.@airlib/core="%VERSION%" -f ^
  ui-kits/form

bpkg info set dependencies.@airlib/form="%VERSION%" -f ^
  ui-kits/react-form ^
  ui-kits/solid-form

bpkg info set peerDependencies.@airlib/react="%VERSION%" -f ^
  ui-kits/react-form

bpkg info set peerDependencies.@airlib/solid="%VERSION%" -f ^
  ui-kits/solid-form
