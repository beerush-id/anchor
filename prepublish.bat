bun run prepublish

set /p VERSION="Enter version: "

bpkg info set dependencies.@anchorlib/core="^%VERSION%" -f packages/storage packages/react packages/router packages/solid packages/svelte packages/vue irpclib/irpc
bpkg info set dependencies.@anchorlib/router="^%VERSION%" -f packages/react packages/solid
bpkg info set dependencies.@anchorlib/storage="^%VERSION%" -f packages/react packages/solid packages/svelte packages/vue
bpkg info set peerDependencies.@anchorlib/core="^%VERSION%" -f irpclib/http
bpkg info set peerDependencies.@irpclib/irpc="^%VERSION%" -f irpclib/http irpclib/ws irpclib/broadcast
