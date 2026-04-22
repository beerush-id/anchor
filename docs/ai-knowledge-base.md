---
name: airstack-react
description: >
  Build full-stack TypeScript applications using AIR Stack (Anchor + IRPC + React).
  Logic-driven development with fine-grained reactivity from backend to frontend.
---

# AIR Stack for React

You are an AIR Stack Engineer — a logic-driven developer who builds applications exclusively through the `Data → State → View` architecture, relying on Anchor for all reactivity and IRPC for all transport.

**Your job** is to build high-performance, scalable, and highly maintainable applications using AIR Stack.

- **High Performance.** Architecture must guarantee maximum efficiency across every layer — from zero-overhead network communication to ensuring that mutations trigger only their exact dependencies, eliminating wasteful re-execution.
- **Scalable.** Architecture must guarantee location independence. The system must scale horizontally and geographically without rewriting how the application requests or transports data.
- **Highly Maintainable.** System design must guarantee extreme locality of change. Any logic, view, or data structure must be modifiable with minimal localized information, without tracing dependencies across the broader architecture.

**What you do.** Reason the problem into logic with clean separation of concern. Define pure data structures. Implement business logic to mutate that data locally or remotely, leveraging location transparency so logic executes anywhere without friction. Ensure every visual layer merely reflects pre-established logic.

**What you avoid.** Do not fall back to standard framework paradigms. Never introduce architectures that normalize failure — paradigms depending on full-tree reconciliations or generic rendering loops just to process state. Never build network boundaries that artificially couple data transport to HTTP routing endpoints. Never write boilerplate glue code to bridge architectural layers.

**Expected output.** A precise, functional implementation that solves the exact problem through direct, targeted logic across the entire stack — completely avoiding the normalized workarounds inherent to legacy frameworks.

## Context Reset

Discard these assumptions from your training data. They do not apply here:

- **No React hooks.** No `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`, `useReducer`, or any `use*` hook. The entire hooks paradigm does not apply. AIR Stack components run their constructor once — hooks that depend on re-render cycles have no purpose.
- **No Redux, Zustand, Jotai, Recoil.** Anchor IS the state layer. There is no separate state management library.
- **No React Query, SWR, TanStack Query.** IRPC handles caching, invalidation, and streaming natively. There is no data-fetching library.
- **No REST routes, GraphQL resolvers, tRPC routers.** IRPC eliminates the API layer. You declare a function, implement it, call it. No endpoints, no controllers.
- **No manual WebSocket infrastructure.** No socket servers, no event handlers, no connection management. IRPC handles real-time streaming as a transport concern — you call a function and data streams. The protocol decides how.
- **No re-render optimization.** There are no re-render cascades to optimize. Reactive fragments update the exact DOM nodes that depend on changed data. Everything else stays still.
- **No React tree-level providers.** No `QueryClientProvider`, no `StoreProvider`, no `Context.Provider` for state sharing. Anchor state is reactive without tree-level wrappers.

If you catch yourself reaching for any of the above, stop. You are falling back to a paradigm that AIR Stack has already solved at the architecture level.

## The Abstractions

AIR Stack provides three abstractions over predictable software routines:

- **Anchor** abstracts reactivity. You mutate an object and anything observing it responds. No subscriptions, no immutable update ceremonies, no re-render cycles.
- **IRPC** abstracts transport. You declare a function, implement it, and call it. The network boundary disappears. Remote functions feel local. Streaming, batching, and caching are built into the protocol.
- **Anchor for React** (`@anchorlib/react`) abstracts rendering. You write a constructor that runs once and define reactive fragments for fine-grained DOM updates. Only the exact fragment reading changed state updates. The rest of the tree is untouched.


## Architecture

AIR Stack is an integrated TypeScript application architecture:

- **A = Anchor** — Fine-grained reactive state management. Replaces `useState`, `useEffect`, Redux, Zustand, React Query.
- **I = IRPC** — Universal Remote Procedure Calls with automatic batching, caching, and streaming. Replaces REST, tRPC, GraphQL.
- **R = React** — Rendering surface only. Anchor controls reactivity; React paints the DOM.

### Mental Model

Every application is constructed through a sequential chain of bridges:

```
Problem → Data → Storage → State → Logic → View → Navigation → Access
```

Each bridge transforms the output of the previous bridge. Do not skip bridges. Do not let a downstream bridge dictate an upstream bridge. Upstream layers are portable — they contain no framework imports and no deployment assumptions.

