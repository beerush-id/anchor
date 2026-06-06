#!/bin/bash
set -e

bun run prepublish

read -p "Enter version (e.g., 1.0.1): " VERSION

if [ -z "$VERSION" ]; then
  echo "Error: Version cannot be empty."
  exit 1
fi

echo "Updating packages to version $VERSION..."

bpkg info set peerDependencies.@anchorlib/core="$VERSION" -f \
  packages/storage \
  packages/react \
  packages/router \
  packages/solid \
  packages/svelte \
  packages/vue \
  irpclib/irpc \
  irpclib/http \
  packages/vite-ssr

bpkg info set peerDependencies.@anchorlib/router="$VERSION" -f \
  packages/react \
  packages/solid

bpkg info set peerDependencies.@anchorlib/storage="$VERSION" -f \
  packages/react \
  packages/solid \
  packages/svelte \
  packages/vue

bpkg info set peerDependencies.@irpclib/http="$VERSION" -f \
  packages/vite-ssr

bpkg info set peerDependencies.@irpclib/irpc="$VERSION" -f \
  irpclib/http \
  irpclib/ws \
  irpclib/broadcast \
  packages/vite-ssr

bpkg info set peerDependencies.@irpclib/ws="$VERSION" -f \
  packages/vite-ssr

bpkg info set optionalDependencies.@irpclib/http="$VERSION" -f \
  packages/react \
  packages/solid
