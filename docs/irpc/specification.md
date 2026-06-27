---
title: IRPC Specification
description: The complete specification for IRPC (Isomorphic Remote Procedure Call) - a language-agnostic pattern that enables remote function calls with the same ergonomics as local function calls.
head:
  - - meta
    - property: og:title
      content: IRPC Specification
  - - meta
    - property: og:description
      content: The complete specification for IRPC (Isomorphic Remote Procedure Call) - a language-agnostic pattern that enables remote function calls with the same ergonomics as local function calls.
  - - meta
    - name: keywords
      content: irpc, specification, rpc, remote procedure call, protocol, wire format, transport, factory
---

# IRPC Specification <Badge type="tip" text="v1.0" />

![IRPC Schema](/diagrams/schema.svg)

## 1. Introduction

IRPC (Isomorphic Remote Procedure Call) is a language-agnostic pattern that enables remote function calls with the same ergonomics as local function calls. This specification defines the core concepts, protocols, and interfaces required for interoperable IRPC implementations across different programming languages and environments.

### 1.1 Scope

This specification defines:

- The IRPC function contract and execution model
- The wire protocol for request/response communication
- The transport abstraction layer including routing
- The factory interface for creating and managing IRPC functions
- The batching and optimization mechanisms

This specification explicitly excludes:

- Specific transport protocol implementations (HTTP, WebSocket, etc.)
- Authentication and authorization mechanisms
- Deployment topologies and infrastructure requirements
- Language-specific implementation details

### 1.2 Design Goals

IRPC aims to:

- **Eliminate boilerplate explicitly routing network communication**
- **Bind isomorphic function signatures explicitly** regardless of execution location
- **Execute transport-agnostic implementations**
- **Enforce type contract constraints** across boundaries
- **Optimize performance** through network payload batching

## 2. Core Concepts

### 2.1 IRPC Function

An IRPC function is a named, asynchronous function with a fixed signature that can be executed locally or remotely. The function signature remains identical regardless of execution context.

**Properties:**

- **Name**: Unique identifier within a namespace
- **Parameters**: Ordered list of serializable values
- **Return Value**: Promise that resolves to a serializable value or rejects with an error
- **Isomorphism**: Same signature and behavior locally and remotely

### 2.2 Stub and Handler

- **Stub**: Client-side callable proxy with the same signature as the remote function
- **Handler**: Server-side implementation containing the business logic

Both stub and handler MUST share identical type signatures.

### 2.3 Factory

A factory is a callable interface that:

- Creates IRPC function definitions
- Registers handler implementations
- Manages function discovery and routing
- Configures runtime behavior

### 2.4 Transport

A transport is a pluggable mechanism that:

- Carries serialized IRPC requests and responses
- Handles network-specific details
- Maintains connection management
- Provides protocol-agnostic communication
- Includes routing functionality to map requests to handlers

### 2.5 Module

A module represents a namespace for IRPC functions with:

- Name and version identification
- Transport configuration
- Timeout settings
- Function registry

## 3. Data Model

### 3.1 Primitive Types

IRPC supports the following primitive data types:

- String
- Number (integer and floating-point)
- Boolean
- Null
- Undefined (where applicable in the host language)

### 3.2 Composite Types

IRPC supports:

- **Object**: Key-value pairs with string keys and IRPC data values
- **Array**: Ordered list of IRPC data values

### 3.3 Serialization

All IRPC data MUST be serializable to a format that can be transmitted across the transport layer. Implementations SHOULD use JSON or equivalent format that preserves the data model.

### 3.4 Binary Attachment Pointers

To support non-blocking binary transfers without base64 encoding overhead, implementations MUST normalize binary attachments into pointer descriptors before serialization:

- **File Pointer**: Replaces in-memory file objects during request framing (`type: "IRPC_PACKET_FILE"`).
- **Blob Pointer**: References lazy remote binary resources (`type: "IRPC_PACKET_BLOB"`).

## 4. Wire Protocol

### 4.1 Request Format

```json
{
  "id": "string",
  "name": "string",
  "args": [...],
  "files": [...]
}
```

**Fields:**

- `id`: Unique identifier for the request (string)
- `name`: Name of the IRPC function to invoke (string)
- `args`: Array of arguments to pass to the function
- `files`: Optional array of binary file pointer descriptors extracted during packet encoding

### 4.2 Response Format (IRPCPacketStream)