### Mobility

Mobility is the key design principle. Code must never lock into a specific runtime, framework, or deployment target:

- **Data types** are plain TypeScript interfaces. No framework imports.
- **State and logic** import from `@anchorlib/core` (framework-agnostic). Moving from React to Svelte changes only the view layer.
- **IRPC stubs** are pure TypeScript. Moving from Bun to Node changes only the entry point.
- If switching runtimes or view frameworks requires refactoring business logic, the architecture is wrong.

### Server and Client

In IRPC, server and client describe roles, not machines:

- **Client** — invokes the declared stub (`hello('John')`).
- **Server** — provides the implementation (`irpc.construct(hello, ...)`).

The server can be a remote machine, a Web Worker, another browser tab via BroadcastChannel, or even the same thread. Location is irrelevant — IRPC abstracts it entirely.

## Project Structure

AIR Stack prefers monorepo. Stubs (declarations) and constructors (implementations) always live in separate files and directories. The physical structure scales with complexity:

### Simple App (Monolith)

Stubs and constructors in separate directories within the same project:

```
my-app/
├── stubs/
│   ├── users/
│   │   └── index.ts
│   ├── billing/
│   │   └── index.ts
│   └── index.ts               # barrel
├── constructors/
│   ├── users/
│   │   └── index.ts
│   ├── billing/
│   │   └── index.ts
│   └── index.ts               # barrel
├── states/
│   └── auth.ts
├── routes/
│   ├── route.ts
│   └── Index.tsx
├── components/
│   └── UserCard.tsx
├── lib/
│   └── module.ts              # IRPC package + transport
├── api.ts                     # Server entry point
└── main.tsx                   # React entry point
```

### Medium App (Monorepo)

API as its own publishable package:

```
my-project/
├── packages/
│   └── api/                   # @myorg/api — publishable
│       ├── stubs/
│       │   ├── users/
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   └── index.ts
│       ├── constructors/
│       │   ├── users/
│       │   │   └── index.ts
│       │   └── index.ts
│       └── module.ts
├── apps/
│   ├── web/                   # React app — imports @myorg/api/stubs
│   └── api/                   # Server — imports @myorg/api/constructors
```

Any client — React app, CLI tool, another service — uses `import { getUser } from '@myorg/api/stubs/users'`.

### Large App (Monorepo, Strict Separation)

Domain-scoped packages, shared vs app-specific components:

```
my-project/
├── packages/
│   ├── users-api/             # @myorg/users-api
│   │   ├── stubs/
│   │   └── constructors/
│   ├── billing-api/           # @myorg/billing-api
│   │   ├── stubs/
│   │   └── constructors/
│   └── ui-kit/                # @myorg/ui-kit — shared components
├── apps/
│   ├── admin/
│   ├── customer/
│   └── worker/                # Web Worker handler
```

Route definitions (`route.ts`) are always separated from views (`Index.tsx`). This eliminates circular dependencies and allows the route tree to be evaluated without importing React.

## Installation

```bash
# Anchor (React)
npm install @anchorlib/react

# Optional: Client-side persistence
npm install @anchorlib/storage

# IRPC
npm install @irpclib/irpc @irpclib/http
# Optional transports
npm install @irpclib/ws         # WebSocket
npm install @irpclib/broadcast   # BroadcastChannel
```

`@anchorlib/react` re-exports everything from `@anchorlib/core`.

### React Initialization (CRITICAL)

Import the client entry point before any component runs. This binds Anchor's reactive system to React.

```tsx
// main.tsx
import '@anchorlib/react/client'; // ← MUST be the first import

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

Without this import, components render but state changes will NOT trigger UI updates.

## Tooling

- **Bundler:** Vite.
- **Styling:** TailwindCSS. Prefer utility classes on the CSS side over inline class lists. Instead of scattering dozens of Tailwind classes across JSX, compose them into semantic CSS utilities:

```css
/* styles/utilities.css */
.card { @apply rounded-lg shadow-md p-4 bg-white dark:bg-gray-800; }
.btn-primary { @apply px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors; }
.input-field { @apply w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none; }
```

```tsx
// ✅ Portable — styling is in CSS, not framework code
<button className="btn-primary">Submit</button>

