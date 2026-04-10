#!/bin/bash
bun run prepublish

read -p "Enter version: " VERSION

bpkg info set dependencies.@anchorlib/core="^$VERSION" -f packages/storage packages/react packages/router packages/react-classic packages/solid packages/svelte packages/vue
bpkg info set dependencies.@anchorlib/router="^$VERSION" -f packages/react
bpkg info set dependencies.@anchorlib/storage="^$VERSION" -f packages/react packages/react-classic packages/solid packages/svelte packages/vue
bpkg info set peerDependencies.@irpclib/irpc="^$VERSION" -f irpclib/http irpclib/ws irpclib/broadcast
