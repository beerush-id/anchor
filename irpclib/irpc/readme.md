# IRPC - Isomorphic Remote Procedure Call

IRPC (Isomorphic Remote Procedure Call) is a revolutionary approach to distributed computing that eliminates the cognitive overhead of network communication. It enables developers to invoke remote functions with the same ergonomics as local function calls, abstracting away the transport layer entirely.

Unlike traditional approaches like REST APIs, GraphQL, or gRPC, IRPC removes the need to think about endpoints, serialization, or transport protocols. You focus on business logic while IRPC handles the communication complexity transparently.

## Learn More

For detailed documentation, visit [https://irpc.anchorlib.dev](https://irpc.anchorlib.dev)

## Quick Start

### Create a Module

```ts
import { createPackage } from '@irpclib/irpc';

const irpc = createPackage({ name: 'my-module', version: '1.0.0' });
```

### Define Functions

```ts
export const greet = irpc.declare<(name: string) => Promise<string>>({
  name: 'greet'
});
```

### Set up Transport (Client-side)

```ts
import { HTTPTransport } from '@irpclib/http';

export const transport = new HTTPTransport(
  {
    baseURL: 'http://localhost:3000',
    endpoint: '/rpc',
  },
  irpc
);
```

### Implement Handlers (Server-side)

```ts
irpc.construct(greet, async (name) => {
  return `Hello, ${name}!`;
});
```

### Server Setup

```ts
import { setContextStore } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'async_hooks';

setContextStore(new AsyncLocalStorage());

Bun.serve({
  routes: {
    [transport.endpoint]: {
      GET: () => new Response('OK'),
      POST: (req) => transport.respond(req),
    }
  },
});
```

### Client Usage

```ts
import { greet } from './my-module';

const message = await greet('World');
console.log(message); // "Hello, World!"
```

## Key Features

- **Isomorphic Design**: Call functions identically on client and server
- **Zero Boilerplate**: No REST endpoints, no GraphQL schemas, no complex serialization
- **Transport Agnostic**: Switch between HTTP, WebSockets, and other transports without changing your business logic
- **End-to-End Type Safety**: Compile-time validation from client to server
- **Performance Optimized**: Intelligent batching and connection reuse

## Core Components

### Module

A module is a container for your IRPC functions. It manages the registry of functions and their implementations.

```ts
const irpc = createPackage({ name: 'fs', version: '1.0.0' });
```

### Function

Functions are the core building blocks of IRPC. They define the interface for remote calls and can be implemented on the server side.

```ts
export const readFile = irpc.declare<(path: string) => Promise<string>>({
  name: 'readFile',
});
```

### Transport

Transports handle the actual communication between client and server. IRPC is transport-agnostic, allowing you to switch between different communication protocols.

```ts
export const transport = new HTTPTransport(
  {
    baseURL: 'http://localhost:3000',
    endpoint: '/rpc',
    timeout: 1000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
```

The transport automatically registers itself with the IRPC module during construction, so there's no need to manually register it.

## Usage

### Client

On the client side, you simply import and call your functions as if they were local:

```ts
import { readFile } from './fs';

console.log(await readFile('/path/to/file'));
```

### Server

On the server side, you implement the actual functionality for your functions:

```ts
import { transport } from './fs';
import { setContextStore } from '@irpclib/irpc';

setContextStore(new AsyncLocalStorage());

Bun.serve({
  routes: {
    [transport.endpoint]: {
      GET: () => {
        return new Response('Ok!');
      },
      POST: (req) => transport.respond(req),
    }
  },
});
```

#### Handler

Handlers are the actual implementations of your remote functions:

```ts
irpc.construct(readFile, async (path) => {
  // Implementation goes here
});
```