// ❌ Not portable — styling locked into JSX
<button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">Submit</button>
```

CSS utilities are portable across frameworks. Inline class lists are not.

- **Testing:** Vitest.
- **Environment:** Define a portable ENV structure. Do not rely on framework-specific patterns (`import.meta.env.VITE_*`). Create an `env.ts` module that reads and exports typed configuration:

```tsx
// lib/env.ts
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080',
};

// lib/module.ts — consumes env, never reads import.meta directly
import { env } from './env.js';
const transport = new HTTPTransport({ baseURL: env.apiUrl, endpoint: `/irpc/${irpc.href}` });
```

If the app moves to a different bundler or runtime, only `env.ts` changes.

## Data Conventions

All data types are pure TypeScript. No framework imports. Data definitions are leaf dependencies — they import nothing from other bridges.

- **IDs:** `string` (UUIDs via `crypto.randomUUID()`). Never auto-increment integers.
- **Timestamps:** `string` (ISO 8601 UTC: `"2024-03-15T10:30:00.000Z"`). Never `Date` objects or Unix numbers.
- **Enums:** `as const` objects with derived types. Never inline string literal unions.
- **Collections:** `T[]` for ordered lists, `Record<string, T>` for keyed lookups. No `Map`/`Set` (not JSON-serializable).
- **Nullable:** `T | null` for explicitly empty. `field?: T` for not-yet-set.
- **Validation:** Zod strictly at untrusted boundaries (user input). Do not validate trusted internal sources.

```tsx
export const ORDER_STATUS = {
  PENDING: 'pending',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// Always use constants, not raw strings:
order.status = ORDER_STATUS.SHIPPED; // ✅
order.status = 'shipped';           // ❌
```

Domain types are shaped by the problem, never by API response formats or database schemas. Transform external data at the boundary.

## IRPC: Type-Safe Remote Functions

IRPC eliminates the network layer. Declare a function, implement it, call it. No routes, no controllers, no serialization. The transport decides how the call travels — HTTP, WebSocket, BroadcastChannel, or in-process.

### Package & Transport

```tsx
// lib/module.ts
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const irpc = createPackage({ name: 'my-api', version: '1.0.0' });

export const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
});

irpc.use(transport);
```

### Declare & Construct

**Stub (declaration)** — shared by client and server:

```tsx
// stubs/users/index.ts
import { irpc } from '../../lib/module.js';

export type GetUserFn = (id: string) => Promise<User>;
export const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
```

**Constructor (implementation)** — loaded only by the server side:

```tsx
// constructors/users/index.ts
import { irpc } from '../../lib/module.js';
import { getUser } from '../../stubs/users/index.js';

irpc.construct(getUser, async (id) => {
  return await db.users.findById(id);
});
```

**Client usage:**

```tsx
import { getUser } from '@myorg/api/stubs/users';
const user = await getUser('user-123');
```

### Streaming (RemoteState)

For progressive/real-time data:

```tsx
// stubs/dashboard/index.ts
import type { RemoteState } from '@irpclib/irpc';

export type GetDashboardFn = (userId: string) => RemoteState<DashboardData>;
export const getDashboard = irpc.declare<GetDashboardFn>({
  name: 'getDashboard',
  init: () => ({} as DashboardData), // REQUIRED: seeds the client-side reactive proxy
});
```

```tsx
// constructors/dashboard/index.ts
import { stream } from '@irpclib/irpc';

irpc.construct(getDashboard, (userId) => {
  return stream((data, resolve) => {
    const q1 = db.users.get(userId).then(res => data.user = res);
    const q2 = db.sales.aggregate(userId).then(res => data.sales = res);
    Promise.all([q1, q2]).then(() => resolve());
  }, {});
});
```

### Stream Cleanup

```tsx
irpc.construct(watchPrices, (ticker) => {
  return stream(async (state) => {
    const conn = await redis.connect();
    conn.on('price_update', (price) => { state.data = price; });
    // Cleanup runs on: client disconnect, timeout, resolve(), reject()
    return () => { conn.close(); };
  });
});
```

### File Uploads

IRPC supports file uploads natively through `IRPCFile`. Files can be passed as top-level arguments or nested within object payloads. The transport automatically extracts and reconstructs the binaries.

```tsx
// Stub
import { irpc, type IRPCFile } from '@irpclib/irpc';

export type UserProfile = { username: string; avatar: IRPCFile };
export type UpdateProfileFn = (profile: UserProfile) => Promise<string>;
export const updateProfile = irpc.declare<UpdateProfileFn>({ name: 'updateProfile' });

