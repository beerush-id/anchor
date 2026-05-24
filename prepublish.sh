#!/bin/bash
bun run prepublish

read -p "Enter version: " VERSION

bpkg info set dependencies.@anchorlib/core="^$VERSION" -f packages/storage packages/react packages/router packages/solid packages/svelte packages/vue irpclib/irpc
bpkg info set dependencies.@anchorlib/router="^$VERSION" -f packages/react packages/solid
bpkg info set dependencies.@anchorlib/storage="^$VERSION" -f packages/react packages/solid packages/svelte packages/vue

bpkg info set peerDependencies.@anchorlib/core="^$VERSION" -f irpclib/http packages/vite-ssr
bpkg info set peerDependencies.@irpclib/http="^$VERSION" -f packages/vite-ssr
bpkg info set peerDependencies.@irpclib/irpc="^$VERSION" -f irpclib/http irpclib/ws irpclib/broadcast packages/vite-ssr
bpkg info set peerDependencies.@irpclib/ws="^$VERSION" -f packages/vite-ssr

bpkg info set optionalDependencies.@irpclib/http="^$VERSION" -f packages/react packages/solid
