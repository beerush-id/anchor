---
name: air-stack-react
description: "Use this skill when building web applications, backend APIs, or reusable front-end/backend libraries using the AIR Stack (Anchor, IRPC, Router) and React. This skill is heavily modularized to prevent context pollution. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Stack React Decision Router

AIR Stack is a reactive and isomorphic architecture for building web applications, backend APIs, and reusable libraries. It encompasses Isomorphic RPC (IRPC), Workflows, fine-grained State Management, Routing, and UI components.

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Installation & Setup
- **When problems**: Starting a new project. Not sure which architecture to use (full-stack, SSR-only, SPA, API-only). Need to know file organization and naming conventions.
- **When tools**: Using `degit` templates, `@airlib/react` packages, folder structure (`function.ts`, `constructor.ts`, `route.ts`).
- **Action**: Read `contents/installation.md`

## Isomorphic RPC (IRPC)

> **Core IRPC documentation is in the `air-irpc` skill.** If you haven't installed it: `npx skills add beerush-id/anchor --skill air-irpc --yes`. This file covers only React-specific binding patterns.

- **When problems**: Building APIs with type-safe client calls. Streaming real-time data (chat, live feeds, progressive hydration). Caching server responses. Handling file uploads/downloads. Accepting webhooks (Stripe, payment providers). Validating inputs/outputs with Zod/Valibot.
- **When tools**: Using `irpc.declare()`, `irpc.construct()`, `stream()`, `IRPCFile`, `IRPCBlob`. Configuring `HTTPTransport`, `WebSocketTransport`, `BroadcastTransport`. Using `credential()` for auth, `GuardError` for access control.
- **Action**: Read `skills/air-irpc/contents/...` (per sub-module below). For React-specific UI bindings (`render()` wrapper, `effect.client()` for streams), read `contents/irpc.md`.

### IRPC Sub-Modules (in `air-irpc` skill)
- Setup & Routing → `skills/air-irpc/contents/setup-and-routing.md`
- Declarations & Handlers → `skills/air-irpc/contents/declarations-and-handlers.md`
- Execution & Streaming → `skills/air-irpc/contents/execution-and-streaming.md`
- CRUD & Adapters → `skills/air-irpc/contents/crud-and-adapters.md`
- Library Authoring → `skills/air-irpc/contents/library-authoring.md`
- Testing → `skills/air-irpc/contents/testing.md`

## Workflows (Anchor)
- **When problems**: Multi-step processes (checkout, onboarding, deployment). Error recovery with retry. Branching on conditions (payment method, risk score). Persisting and resuming across page reloads. Showing step-by-step progress to the user.
- **When tools**: Using `plan()`, `.then()`, `.switch()`, `.catch()`, `.finally()`. Workflow snapshots via `snapshot()`/`hydrate()`. Observing via `WORKFLOW_STORE`.
- **Action**: Read `contents/workflows.md`

## State Management
- **When problems**: Data that needs to stay in sync across the app. Async operations with loading/error states. Side effects that run when data changes. Preventing SSR state leaks between users. Serializing state to JSON. Shared state with restricted write access.
- **When tools**: Using `mutable()`, `immutable()`, `writable()`, `derived()`, `ordered()`, `query()`, `effect()`, `context()`, `undoable()`, `untrack()`, `snapshot()`.
- **Action**: Read `contents/state-management.md`

## Page Routing (Router)
- **When problems**: Navigating between pages in SPA or SSR. Protecting routes from unauthorized access. Loading data before the page renders (sequential or parallel). Showing loading progress during navigation. Deep-linking with query params. Subdirectory hosting.
- **When tools**: Using `createRouter()`, `rootRoute.route()`, `page()`, `.guard()`, `.provide()`, `.render()`, `<Link>`, `sitemap`, lazy-loading via separate chunks.
- **Action**: Read `contents/router.md`

## Universal SSR
- **When problems**: Setting up server-side rendering. Hydration mismatches between server and client. Deploying to Cloudflare Workers, Bun, Node.js, or Deno. Implementing ISR or stale-while-revalidate. Generating static pages at build time. Propagating cookies into response headers.
- **When tools**: Using `createWorker()`, `createFullWorker()`, `vite-ssr` plugin. Configuring `@airlib/vite`, `wrangler.toml`. Server entry points per runtime (`server/bun.js`, `server/node.js`).
- **Action**: Read `contents/universal-ssr.md`

## User Interface & Components
- **When problems**: Components with own state and behavior. Fast-updating views causing parent re-renders. Conditional rendering and list rendering. Forwarding native HTML props safely. Optimistic UI with rollback. Choosing between static function vs snippet vs template vs setup component.
- **When tools**: Using `setup()`, `render()`, `snippet()`, `template()`, `<Show>`, `<Snippet>`, `<For>`, `classx()`, `stylex()`, `nodeRef()`, `$use()`, `$bind()`, `$omit()`, `$pick()`, `undoable()`.
- **Action**: Read `contents/user-interface.md`

## Image Architecture
- **When problems**: Large images loading slowly on mobile connections. Hero banners looking blurry on retina displays. Manually generating multiple image sizes and formats.
- **When tools**: Using `airImage` Vite plugin, `<Image>` component, `AirImage` Proxy object. Configuring WebP/AVIF compression. Uploading via IRPC backend.
- **Action**: Read `contents/image-architecture.md`