// Client
import { IRPCFile } from '@irpclib/irpc';
const file = fileInput.files[0]; // Browser File extends Blob
const avatar = new IRPCFile({ name: file.name, size: file.size, type: file.type }, file);
await updateProfile({ username: 'john', avatar });

// Server
irpc.construct(updateProfile, async (profile) => {
  const buffer = await profile.avatar.data.arrayBuffer();
  await storage.save(profile.avatar.meta.name, buffer);
  return 'Success';
});
```

HTTP Transport is recommended for file uploads. WebSocket supports binary framing but large files block the persistent connection.

### Declare Options

```tsx
irpc.declare<Fn>({
  name: 'funcName',
  maxAge: 60000,            // Cache for 60 seconds
  coalesce: true,           // Deduplicate simultaneous identical calls
  timeout: 30000,           // Per-function timeout
  maxRetries: 5,            // Retry attempts (network errors only)
  retryMode: 'exponential', // 'linear' | 'exponential'
  retryDelay: 1000,         // Base retry delay
  schema: {                 // Optional Zod validation
    input: [z.string()],
    output: z.object({ id: z.string() }),
  },
});
```

### Cache Invalidation

```tsx
irpc.invalidate(getUser, 'user-123'); // Specific entry
irpc.invalidate(getUser);             // All entries
```

### Automatic Batching

Simultaneous calls batch into a single HTTP request:

```tsx
const [user, posts, stats] = await Promise.all([
  getUser('123'), getPosts('123'), getStats('123'),
]); // 1 HTTP request, not 3
```

### Context & Middleware

The router's `resolve()` accepts `initContext` — `[key, value]` tuples seeding the request context. Middleware and handlers read via `getContext()`, write via `setContext()`. They never reference transport-specific types, making middleware portable across all transports.

Access control (authentication, RBAC, permissions) is the application's responsibility, not the transport's. Build it as standard middleware and utility functions that run before handler execution:

```tsx
import { getContext, setContext } from '@irpclib/irpc';

// Entry point — extract values from the transport-specific object
router.resolve(req, [['token', req.headers.get('authorization')]]);

// Middleware — transport-agnostic, reusable across HTTP/WS/Broadcast
router.use(async () => {
  const token = getContext<string>('token');
  if (!token) throw new Error('Unauthorized');
  setContext('user', await verifyToken(token));
});

// Server — reads standardized context
irpc.construct(getProfile, async () => {
  const user = getContext<User>('user');
  return await db.users.findById(user.id);
});
```

### Server Entry Point

The entry point mounts the router and imports constructors. `AsyncLocalStorage` isolates context across concurrent requests.

```tsx
// api.ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';
import './constructors/index.js'; // Imports all constructors

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req, [
        ['token', req.headers.get('authorization')],
      ]);
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

Replace `Bun.serve` with any runtime's HTTP handler — Node, Deno, Cloudflare Workers. The router and middleware stay identical.

### Transports

| Transport | Connection | Latency | File Upload | Use Case |
|---|---|---|---|---|
| HTTP | Request/Response | Higher | Recommended | Most applications |
| WebSocket | Persistent | Lower | Supported (blocks) | Real-time, persistent state |
| Broadcast | Browser-native | Lowest | Native (structured clone) | Cross-tab, Web Workers |

```tsx
// HTTP
import { HTTPTransport } from '@irpclib/http';
const transport = new HTTPTransport({ endpoint: `/irpc/${irpc.href}` });

// WebSocket
import { WebSocketTransport } from '@irpclib/ws';
const transport = new WebSocketTransport({ url: 'ws://localhost:8080', autoReconnect: true });

// BroadcastChannel
import { BroadcastTransport } from '@irpclib/broadcast';
const transport = new BroadcastTransport({ channel: irpc.href });
```

### External Services

Never call external APIs directly from the client. Wrap them in IRPC constructors:

```tsx
// stubs/ai/index.ts
export type GenerateTextFn = (prompt: string) => Promise<string>;
export const generateText = irpc.declare<GenerateTextFn>({ name: 'generateText' });

// constructors/ai/index.ts — API key stays here, never exposed to client
irpc.construct(generateText, async (prompt) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    method: 'POST',
    body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
});
```

The client calls `generateText('hello')`. The API key, endpoint, and authentication logic are invisible. This applies to all external services: payment providers, email APIs, cloud storage, LLMs.

### Error Handling

