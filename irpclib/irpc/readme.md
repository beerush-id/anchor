# IRPC - Isomorphic Remote Procedure Call

IRPC (Isomorphic Remote Procedure Call) is a revolutionary approach to distributed computing that eliminates the cognitive overhead of network communication. It enables developers to invoke remote functions with the same ergonomics as local function calls, abstracting away the transport layer entirely.

Unlike traditional approaches like REST APIs, GraphQL, or gRPC, IRPC removes the need to think about endpoints, serialization, or transport protocols. You focus on business logic while IRPC handles the communication complexity transparently.

## Learn More

For detailed documentation, visit [https://irpc.anchorlib.dev](https://irpc.anchorlib.dev)

## Quick Start

### Create a Package and Transport

```ts
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({ name: 'my-irpc', version: '1.0.0' });
export const transport = new HTTPTransport({
  baseURL: 'http://localhost:3000',
  endpoint: irpc.href
});

irpc.use(transport);
```

### Define Functions

```ts
import { irpc } from './my-irpc';

export const greet = irpc.declare<(name: string) => Promise<string>>({
  name: 'greet'
});
```

### Implement Handlers (Server-side)

```ts
import { irpc } from './my-irpc';

irpc.construct(greet, async (name) => {
  return `Hello, ${name}!`;
});
```

### Server Setup

```ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './my-irpc';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  routes: {
    [transport.endpoint]: {
      GET: () => new Response('OK'),
      POST: (req) => router.resolve(req),
    }
  },
});
```

### Client Usage

```ts
import { greet } from './my-irpc';

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

### Package

A package is a container for your IRPC functions. It manages the registry of functions and their implementations.

```ts
const irpc = createPackage({ name: 'fs', version: '1.0.0' });
```

### Function Declaration

Functions are the core building blocks of IRPC. They define the interface for remote calls and can be implemented on the server side.

```ts
export const readFile = irpc.declare<(path: string) => Promise<string>>({
  name: 'readFile',
});
```

### Transport

Transports handle the actual communication between client and server. IRPC is transport-agnostic, allowing you to switch between different communication protocols.

```ts
import { HTTPTransport } from '@irpclib/http';

export const transport = new HTTPTransport({
  baseURL: 'http://localhost:3000',
  endpoint: '/irpc',
  timeout: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

irpc.use(transport);
```

The transport is registered with the IRPC package using the **use** method.

## Usage

### Client

On the client side, you simply import and call your functions as if they were local:

```ts
import { readFile } from './fs';

console.log(await readFile('/path/to/file'));
```

#### Remote Handler

Handlers are the actual implementations of your remote functions:

```ts
irpc.construct(readFile, async (path) => {
  // Implementation goes here
});
```

### Server

On the server side, you implement communication logic using the router:

```ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  routes: {
    [transport.endpoint]: {
      GET: () => {
        return new Response('Ok!');
      },
      POST: (req) => router.resolve(req),
    }
  },
});
```
