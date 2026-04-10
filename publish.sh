#!/bin/bash
bpkg publish -f packages/core
bpkg publish -f packages/storage
bpkg publish -f packages/router
bpkg publish -f packages/react
bpkg publish -f packages/react-classic
bpkg publish -f packages/solid
bpkg publish -f packages/svelte
bpkg publish -f packages/vue

bpkg publish -f irpclib/irpc
bpkg publish -f irpclib/http
bpkg publish -f irpclib/ws
bpkg publish -f irpclib/broadcast