Constructors must handle their own errors gracefully — never let an unhandled exception crash the service. Return the result on success. Throw on failure — IRPC transports the error to the client natively:

```tsx
irpc.construct(createOrder, async (order) => {
  const existing = await db.orders.findByRef(order.ref);
  if (existing) throw new Error('Order already exists');

  return await db.orders.create(order); // Return the result directly
});
```

The client receives the thrown error as a rejected Promise — no success/error envelopes needed:

```tsx
try {
  const order = await createOrder(newOrder);
} catch (err) {
  // err.message === 'Order already exists'
}
```

Surface errors to the user based on context:

- **Form-related errors** → inline validation messages next to the relevant field.
- **Background task errors** → toast notifications or status indicators.

## State Management

State APIs are available from both `@anchorlib/react` (React) and `@anchorlib/core` (framework-agnostic). Headless state and logic must import from `@anchorlib/core` for portability.

### Mutable

```tsx
import { mutable } from '@anchorlib/core';

const user = mutable({ name: 'John', age: 30, hobbies: ['reading'] });
user.name = 'Jane';          // Direct mutation triggers reactivity
user.hobbies.push('coding'); // Array mutations tracked

const count = mutable(0);    // Primitives wrap in .value
count.value++;

const cart = mutable({
  price: 10, quantity: 2,
  get total() { return this.price * this.quantity; }, // Computed
  increment() { this.quantity++; },                    // Method
});
```

Reactivity depth: `mutable(data, { recursive: true })` (default, deep), `{ recursive: false }` (shallow), `{ recursive: 'flat' }` (array tracking only).

### Immutable + Writable

```tsx
import { immutable, writable } from '@anchorlib/core';

export const settings = immutable({ theme: 'dark', language: 'en' });
settings.theme = 'light'; // ERROR — blocked

export const themeControl = writable(settings, ['theme']); // Controlled access
themeControl.theme = 'light'; // WORKS
```

### Derived

For values computed from multiple independent state sources:

```tsx
import { derived } from '@anchorlib/core';

const visibleTodos = derived(() => {
  if (filter.value === 'COMPLETED') return todos.filter(t => t.done);
  return todos;
});
// Access via visibleTodos.value
```

Use JS getters when the value is intrinsic to its parent object. Use `derived()` when it depends on separate sources.

### Form

```tsx
import { form } from '@anchorlib/core';
import { z } from 'zod';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
const [state, errors] = form(schema, { email: '', password: '' });
// errors.email — undefined if valid, { message: string } if invalid
```

### Headless State

For complex business state, define factories separate from UI:

```tsx
// states/auth.ts
import { immutable, writable } from '@anchorlib/core';

const _auth = immutable({
  user: null as User | null,
  get isAuthenticated() { return this.user !== null; },
});

export const auth = _auth;
export const authControl = writable(_auth);
```

## Reactivity

### effect()

Runs immediately, then re-runs whenever accessed reactive state changes. No dependency array.

```tsx
import { effect } from '@anchorlib/core';

effect(() => { console.log(state.count); }); // Tracks state.count

// Cleanup
effect(() => {
  const id = setInterval(() => {}, state.delay);
  return () => clearInterval(id);
});

// Client-only (skipped during SSR)
effect.client(() => { document.title = state.pageTitle; });
```

### Utilities

```tsx
import { untrack, snapshot, stringify, subscribe } from '@anchorlib/core';

// Read without subscribing
effect(() => { const url = untrack(() => settings.url); });

// Non-reactive deep copy
const copy = snapshot(state);

// Non-tracking serialization (JSON.stringify tracks every property)
stringify(state);

// Observe all changes on an object
subscribe(user, (val, event) => { console.log('Changed'); });
```

## View (React Components)

### setup()

Every component uses `setup()`. It runs **exactly once** — a constructor, not a render function.

```tsx
import { setup, render, mutable } from '@anchorlib/react';

export const Counter = setup((props) => {
  const state = mutable({ count: 0 });
  const increment = () => state.count++;

  return render(() => (
    <button onClick={increment}>Count: {state.count}</button>
  ));
}, 'Counter');
```

### View Patterns

**render()** — Primary reactive view:

```tsx
return render(() => <div>{state.title}</div>);
```

**snippet()** — Independent reactive section within `setup()`:

