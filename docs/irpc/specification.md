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

1. **Eliminate boilerplate explicitly routing network communication**
2. **Bind isomorphic function signatures explicitly** regardless of execution location
3. **Execute transport-agnostic implementations**
4. **Enforce TypeScript constraints** across boundaries
5. **Optimize performance** through network payload batching

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

## 4. Wire Protocol

### 4.1 Request Format

```json
{
  "id": "string",
  "name": "string",
  "args": [...]
}
```

**Fields:**

- `id`: Unique identifier for the request (string)
- `name`: Name of the IRPC function to invoke (string)
- `args`: Array of arguments to pass to the function

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
- `type`: Packet type — `"answer"` (initial/final data), `"event"` (mutation delta), `"close"` (terminal).
- `status`: Execution state — `"pending"`, `"success"`, `"error"`, `"idle"`.
- `data`: The payload — full state for `answer` packets, mutation descriptor for `event` packets (optional).
- `error`: Error details with `code` and `message` (optional, present when `status` is `"error"`).
- `createdAt`: Server-side Unix timestamp in milliseconds when the packet was created (optional).
- `arrivedAt`: Client-side Unix timestamp in milliseconds when the packet was received (optional, stamped by the client).

**Constraints:**

- `id` MUST be identical across all packets belonging to the same request.
- Transports MUST keep the call open until a terminal packet arrives (`status: "success"` or `status: "error"`).

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
{"id": "1", "name": "generatePoem", "status": 2, "data": "Deep"}
{"id": "2", "name": "getUser", "status": 1, "data": { ... }}
{"id": "1", "name": "generatePoem", "status": 2, "data": "Deep in..."}
{"id": "1", "name": "generatePoem", "status": 1, "data": "Deep in Space!"}
```

Reactively streaming individual sequential chunks empowers front-end client components to proxy and track long-lived server processes without blocking concurrent thread operations or requiring manual network orchestration.

## 5. Function Specification

### 5.1 Function Definition

An IRPC function is defined by the following structure (shown in TypeScript syntax as an example):

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
interface IRPCSpec {
  name: string;
  schema?: {
    input?: ValidationSchema[];
    output?: ValidationSchema;
  };
  description?: string;
}
```

### 5.2 Validation Schema

Validation schemas are OPTIONAL and MUST NOT affect function signatures. They MAY be used for:

- Input validation before handler execution
- Output validation before response transmission
- Documentation generation
- Development tooling

Validation errors SHOULD be surfaced as transport errors.

## 6. Transport Interface

### 6.1 Transport Contract

All transports MUST implement the following interface (shown in TypeScript syntax as an example):

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
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

1. **Time-To-Live (TTL)**: Routers MUST abort the active `AbortController` if the specification's `ttl` bound is exceeded.
2. **Context Signals**: Routers MUST mount an `AbortSignal` mapped to the request under `IRPC_BASE_CONTEXT.ABORT_CONTROLLER`.
3. **Client Cancellation**: Transports MUST dispatch `CANCEL` payloads when requested by the client. Routers receiving these payloads MUST trigger the `AbortController` and release the request mapped.

## 7. Factory Interface

### 7.1 Factory Methods

Factories MUST expose the following interface (shown in TypeScript syntax as an example):

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
interface IRPCFactory {
  // Create IRPC function
  <F>(spec: IRPCSpec): F;

  // Register handler implementation
  construct<F>(irpc: F, handler: F): void;

  // Configure transport
  use(transport: IRPCTransport): void;

  // Get function specification
  get(name: string): IRPCSpec;

  // Configure module settings
  configure(config: Partial<IRPCModule>): void;

  // Resolve request to handler
  resolve<R>(req: IRPCRequest): Promise<R>;

  // Get namespace information
  get namespace(): IRPCNamespace;
}
```

### 7.2 Namespace Management

Factories MUST support namespacing to avoid function name collisions (shown in TypeScript syntax as an example):

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
interface IRPCNamespace {
  name: string;
  version: string;
  description?: string;
}
```

## 8. Execution Model

### 8.1 Call Flow

1. **Client Invocation**: Stub function called with arguments
2. **Request Creation**: Request object created with unique ID
3. **Batching**: Request queued for batch transmission
4. **Transport**: Batch sent via configured transport
5. **Routing**: Request routed to appropriate handler by transport
6. **Handler Execution**: Business logic executed
7. **Response Creation**: Response object created
8. **Transport Return**: Response transmitted back
9. **Promise Resolution**: Client promise resolved or rejected