## Form Architecture
- **When problems**: Input fields with two-way binding. Cursor jumping in number/date inputs. Form validation with Zod. Context-aware inputs that auto-connect to parent form. Real-time input formatting.
- **When tools**: Using `$bind()`, `Bindable<T>`, form context, typed form factories. `@airlib/react` field components (`InputField`, `CheckboxField`, etc.).
- **Action**: Read `contents/form-architecture.md`

## Headless Composition
- **When problems**: Same logic duplicated across server and client. Reusable state machines or domain logic outside UI. DOM side-effects that need automatic cleanup. Logic shared between React and Solid.
- **When tools**: Using factories from `@airlib/core`. Headless state/logic/action patterns. Creating composable DOM utilities (keyboard shortcuts, scroll observers).
- **Action**: Read `contents/headless-composition.md`

## Library Authoring
- **When problems**: Publishing a reusable npm library. Preventing server code (database, API keys) from leaking into client bundles. Configuring export maps for ESM and DTS. Designing pluggable adapter/provider architectures.
- **When tools**: Configuring `package.json` exports, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`. Using `export * from './implementation.js'` patterns. Preserving JSX during compilation.
- **Action**: Read `contents/library-authoring.md`

## Persistent State
- **When problems**: Data that survives page refresh (localStorage). Data that clears on tab close (sessionStorage). Large data beyond localStorage limits (IndexedDB). Offline-capable apps with auto-persisted mutations. Saving draft content.
- **When tools**: Using `session()`, `persistent()`, `kv()`, `createTable()`. Reactive browser database tables with auto-generated ids and timestamps.
- **Action**: Read `contents/persistent-state.md`

## Browser Utilities
- **When problems**: Keyboard shortcuts (ctrl+c to copy selected user). Copy-paste from system clipboard. Drag files from desktop into the app. Show/hide UI based on scroll position. Respond to dark mode or reduced motion. Geolocation-based features. Detect URL hash changes.
- **When tools**: Importing from `@airlib/react/browser`. Using `LIVE_KEYBOARD`, `LIVE_CLIPBOARD`, `LIVE_DND`, `LIVE_CURSOR`, `LIVE_SCROLL`, `LIVE_SELECTION`, `LIVE_MEDIA`, `LIVE_WINDOW`, `LIVE_NETWORK`, `LIVE_GEO`, `LIVE_LOCATION`, `cursorRef()`, `scrollRef()`, `keyboardRef()`, `reframe()`, `acceptInteractions()`.
- **Action**: Read `contents/browser-utilities.md`

## Testing
- **When problems**: Verifying code works before shipping. Testing reactive state changes synchronously. Testing IRPC functions without network (stub + constructor in same process). Testing guards and providers with mock context. Testing streams with fake timers.
- **When tools**: Using `vitest` + `jsdom`. `withContext()` for context isolation. React Testing Library for component testing. Fake timers for stream testing.
- **Action**: Read `contents/testing.md`

## Troubleshooting
- **When problems**: A component's styles don't update when reactive state changes (forgot `.use()`). Event handlers recreated on every render (inline functions in `render()`). `window is not defined` errors during SSR (module-level `effect()`). Large forms feel laggy (single `render()` wrapping everything). Browser utilities don't respond (`acceptInteractions()` not called). `effect()` runs during SSR causing hydration mismatches. Reactive state reads don't trigger UI updates (read outside `render()`). `<Snippet>` crashes on null data (should use `<Show>` instead).
- **When tools**: `classx.use()`, `stylex.use()`, `effect.client()`, `acceptInteractions()`, `render()`, `<Show>`, `<Snippet>`.
- **Action**: Read `contents/troubleshooting.md`

## Decision Tree Sample
```
"Add address and email to user profile"

Where does the data live?
├── Internal service → read irpc.md
├── External service
│   ├── Needs secure API key? → Wrap with IRPC, read irpc.md
│   └── Public API? → Use fetch, read state-management.md
└── Browser storage → read persistent-state.md

How is the data entered?
├── Form with validation → read form-architecture.md
└── Direct mutation → read state-management.md

How is the data displayed?
├── New page → read router.md + user-interface.md
└── Existing page → read user-interface.md
```

```
"Build a tooltip component"

Should placement logic be reusable across components?
├── Yes → read user-interface.md and headless-composition.md
└── No → read user-interface.md
```

```
"Build an Input component"

Will there any component with similiar behavior in the future?
├── Yes → read user-interface.md and headless-composition.md
└── No → read user-interface.md

```

### Rendering Strategy: `render()` vs `snippet()` vs `<Show>` vs `<Snippet>`

Choose the right reactive boundary based on **how much of the UI is reactive** × **how large/frequently it updates**:

| Pattern | When to use | Why |
|---|---|---|
| **`render()`** | Output is small AND mostly reactive (toggle, badge, counter) | One boundary covers the whole output — overhead is negligible for small UI |
| **`snippet()`** | Named semantic boundary that inherits parent closure | Extract a distinct reactive concept without creating a separate component |
| **`<Show>`** | Need conditional gate + safe destructuring | `when` prop guarantees data exists before children render — destructuring is safe |
| **`<Snippet>`** | Need rendering isolation only, no conditional gate | Pass data through `data` prop — user handles nullish values |
| **No wrapper** | Output is large and mostly static | Return JSX directly from `setup()`. Each child component handles its own reactive tracking |

**Anti-pattern:** Wrapping an entire massive form or page in a single `render()`. This forces the whole tree to re-evaluate. Break it into components or `<Snippet>` boundaries per domain.

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