IRPC supports continuous data streams. Transports yield sequence packets modeling individual events throughout the pipeline's lifecycle.

```json
{
  "id": "abc123",
  "name": "getDashboard",
  "type": "answer",
  "status": "pending",
  "data": { "user": { "name": "John" } },
  "createdAt": 1712638845210
}
```

**Fields:**

- `id`: Correlates back to the originating request (string, REQUIRED).
- `name`: The IRPC function name (string, optional).
- `type`: Packet type — `"call"` (invocation), `"answer"` (initial/final data), `"event"` (mutation delta), `"close"` (terminal).
- `status`: Execution state — `"pending"`, `"success"`, `"error"`, `"idle"`, `"aborted"`.
- `data`: The payload — full state for `answer` packets, mutation descriptor for `event` packets (optional).
- `error`: Error details with `code` and `message` (optional, present when `status` is `"error"`).
- `createdAt`: Server-side Unix timestamp in milliseconds when the packet was created (optional).
- `arrivedAt`: Client-side Unix timestamp in milliseconds when the packet was received (optional, stamped by the client).

**Constraints:**

- `id` MUST be identical across all packets belonging to the same request.
- Transports MUST keep the call open until a terminal packet arrives (`status: "success"`, `status: "error"`, or `status: "aborted"`).

### 4.3 Batch Protocol

Transports MUST support batch aggregation, structurally packaging multiple IRPC request executions physically inside unified arrays concurrently before pipeline processing begins.

**Batch Request:**

```json
[
  {"id": "1", "name": "generatePoem", "args": [...]},
  {"id": "2", "name": "getUser", "args": [...]}
]
```

**Batch Response (Stream Yielding):**

Batch responses DO NOT resolve as static monolithic arrays. Implementations MUST push individual `IRPCPacketStream` sequence packets over the wire as data buffers accumulate individually per-endpoint.

```json
{"id": "1", "name": "generatePoem", "status": "pending", "data": "Deep"}
{"id": "2", "name": "getUser", "status": "success", "data": { ... }}
{"id": "1", "name": "generatePoem", "status": "pending", "data": "Deep in..."}
{"id": "1", "name": "generatePoem", "status": "success", "data": "Deep in Space!"}
```

Reactively streaming individual sequential chunks empowers front-end client components to proxy and track long-lived server processes without blocking concurrent thread operations or requiring manual network orchestration.

## 5. Function Specification

### 5.1 Function Definition

An IRPC function is defined by the following abstract structure (shown in illustrative syntax as an example):

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
interface IRPCSpec {
  name: string;
  schema?: {
    input?: ValidationSchema[];
    output?: ValidationSchema;
  };
  description?: string;
  stream?: boolean;          // Auto-detected if init is provided
  ttl?: number;              // Maximum stream lifetime in milliseconds
  init?: () => unknown;      // Initial data factory for stream stubs
  coalesce?: boolean;        // Request deduplication flag
  maxAge?: number;           // Cache duration in milliseconds
}
```

### 5.2 Validation Schema

Validation schemas are OPTIONAL and MUST NOT affect function signatures. They MAY be used for:

- Input validation before handler execution
- Output validation before response transmission
- Documentation generation
- Development tooling

Validation errors SHOULD be surfaced as transport errors.

### 5.3 Reader Execution Modes

Client callable stubs MUST expose standard asynchronous resolution alongside reactive execution modes:

- Static unary execution (`once`)
- Eager reactive execution tracking dependency triggers (`with`)
- Lazy conditional execution (`when`)
- Imperative manual dispatching (`later`)

## 6. Transport Interface

### 6.1 Transport Contract

All transports MUST implement the following interface (shown in illustrative syntax as an example):

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
interface IRPCTransport {
  send(calls: IRPCCall[]): Promise<IRPCResponse[]>;
}
```

### 6.2 Routing Functionality

Transports MUST include routing capabilities that:

- Map incoming requests by name to registered handlers
- Validate request format and parameters
- Handle error propagation
- Support request/response correlation

### 6.3 Call Management

Transports MUST:

- Accept arrays of calls for batching
- Preserve request-response correlation
- Handle network errors appropriately
- Support timeout management

### 6.4 Streaming Responses

Transports MUST expose bidirectional/continuous response pipelines. Because requests output sequences of `IRPCPacketStream` yields terminating upon `IRPC_STATUS` SUCCESS/ERROR configurations, transports inherently map single execution variables across complex temporal streams, bypassing external WebSockets requirements for basic server-push configurations.

