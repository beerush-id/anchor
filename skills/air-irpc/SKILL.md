---
name: air-irpc
description: "Use this skill when implementing Isomorphic RPC (IRPC) in the AIR Stack. It covers deep-dive knowledge into API declarations, handlers, setup, streaming, CRUD, and testing. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Stack IRPC Decision Router

IRPC (Isomorphic RPC) is a universal reactive network abstraction. It entirely divorces *what* a function does from *where* it executes by separating API signatures (stubs) from their implementations (constructors) and their network layers (transports).

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Setup and Routing
- **When**: You need to configure client transports (HTTP, WebSocket, Broadcast), build multi-transport architectures or edge distribution, handle router bindings and context seeding in your web server, or build webhook interceptors.
- **Action**: Read `contents/setup-and-routing.md`

## Declarations and Handlers
- **When**: You need to define API signatures (stubs), configure caching/retries/schemas, implement handlers using `construct`, build function compositions that bypass network overhead, configure hooks/middleware, or safely access context within a handler.
- **Action**: Read `contents/declarations-and-handlers.md`

## Execution and Streaming
- **When**: You need to execute IRPC functions in UI components (`.once`, `.with`, `.when`, `.later`), handle continuous data streams via `RemoteState` and `stream()`, pipe streams, handle file uploads/downloads natively, inject API credentials manually, or invalidate cache system-wide.
- **Action**: Read `contents/execution-and-streaming.md`

## CRUD and Adapters
- **When**: You need to build standard database operations using `irpc.crud()`, wire drivers (`IRPCCrudDriver`) to adapters (`IRPCCrudAdapter`), build Chain of Responsibility pipelines (e.g., Caching -> Database), exclude specific CRUD operations, or extend adapters with custom operations (like `list`).
- **Action**: Read `contents/crud-and-adapters.md`

## Library Authoring
- **When**: You need to author reusable IRPC libraries, separate client stubs from server handlers to prevent client bundles from crashing, design pluggable `Adapter/Provider` architectures, or configure package export maps.
- **Action**: Read `contents/library-authoring.md`

## Testing
- **When**: You need to write unit tests for your IRPC functions natively without a network, mock database dependencies, use fake timers to test `RemoteState` streams, or properly match typed errors (`ResolveError`, `TransportError`, etc.).
- **Action**: Read `contents/testing.md`

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
