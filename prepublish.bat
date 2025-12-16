bun run prepublish

set /p VERSION="Enter version: "

bpkg info set dependencies.@anchorlib/core="^%VERSION%" -f packages/storage packages/react packages/react-classic packages/solid packages/svelte packages/vue
bpkg info set dependencies.@anchorlib/storage="^%VERSION%" -f packages/react packages/react-classic packages/solid packages/svelte packages/vue
bpkg info set peerDependencies.@irpclib/irpc="^%VERSION%" -f irpclib/http
