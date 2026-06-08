---
title: AIR Stack v1.2 — SSR Refactor & Form Auto-Detection
description: Improved Vite SSR modularization, React context loss resolution, and AIR Form auto-detection for standalone inputs.
date: 2026-06-07
sidebar: false
prev: false
next: false
---

[← Back to News](/news/)

# AIR Stack v1.2 — SSR Refactor & Form Auto-Detection

**v1.2.0** — [GitHub](https://github.com/beerush-id/airstack) | MIT Licensed

This release brings significant improvements to the `airSSR` Vite plugin, resolves a critical React context loss issue during snippet re-rendering, enforces stricter peer dependency resolution, and introduces auto-detection for standalone inputs in AIR Form.

## Peer Dependencies Enforcement

To prevent issues with multi-instance core packages (where multiple versions of `@anchorlib/core` or other core packages are bundled simultaneously), all AIR Stack packages have moved their core dependencies to `peerDependencies`. Additionally, the versions are now fixed (e.g., `1.2.0` instead of `^1.2.0`) to guarantee stability and prevent mismatches across the ecosystem.

## Vite SSR Modularization

The `airSSR` Vite plugin has been deeply refactored to improve maintainability and guarantee proper module resolution during server-side rendering.

- **Automated Externalization**: Added a `config` hook to automatically inject `^@irpclib/` and `^@anchorlib/` into Vite's `ssr.noExternal` configuration.
- **Standalone Handlers**: The monolithic request middleware has been broken down into dedicated `resolveHttpCalls` and `resolveSSR` functions.
- **Cached Initialization**: Introduced a cached `bootstrap` function to initialize and preserve IRPC routers, the renderer factory, and the template path across requests, preventing redundant module loads.
- **HMR Support**: Added a `bootstrapHandlers` helper to streamline IRPC handler loading for initial requests and Hot Module Replacement (HMR) updates.
- **Type Safety**: Improved explicit type imports for HTTP requests, IRPC packages, and WebSocket transports.

## React Context Preservation

Resolved a bug in the React adapter where scope context was lost when `Snippet` components re-rendered:

- Introduced internal `Start` and `Finish` components to manage context setup and restoration.
- Modified `SnippetBody` to capture and restore context tightly around render operations.
- Added `getContextStore` to accurately track the current context state, ensuring fine-grained reactivity survives React's re-rendering cycles.

## AIR Form v1.1.1 Updates

The form engine received quality-of-life updates and a significant documentation cleanup:

- **Auto-Detection**: Input components used directly inside a `<Form>` (without a `<Field>` wrapper) now automatically detect the form and create their own field context dynamically. This is highly useful for standalone inputs that don't need labels or error wrappers (like hidden inputs or inline filters).
- **Global Configuration**: Fully documented the `configureForm()` API, which allows setting global defaults, classes, and behavior overrides (like `errorClass` and `pendingClass`) across the entire application.
- **Documentation Sync**: Removed non-existent ghost components from the documentation, updated the Core API docs with missing properties (`form.changes`, `name.required`, `name.matched` removal), and clarified the input context behaviors.

## Get Started

::: code-group

```sh [React]
bun add @anchorlib/core@1.2.0 @anchorlib/react@1.2.0
bun add @airlib/form @airlib/react-form
```

```sh [SolidJS]
bun add @anchorlib/core@1.2.0 @anchorlib/solid@1.2.0
bun add @airlib/form @airlib/solid-form
```

:::

[GitHub](https://github.com/beerush-id/airstack) · [Documentation](https://airlib.dev) · [AIR Form](https://airlib.dev/airlib/form/)