### 6.5 Stream Lifecycle

Transports and routers MUST govern streaming teardowns through three boundaries:

- **Time-To-Live (TTL)**: Routers MUST abort the active controller if the specification's `ttl` bound is exceeded.
- **Context Signals**: Routers MUST mount cancellation signals mapped to the request context.
- **Client Cancellation**: Transports MUST dispatch cancellation payloads when requested by the client. Routers receiving these payloads MUST trigger termination and release mapped resources.

## 7. Factory Interface

### 7.1 Factory Methods

Factories MUST expose the following interface (shown in illustrative syntax as an example):

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
interface IRPCFactory {
  // Declare callable function stub
  declare<F>(spec: IRPCSpec): F;

  // Declare entity CRUD endpoints
  crud<T>(name: string, seed: () => T): CrudStubs<T>;

  // Exclude specific methods from stub exports
  exclude<S, E>(stubs: S, keys: E[]): Omit<S, E>;

  // Register handler implementation
  construct<F>(irpc: F, handler: F): void;

  // Register a per-function hook
  hook<F>(stub: F, handler: (req: IRPCRequest) => void | Promise<void>): void;

  // Resolve hooks for a request
  resolveHooks(req: IRPCRequest): Promise<void>;

  // Configure transport
  use(transport: IRPCTransport): void;

  // Get function specification
  get(name: string): IRPCSpec;

  // Configure module settings
  configure(config: Partial<IRPCModule>): void;

  // Invalidate cached responses
  invalidate(stub: unknown, ...args: unknown[]): void;

  // Resolve request to handler
  resolve<R>(req: IRPCRequest): Promise<R>;

  // Get namespace information
  get namespace(): IRPCNamespace;
}
```

### 7.2 Namespace Management

Factories MUST support namespacing to avoid function name collisions (shown in illustrative syntax as an example):

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
interface IRPCNamespace {
  name: string;
  version: string;
  description?: string;
}
```

### 7.3 Entity CRUD Automation

When provided an entity identifier and default state factory via `.crud()`, implementations MUST automate the declaration of four standard procedure endpoints: `get`, `create`, `update`, and `delete`.

## 8. Global Store (`IRPCStore`)

### 8.1 Singleton Registry

Implementations MUST expose a global `IRPC_STORE` singleton that acts as a centralized registry for live lifecycle observation. All package registrations, router bindings, and active calls MUST be tracked by this store.

### 8.2 Tracked Sets

The store MUST maintain the following live tracking sets:

| Property | Type | Description |
|---|---|---|
| `packages` | `Set<Package>` | All registered IRPC packages. |
| `routers` | `Set<Router>` | All active transport routers. |
| `calls` | `Set<Stream>` | All running in-flight streams. |

### 8.3 Event Subscription

The store MUST expose a `.subscribe()` method that emits events for lifecycle transitions:

```typescript
// Example illustrative syntax
IRPC_STORE.subscribe((event) => {
  // event.type: 'register' | 'route' | 'queue' | 'dequeue' | 'error'
  // event.detail: the affected package, router, call, or exception
});
```

| Event | Trigger |
|---|---|
| `register` | A new package or router is registered. |
| `route` | A router begins resolving a request batch. |
| `queue` | A new call stream is added to the in-flight set. |
| `dequeue` | A call stream resolves or terminates and is removed from the in-flight set. |
| `error` | A system exception or transport failure is broadcast. |

## 9. Execution Model

### 9.1 Call Flow

1. **Client Invocation**: Stub function called with arguments
2. **Request Creation**: Request object created with unique ID
3. **Batching**: Request queued for batch transmission
4. **Transport**: Batch sent via configured transport
5. **Routing**: Request routed to appropriate handler by transport
6. **Handler Execution**: Business logic executed
7. **Response Creation**: Response object created
8. **Transport Return**: Response transmitted back
9. **Promise Resolution**: Client promise resolved or rejected

### 9.2 Error Taxonomy and Semantics

Errors MUST propagate across boundaries preserving error codes and diagnostic context. Implementations MUST categorize failures into standardized domains:

- **Stub Error**: Invalid declarations, duplicate names, or missing specifications.
- **Handler Error**: Missing or unconstructed server handler implementations.
- **Resolve Error**: Procedure resolution or validation failures.
- **Transport Error**: Malformed packets, missing transports, or network failures.
- **Call Error**: Execution timeouts or abortion signals.
- **Crud Error**: Invalid entity operations or primary key failures.
- **Hook Error**: Interceptor execution rejections.

