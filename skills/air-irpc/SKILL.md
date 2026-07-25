---
name: air-irpc
description: "Use this skill when implementing Isomorphic RPC (IRPC) in the AIR Stack. It covers deep-dive knowledge into API declarations, handlers, setup, streaming, CRUD, and testing. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Stack IRPC Decision Router

IRPC (Isomorphic RPC) is a universal reactive network abstraction. It entirely divorces *what* a function does from *where* it executes by separating API signatures (stubs) from their implementations (constructors) and their network layers (transports).

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Setup and Routing
- **When problems**: Connecting the client to the server. Need to choose between HTTP, WebSocket, or Broadcast transport. Routing IRPC calls through your web server. Extracting auth tokens from requests and seeding them into handler context. Handling webhook callbacks from Stripe or other providers.
- **When tools**: Configuring `HTTPTransport`, `WebSocketTransport`, `BroadcastTransport`. Using `HTTPRouter`, `WebSocketRouter`. Seeding context via `router.resolve(req, [['key', value]])`. Building webhook interceptors with `router.resolveRest()`.
- **Action**: Read `contents/setup-and-routing.md`

## Declarations and Handlers
- **When problems**: Defining API signatures (stubs) with TypeScript types. Implementing the actual logic in constructors. Configuring caching, retries, timeouts. Validating inputs/outputs with Zod/Valibot. Adding middleware hooks that run before the handler. Accessing request context safely inside a handler.
- **When tools**: Using `irpc.declare()`, `irpc.construct()`. Configuring `FunctionConfig` (`maxAge`, `coalesce`, `maxRetries`, `timeout`, `schema`). Using `irpc.guard()`, `irpc.hook()`. Accessing context via `getContext()`, `setContext()`, `credential()`.
- **Action**: Read `contents/declarations-and-handlers.md`

## Execution and Streaming
- **When problems**: Calling server functions from UI components with reactive state tracking. Streaming real-time data (live chat, stock prices, AI responses). Handling file uploads and downloads. Injecting API credentials (BYOK). Invalidating cached results. Piping one stream through another.
- **When tools**: Using `.once()`, `.with()`, `.when()`, `.later()`. Implementing `stream()` handlers. Using `IRPCFile` for uploads, `IRPCBlob` for downloads. Using `credential()`, `irpc.invalidate()`, `reader.pipe()`.
- **Action**: Read `contents/execution-and-streaming.md`

## CRUD and Adapters
- **When problems**: Building standard database operations (get, create, update, delete) without repetitive stubs. Creating Chain of Responsibility pipelines (Cache → Database). Exposing read-only entities (no create/update/delete). Adding custom operations (like `list`) to standard CRUD.
- **When tools**: Using `irpc.crud()`, `irpc.exclude()`. Implementing `IRPCCrudDriver`, `IRPCCrudAdapter`. Using `IRPCAdapter.next()` for chain fallthrough. Extending `IRPCCrudAdapter` with custom methods.
- **Action**: Read `contents/crud-and-adapters.md`

## Library Authoring
- **When problems**: Publishing reusable IRPC libraries. Preventing server-side code (database imports, API keys) from leaking into client bundles through shared stubs. Designing pluggable Adapter/Provider architectures for consumers.
- **When tools**: Configuring `package.json` export maps (`import`, `require`, `default`). Separating client stubs from server handlers. Using `@irpclib/irpc` for framework-independent logic.
- **Action**: Read `contents/library-authoring.md`

## Testing
- **When problems**: Writing unit tests for IRPC functions without needing a real network. Mocking database dependencies inside constructors. Testing streaming functions with fake timers. Matching typed errors (ResolveError vs TransportError vs HandlerError).
- **When tools**: Using `vitest` + `jsdom`. `withContext()` for context isolation. Fake timers for stream testing. `IRPCError.from()` for error reconstruction. `ResolveError`, `TransportError`, `HandlerError` error classes.
- **Action**: Read `contents/testing.md`

## Troubleshooting
- **When problems**: A constructor was defined but the function returns `undefined` (handler not registered). A stream handler leaks intervals after the client disconnects. `getContext()` returns `undefined` even though `setContext()` was called. An endpoint throws a generic error — the client can't distinguish the error type. `IRPCError.from()` not used for client-side error handling. Mixing `Promise<T>` and `RemoteState<T>` return types.
- **When tools**: `withContext()` for context isolation in tests. `return () => cleanup` inside `stream()` for resource cleanup. `ResolveError.notFound()`, `HandlerError`, `GuardError` for typed errors. `IRPCError.from()` for client error reconstruction. `seed` inference rule for SSR-safe initial state.
- **Action**: Read `contents/troubleshooting.md`

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
