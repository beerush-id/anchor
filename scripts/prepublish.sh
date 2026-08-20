#!/bin/bash
set -e

if [ "$1" == "--revert" ]; then
  VERSION="workspace:*"
else
  if [ "$1" != "--skip-build" ]; then
    bun run prepublish
  fi

  read -p "Enter version (e.g., 1.0.1): " VERSION
fi

if [ -z "$VERSION" ]; then
  echo "Error: Version cannot be empty."
  exit 1
fi

echo "Updating packages to version $VERSION..."

bpkg info set dependencies.@airlib/core="$VERSION" -f \
  packages/storage \
  packages/react \
  packages/router \
  packages/solid \
  packages/svelte \
  packages/vue \
  irpclib/irpc \
  irpclib/http \
  packages/ssr \
  packages/vite

bpkg info set dependencies.@airlib/router="$VERSION" -f \
  packages/react \
  packages/solid \
  packages/ssr

bpkg info set dependencies.@airlib/storage="$VERSION" -f \
  packages/react \
  packages/solid \
  packages/svelte \
  packages/vue

bpkg info set dependencies.@airlib/ssr="$VERSION" -f \
  packages/react \
  packages/solid

bpkg info set dependencies.@irpclib/http="$VERSION" -f \
  packages/vite

bpkg info set dependencies.@irpclib/irpc="$VERSION" -f \
  irpclib/http \
  irpclib/ws \
  irpclib/broadcast \
  packages/vite

bpkg info set dependencies.@irpclib/ws="$VERSION" -f \
  packages/vite

bpkg info set optionalDependencies.@irpclib/http="$VERSION" -f \
  packages/ssr

bpkg info set optionalDependencies.@irpclib/irpc="$VERSION" -f \
  packages/ssr

bpkg info set optionalDependencies.@irpclib/ws="$VERSION" -f \
  packages/ssr