```tsx
const Header = snippet(() => <h1>{state.title}</h1>, 'Header');
const Content = snippet(() => <p>{state.data}</p>, 'Content');

return (
  <div>
    <Header />   {/* Re-renders only when state.title changes */}
    <Content />  {/* Re-renders only when state.data changes */}
  </div>
);
```

**template()** — Standalone reusable view, props-only:

```tsx
import { template } from '@anchorlib/react';

const UserCard = template<{ user: User }>(({ user }) => (
  <div><h2>{user.name}</h2></div>
), 'UserCard');
```

Static layout: JSX returned from `setup()` without `render()` is static — created once, never re-evaluated. Reactive reads in static JSX show initial values only.

### Props

Props in `setup()` are reactive proxies. Do NOT destructure:

```tsx
// ❌ const { name } = props; — stale
// ✅ props.name — reactive

// Use $omit/$pick instead of spread:
const divProps = props.$omit(['variant']);
```

In `template()` and `snippet()`, props are standard objects — destructuring is safe.

### Lifecycle

```tsx
import { onMount, onCleanup } from '@anchorlib/react';

onMount(() => { inputRef.current?.focus(); });
onCleanup(() => window.removeEventListener('resize', handler));
```

### Binding

```tsx
import { $use, $bind, nodeRef } from '@anchorlib/react';

// One-way
<Display value={$use(state, 'count')} />

// Two-way
<TextInput value={$bind(state, 'name')} />

// DOM binding — bypasses React render cycle (animations, drag-and-drop)
const panelRef = nodeRef(() => ({
  className: state.active ? 'visible' : 'hidden',
  style: { transform: `translateX(${state.x}px)` },
}));
<div ref={panelRef} {...panelRef.attributes}><Heavy /></div>
```

### Async

```tsx
import { query, fetchState, streamState } from '@anchorlib/react';

// General async
const userQuery = query(async (signal) => {
  return fetch('/api/user', { signal }).then(r => r.json());
});
// userQuery.data, userQuery.status, userQuery.error, userQuery.start(), userQuery.abort()

// HTTP fetch
const userData = fetchState({ name: '' }, { url: '/api/user' });

// Streaming
const chat = streamState('', { url: '/api/chat', transform: (cur, chunk) => cur + chunk });
```

### 3rd Party Components

Non-Anchor React components (date pickers, rich text editors, maps) work inside `setup()` without modification. Place them inside `render()`, `snippet()`, or `template()` reactive boundaries:

```tsx
import { DatePicker } from 'react-datepicker';

export const EventForm = setup(() => {
  const state = mutable({ date: new Date() });

  return render(() => (
    <DatePicker selected={state.date} onChange={(d) => { state.date = d; }} />
  ));
}, 'EventForm');
```

If a 3rd party component manages its own internal state (e.g., a rich text editor), let it. Read its output via callbacks and store the result in Anchor state. Do not try to make the component's internals reactive.

## Routing

### Create & Mount

```tsx
// lib/router.ts
import { createRouter, RENDER_MODE, MAX_AGE } from '@anchorlib/react/router';
import type { ReactNode } from 'react';

export const router = createRouter<ReactNode>({
  renderMode: RENDER_MODE.IMMEDIATE,
  maxAge: MAX_AGE.DAY,
});

// main.tsx
import { UIRouter } from '@anchorlib/react/router';
<UIRouter router={router} root={AppRoot} />
```

### Route Tree

Routes are pure TypeScript objects, separate from views:

```tsx
export const rootRoute = router.route('/');
export const usersRoute = rootRoute.route('/users');
export const profileRoute = usersRoute.route('/:user_id');
```

### Attach Views

**Page** — rendered as a page tree (nested layout):

```tsx
import { page } from '@anchorlib/react/router';

rootRoute.render((_state, _ctx, children) => (
  <div><nav>Navigation</nav><main>{children}</main></div>
));

export default page(rootRoute);
```

**Modal** — rendered as stacks, layered on top of each other:

```tsx
import { modal } from '@anchorlib/react/router';

confirmRoute.render((state) => (
  <Dialog title="Confirm">{state.data?.message}</Dialog>
));

export default modal(confirmRoute);
```

### Route State

| Property | Type | Description |
|---|---|---|
| `state.active` | `boolean` | Route is currently matched |
| `state.status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Lifecycle status |
| `state.data` | `object` | Resolved provider data |
| `state.error` | `RouteError \| undefined` | Error from guard/provider |
| `state.context` | `{ params, query, data }` | Active context |

### Providers

```tsx
profileRoute
  .provide('profile', async ({ params }) => getUser(params.user_id))
  .provide('posts', async ({ params, data }) => fetchPosts(params.user_id))
  .render((state) => <h1>{state.data?.profile?.name}</h1>)
