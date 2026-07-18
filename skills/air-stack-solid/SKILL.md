---
name: air-stack-solid
description: "Use this skill when building web applications, backend APIs, or reusable front-end/backend libraries using the AIR Stack (Anchor, IRPC, Router) and SolidJS. This skill is heavily modularized to prevent context pollution. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Stack Solid Decision Router

AIR Stack is a reactive and isomorphic architecture for building web applications, backend APIs, and reusable libraries. It encompasses Isomorphic RPC (IRPC), Workflows, fine-grained State Management, Routing, and UI components.

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Installation & Setup
- **When**: You need to start a full-stack project, start an SSR-only project, start a SPA, start a PWA, start a standalone API, install packages for each architecture, follow file conventions (function.ts, constructor.ts, workflow.ts, route.ts), follow folder structure (lib/views, lib/components, lib/actions, pages/), or scaffold with degit templates.
- **Action**: Read `contents/installation.md`

## Isomorphic RPC (IRPC)
- **When**: You need to build APIs, create CRUD endpoints, call server from browser or worker, stream real-time data to UI (chat, live feeds, progressive hydration), validate inputs/outputs (Zod, Valibot), inject auth or database context into handlers, cache or deduplicate calls, handle webhooks (Stripe, payment providers), compose server functions, run functions across environments (server, browser, worker), handle server-to-server with private API keys, layer CRUD with cache fallback to database, create read-only or write-only entities, monitor active calls (DevTools, logging), handle typed errors (ResolveError, TransportError, HandlerError), or transform streamed data before it reaches the UI.
- **Action**: Read `contents/irpc.md`

## Workflows (Anchor)
- **When**: You need to run a multi-step process (checkout, onboarding, AI pipeline, deployment), show step-by-step progress (step name, status, description), recover from errors or retry failed steps, branch on conditions (payment method, risk score, user role), validate between steps (Zod, Valibot), persist and resume across page reloads or crashes (localStorage, sessionStorage, database), compose pipelines from a base workflow, build wizard-style UIs with step-by-step approval, observe running workflows (dashboards, logging, telemetry), bind workflow progress to UI (current step, status, errors), provide default values before the workflow runs, or bind multiple workflow runs to one UI component.
- **Action**: Read `contents/workflows.md`

## State Management
- **When**: You need to make objects/arrays/Sets/Maps reactive, mutate nested properties directly, create computed/derived values, create read-only state with restricted writes, maintain sorted views without full re-sort, wrap async calls with reactive status/error/data tracking, run side-effects when state changes, run browser-only effects (skip during SSR), read state without subscribing, serialize state safely to JSON, watch all mutations on a state object (persistence, logging), manage cookies on server and client (auth tokens, session), prevent state leaking between SSR requests, create component-local state, create form state with Zod validation and two-way binding, or make primitive values (strings, numbers, booleans) reactive.
- **Action**: Read `contents/state-management.md`

## Page Routing (Router)
- **When**: You need to navigate between pages (SPA, SSR), protect routes (auth, roles, guards with redirect), load data before render (sequential, parallel, dependent providers), redirect after auth failure, build nested layouts (shared headers/sidebars), handle dynamic params (/:user_id) and query strings (?tab=settings), show global loading/progress bar, lazy-load pages (code splitting), render modals as overlays, show skeleton loading states, handle error boundaries (404, 403, provider failures), cancel in-flight fetches on navigation, auto-revoke access when permissions change, create index routes, host in subdirectory or separate route layouts (e.g. auth vs main app), generate URLs programmatically, navigate programmatically, or configure data cache duration and whether pages wait for data or render immediately.
- **Action**: Read `contents/router.md`

## Universal SSR
- **When**: You need to set up SSR for SolidJS, hydrate without mismatch, configure Vite SSR (with/without IRPC), build a production edge worker (Bun, Cloudflare Workers), build a full-stack worker (IRPC + SSR same thread), implement ISR (serve cached HTML, render on miss), implement stale-while-revalidate, pre-generate static pages at build time (SSG), resolve static assets before SSR, propagate cookies into Set-Cookie headers, handle SSR redirects, abort SSR with timeout, isolate request context, set up WebSocket + HTTP in same worker, or customize response headers (security headers).
- **Action**: Read `contents/universal-ssr.md`