### 9.3 Timeout Management

Factories MUST support configurable timeouts for remote calls. Timeouts SHOULD result in promise rejection.

## 10. Batching and Optimization

### 10.1 Automatic Batching

Implementations SHOULD batch multiple IRPC calls made within a short time window to reduce network overhead.

### 10.2 Connection Reuse

Transports SHOULD reuse connections for multiple requests to improve performance.

### 10.3 Lazy Loading

Implementations SHOULD support lazy loading of IRPC functions to minimize resource usage.

## 11. Context Management

### 11.1 Request Context

Factories MAY support context propagation across request boundaries for:

- Authentication information
- Request tracing
- Custom metadata

### 11.2 Context Interface

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
interface IRPCContext<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
}
```

## 12. Security Considerations

### 12.1 Authentication and Authorization

Authentication and authorization are out-of-band concerns and MUST NOT modify function signatures. Transports MAY enforce authorization via lifecycle hooks.

### 12.2 Input Validation

Implementations SHOULD validate inputs before handler execution to prevent injection attacks and malformed data.

### 12.3 Transport Security

Transports SHOULD support secure communication channels (TLS, WSS, etc.) when operating over untrusted networks.

## 13. Implementation Guidelines

### 13.1 Language-Agnostic Requirements

All IRPC implementations MUST:

- Implement all required interfaces
- Support the defined wire protocol
- Implement the transport interface with routing
- Provide the factory methods
- Support batching and optimization

### 13.2 Type Preservation

Implementations SHOULD preserve type information where the host language supports it, enabling:

- Compile-time validation
- IDE support
- Refactoring safety
- Self-documenting APIs

### 13.3 Error Semantics

Implementations MUST:

- Preserve error messages across boundaries
- Maintain stack traces where possible
- Distinguish between transport and business logic errors

## 14. Conformance

### 14.1 Required Conformance

To be IRPC-compliant, an implementation MUST:

- Implement all required interfaces
- Support the wire protocol exactly
- Maintain isomorphic function signatures
- Handle errors according to this specification
- Include routing within the transport layer

### 14.2 Optional Features

Implementations MAY include:

- Additional validation schemas
- Custom transport protocols
- Advanced optimization strategies
- Enhanced debugging capabilities

## 15. Versioning and Compatibility

### 15.1 Specification Versioning

This specification follows semantic versioning. Major version changes indicate breaking changes to the wire protocol or required interfaces.

### 15.2 Backward Compatibility

Implementations SHOULD maintain backward compatibility within major versions. Changes to the wire protocol require a major version increment.

### 15.3 Feature Detection

Implementations MAY provide feature detection mechanisms to negotiate capabilities between client and server.

## 16. Examples

### 16.1 Function Definition

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
// Define IRPC function
export type ReadFileFn = (path: string, encoding?: string) => Promise<string>;

export const readFile = irpc.declare<ReadFileFn>('readFile', () => '', {
  schema: {
    input: [z.string(), z.string().optional()],
    output: z.string(),
  },
});
```

### 16.2 Handler Implementation

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
// Implement handler
irpc.construct(readFile, async (path, encoding) => {
  return await fs.readFile(path, encoding);
});
```

### 16.3 Client Invocation

```typescript
// Example illustrative syntax - implementations should use language-appropriate syntax
// Invoke remotely
const content = await readFile('file.txt', 'utf8');
```

## 17. Migration Guide

### 17.1 From REST

1. Replace endpoint definitions with IRPC function specifications
2. Convert request/response handling to function signatures
3. Remove manual serialization logic
4. Implement handlers instead of route controllers

### 17.2 From gRPC

1. Replace proto files with IRPC specifications
2. Convert service definitions to function registrations
3. Maintain existing handler logic with updated signatures

## 18. Reference Implementation

The TypeScript implementation in this repository serves as the reference implementation for this specification. Language-specific implementations should follow the same patterns and behaviors.

## 19. Change Log

### v1.0

- Initial specification release
- Defined core concepts and wire protocol
- Established transport interface with routing
- Specified factory interface requirements
- Specified batching and optimization requirements

_This specification is version 1.0. Future revisions must maintain the invariants defined herein unless superseded by a major version with explicit migration guidance._