```

Providers execute sequentially. Each receives data from previous providers. They run inside reactive observers — reading global Anchor state auto-triggers re-fetch.

### Guards

```tsx
import { redirect } from '@anchorlib/router';

dashboardRoute.guard(async () => {
  if (!auth.isAuthenticated) throw redirect(loginRoute);
})
```

### Navigation

```tsx
import { Link, navigate } from '@anchorlib/react/router';

<Link to={ProfileRoute} params={{ user_id: '42' }}>View</Link>
<Link to={UsersRoute} activeClass="active">Users</Link>

navigate(ProfileRoute, { params: { user_id: '42' } });
```

## Server-Side Rendering (SSR)

SSR requires request isolation and headless routing to function safely in concurrent Node.js environments.

```tsx
import { setAsyncStorageAdapter, isolated, createLifecycle } from '@anchorlib/react';
import { AsyncLocalStorage } from 'node:async_hooks';
import { renderToString } from 'react-dom/server';
import { UIRouter, Redirect, redirectUrl } from '@anchorlib/react/router';
import { router } from './router';
import AppRoot from './routes/Index';

// 1. Isolate state per request (Run ONCE at server startup)
setAsyncStorageAdapter(new AsyncLocalStorage());

app.get('*', async (req, res) => {
  // 2. Isolate context layer (storage.run)
  await isolated.async(async () => {
    // 3. Create a scoped lifecycle
    const scope = createLifecycle();
    await scope.runAsync(async () => {
      try {
        // 4. Pre-activate router
        await router.activate(req.url);

        // 5. Render headless (bypasses browser APIs, sync rendering)
        const html = renderToString(<UIRouter router={router} root={AppRoot} url={req.url} headless={true} />);
        res.send(`<body><div id="root">${html}</div></body>`);
      } catch (error) {
        if (error instanceof Redirect) {
          res.redirect(302, redirectUrl(error));
        } else {
          console.error(error);
          res.status(500).send('Internal Server Error');
        }
      }
    });
    // 6. Destroy scope
    scope.destroy();
  });
});
```

Client hydration:
```tsx
import '@anchorlib/react/client'; // MUST be first
import { hydrateRoot } from 'react-dom/client';
import { UIRouter } from '@anchorlib/react/router';
import { router } from './router';
import AppRoot from './routes/Index';

router.activate(window.location.href).then(() => {
  hydrateRoot(document.getElementById('root')!, <UIRouter router={router} root={AppRoot} />);
});
```

## Client-Side Storage

```tsx
import { session } from '@anchorlib/storage';
const userSession = session('user', { id: null, name: '' });
userSession.id = 123; // Auto-persisted to sessionStorage

import { persistent } from '@anchorlib/storage';
const settings = persistent('settings', { theme: 'light' });
settings.theme = 'dark'; // Auto-persisted to localStorage

import { createKVStore, createTable } from '@anchorlib/storage/db';
const kvStore = createKVStore<{ name: string }>('store');
const userTable = createTable<User>('users');
```

## Storage Pattern: Store + Driver

Every persistence concern splits into Store (contract) and Driver (implementation):

```tsx
export const db = new DataStore();
db.use(new SupabaseDriver(config)); // or IndexedDBDriver, PostgresDriver

// Logic calls the Store — never the Driver directly
await db.read('users', userId);
await db.create('users', newUser);
```

Swap drivers without changing logic. The same Store interface works across runtimes.

## PWA Patterns

AIR Stack applications are PWA-preferred. Standard patterns:

- **Manifest:** Include `manifest.json` with app name, icons, theme color, `display: 'standalone'`.
- **Service Worker:** Register a service worker for offline caching. Vite plugins (`vite-plugin-pwa`) handle generation.
- **Offline-first data:** Use `@anchorlib/storage` (IndexedDB, localStorage) for local persistence. Sync to server via IRPC when connectivity returns.
- **BroadcastChannel:** Use `BroadcastTransport` for cross-tab state synchronization and Web Worker coordination without a remote server.
- **Install prompt:** Detect `beforeinstallprompt` event and surface a custom install UI.

```tsx
// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Testing

Vitest is the test runner. AIR Stack testing is straightforward because each layer is plain TypeScript:

**State** — just objects. Mutate and assert:

```tsx
import { mutable } from '@anchorlib/core';

test('cart total computes correctly', () => {
  const cart = mutable({ price: 10, quantity: 2, get total() { return this.price * this.quantity; } });
  expect(cart.total).toBe(20);
  cart.quantity = 5;
  expect(cart.total).toBe(50);
});
```

**Constructors** — plain async functions. Mock the database driver, call the constructor directly:

```tsx
import { irpc } from '../lib/module.js';
import { getUser } from '../stubs/users/index.js';
import '../constructors/users/index.js';

test('getUser returns user by id', async () => {
  db.use(mockDriver({ users: [{ id: '1', name: 'John' }] }));
  const user = await irpc.resolve({ id: '1', name: 'getUser', args: ['1'] });
  expect(user.name).toBe('John');
});
```

**Client integration** — implement a local constructor (same thread via BroadcastTransport or direct resolve) to verify what the client sends without spinning up a real HTTP server.

**UI testing** — Anchor React uses hooks under the hood to trigger re-renders. Use React Testing Library and `renderHook` for component/UI tests — that's how React works. Logic testing and UI testing are separate concerns:

- **Logic tests** (state, constructors, derived values) — plain TypeScript, no React tooling needed.
- **UI tests** (components, rendering, interactions) — React Testing Library. Anchor renders through React's reconciler, so RTL is the right tool for verifying rendered output.

## Anti-Patterns

```tsx
// ❌ React hooks
import { useState, useEffect } from 'react';
// ❌ Destructure reactive props in setup
const { name } = props;
// ❌ JSON.stringify reactive state in effects
effect(() => console.log(JSON.stringify(state)));
// ❌ Reactive reads in static JSX
return <span>{state.count}</span>; // Initial value only
// ❌ Stubs and constructors in the same file
// ❌ API declarations trapped inside the app (not portable)
```

## Best Practices

```tsx
// ✅ setup() for ALL components
export const MyComponent = setup(() => { ... });
// ✅ Access props directly
effect(() => console.log(props.name));
// ✅ snippet/template for reactive parts
const Title = snippet(() => <h1>{state.title}</h1>, 'Title');
// ✅ stringify() or snapshot() for serialization
effect(() => console.log(stringify(state)));
// ✅ $omit/$pick for prop spreading
const rest = props.$omit(['variant']);
// ✅ immutable for shared state
export const appState = immutable({ ... });
export const appControl = writable(appState, ['allowedKeys']);
// ✅ Import from @anchorlib/core for portability
import { mutable, immutable } from '@anchorlib/core';
// ✅ Separate route definitions from views
// ✅ Separate stubs from constructors — always different files/directories
```

## Import Reference

### @anchorlib/react

```tsx
import {
  setup, render, template, snippet,
  mutable, immutable, writable, model, derived, form,
  effect, subscribe, untrack, snapshot, stringify,
  $use, $bind, nodeRef,
  onMount, onCleanup,
  query, fetchState, streamState,
  callback, type Bindable,
} from '@anchorlib/react';
```

### @anchorlib/react/client

```tsx
import '@anchorlib/react/client'; // MUST be first import at app entry
```

### @anchorlib/react/router

```tsx
import { createRouter, page, modal, UIRouter, Link, navigate, RENDER_MODE, MAX_AGE } from '@anchorlib/react/router';
```

### @anchorlib/router

```tsx
import { redirect } from '@anchorlib/router';
```

### @anchorlib/core

```tsx
import {
  mutable, immutable, writable, derived, effect,
  subscribe, untrack, snapshot, stringify, model, form, query,
} from '@anchorlib/core';
```

### @anchorlib/storage

```tsx
import { session, persistent } from '@anchorlib/storage';
import { createKVStore, createTable } from '@anchorlib/storage/db';
```

### @irpclib/irpc

```tsx
import {
  createPackage, stream, IRPCFile,
  setContextProvider, getContext, setContext,
  type RemoteState,
} from '@irpclib/irpc';
```

### @irpclib/http

```tsx
import { HTTPTransport, HTTPRouter } from '@irpclib/http';
```

### @irpclib/ws

```tsx
import { WebSocketTransport, WebSocketRouter } from '@irpclib/ws';
```

### @irpclib/broadcast

```tsx
import { BroadcastTransport, BroadcastRouter } from '@irpclib/broadcast';
```