## User Interface & Components
- **When**: You need to create components with own state/behavior/side-effects, control which parts of UI re-render when state changes, pass one-way reactive props, sync two-way mutations between parent and child, isolate fast-updating views from parent re-renders, create reusable standalone reactive views, forward native HTML props while omitting managed ones, manipulate DOM directly for animations or drag-and-drop, run code on mount, clean up on unmount, apply optimistic UI with rollback, render conditionally, render lists, apply conditional CSS classes, scale styling (inline → local → global), use dynamic inline styles (scroll, canvas, tenant colors), choose between static function vs snippet vs template vs setup component, or share state via scoped context.
- **Action**: Read `contents/user-interface.md`

## Form Architecture
- **When**: You need to build inputs with two-way binding (text, number, date), prevent cursor-jumping in number/date inputs, coordinate multiple fields for validation and submit, build context-aware inputs (auto-connect to parent form), create typed form factories (field names enforced by Zod schema), show field-level validation errors, or format input in real time (numbers, dates).
- **Action**: Read `contents/form-architecture.md`

## Headless Composition
- **When**: You need to extract logic into reusable factories, model domain logic or state machines outside UI, compose reusable DOM side-effects (keyboard shortcuts, scroll, intersection observers), share logic across frameworks (React, SolidJS), unit test logic without UI, create factories with optional or guaranteed shapes, or encapsulate side-effects in factories (logging, persistence).
- **Action**: Read `contents/headless-composition.md`

## Library Authoring
- **When**: You need to build a reusable npm library, separate client/server entry points (export maps), prevent client imports from pulling server code, design pluggable architecture (adapter/provider, chain of responsibility), configure bundling (ESM, DTS, unbundled), set up package.json exports and peerDependencies, configure tsconfig.json and vitest.config.ts, preserve JSX during compilation, or prevent bundling multiple copies of the reactivity system.
- **Action**: Read `contents/library-authoring.md`

## Persistent State
- **When**: You need state that survives page refresh but clears on tab close (sessionStorage), state that survives browser restart (localStorage), store data beyond localStorage limits (IndexedDB), build offline-capable apps with auto-persisted mutations, create reactive browser database tables with auto-generated ids and timestamps, query/filter/index records, seed data on first load, stop syncing state, wait for writes to complete, or save draft content.
- **Action**: Read `contents/persistent-state.md`

## Testing
- **When**: You need to set up vitest + jsdom, test IRPC functions (stub + constructor in same process, no network), mock dependencies (not the framework), test reactive state with synchronous assertions, test effects (fire on change, stop on cleanup), test guards (redirect, error on auth failure), test providers (mock context), test streams with fake timers, test browser-only APIs, test cookies in isolation, or test components with Solid Testing Library.
- **Action**: Read `contents/testing.md`

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

### Critical Rendering Rule: Avoid Gigantic `render()` Blocks
When building UI components, **never** blindly wrap an entire massive component or page in a single `render(() => ...)` block. Doing so defeats the purpose of fine-grained reactivity, forcing the entire UI tree to re-evaluate when any nested signal changes.

Before writing a component, analyze its reactivity:
1. **Is the majority of the UI static?**
   If most of the component is static and only small parts change frequently, **return static JSX directly**. Do not wrap the whole component in `render()`. Instead, isolate only the reactive parts into a `SnippetNode` (if it needs parent scope access) or a `Template` (if it is purely props-driven).
2. **Is the entire tree heavily reactive?**
   - **If the tree is large (multiple domains):** Break it down! Isolate each domain into smaller, independent `Snippets` or `Templates` so they update independently.
   - **If the tree is very small (e.g., a simple toggle or button):** Only then is it acceptable to wrap it in a single `render()` block.

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