### 8.2 Error Handling

Errors MUST be propagated through the transport layer as error strings in the response. Implementations SHOULD preserve error context where possible.

### 8.3 Timeout Management

Factories MUST support configurable timeouts for remote calls. Timeouts SHOULD result in promise rejection.

## 9. Batching and Optimization

### 9.1 Automatic Batching

Implementations SHOULD batch multiple IRPC calls made within a short time window to reduce network overhead.

### 9.2 Connection Reuse

Transports SHOULD reuse connections for multiple requests to improve performance.

### 9.3 Lazy Loading

Implementations SHOULD support lazy loading of IRPC functions to minimize resource usage.

## 10. Context Management

### 10.1 Request Context

Factories MAY support context propagation across request boundaries for:

- Authentication information
- Request tracing
- Custom metadata

### 10.2 Context Interface

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
interface IRPCContext<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
}
```

## 11. Security Considerations

### 11.1 Authentication and Authorization

Authentication and authorization are out-of-band concerns and MUST NOT modify function signatures. Transports MAY enforce authorization via lifecycle hooks.

### 11.2 Input Validation

Implementations SHOULD validate inputs before handler execution to prevent injection attacks and malformed data.

### 11.3 Transport Security

Transports SHOULD support secure communication channels (TLS, WSS, etc.) when operating over untrusted networks.

## 12. Implementation Guidelines

### 12.1 Language-Agnostic Requirements

All IRPC implementations MUST:

1. Implement all required interfaces
2. Support the defined wire protocol
3. Implement the transport interface with routing
4. Provide the factory methods
5. Support batching and optimization

### 12.2 Type Preservation

Implementations SHOULD preserve type information where the host language supports it, enabling:

- Compile-time validation
- IDE support
- Refactoring safety
- Self-documenting APIs

### 12.3 Error Semantics

Implementations MUST:

- Preserve error messages across boundaries
- Maintain stack traces where possible
- Distinguish between transport and business logic errors

## 13. Conformance

### 13.1 Required Conformance

To be IRPC-compliant, an implementation MUST:

1. Implement all required interfaces
2. Support the wire protocol exactly
3. Maintain isomorphic function signatures
4. Handle errors according to this specification
5. Include routing within the transport layer

### 13.2 Optional Features

Implementations MAY include:

- Additional validation schemas
- Custom transport protocols
- Advanced optimization strategies
- Enhanced debugging capabilities

## 14. Versioning and Compatibility

### 14.1 Specification Versioning

This specification follows semantic versioning. Major version changes indicate breaking changes to the wire protocol or required interfaces.

### 14.2 Backward Compatibility

Implementations SHOULD maintain backward compatibility within major versions. Changes to the wire protocol require a major version increment.

### 14.3 Feature Detection

Implementations MAY provide feature detection mechanisms to negotiate capabilities between client and server.

## 15. Examples

### 15.1 Function Definition

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
// Define IRPC function
export type ReadFileFn = (path: string, encoding?: string) => Promise<string>;

export const readFile = irpc.declare<ReadFileFn>({
  name: 'readFile',
  schema: {
    input: [z.string(), z.string().optional()],
    output: z.string(),
  },
});
```

### 15.2 Handler Implementation

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
// Implement handler
irpc.construct(readFile, async (path, encoding) => {
  return await fs.readFile(path, encoding);
});
```

### 15.3 Client Invocation

```typescript
// Example TypeScript syntax - implementations should use language-appropriate syntax
// Invoke remotely
const content = await readFile('file.txt', 'utf8');
```

## 16. Migration Guide

### 16.1 From REST

1. Replace endpoint definitions with IRPC function specifications
2. Convert request/response handling to function signatures
3. Remove manual serialization logic
4. Implement handlers instead of route controllers

### 16.2 From gRPC

1. Replace proto files with IRPC specifications
2. Convert service definitions to function registrations
3. Maintain existing handler logic with updated signatures

## 17. Reference Implementation

The TypeScript implementation in this repository serves as the reference implementation for this specification. Language-specific implementations should follow the same patterns and behaviors.

## 18. Change Log

### v1.0

- Initial specification release
- Defined core concepts and wire protocol
- Established transport interface with routing
- Specified factory interface requirements
- Specified batching and optimization requirements

_This specification is version 1.0. Future revisions must maintain the invariants defined herein unless superseded by a major version with explicit migration guidance._
