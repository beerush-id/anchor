---
title: "Getting Started with IRPC"
description: "Learn how to set up IRPC in your project, create your first remote function, and start making type-safe remote calls."
keywords:
  - irpc
  - getting started
  - tutorial
  - setup
  - installation
---

# Getting Started

This guide will walk you through setting up IRPC in your project and creating your first remote function.

## Quick Start

The fastest way to get started is using the IRPC Bun starter template:

```bash
npx degit beerush-id/anchor/templates/irpc-bun-starter my-api
cd my-api
bun install
bun run serve
```

Server runs on `http://localhost:3000`

The template includes:
- Pre-configured IRPC package and HTTP transport
- Example IRPC functions
- Server setup with middleware
- TypeScript configuration
- Docker support


## Manual Setup

### Installation

```bash
npm install @irpclib/irpc @irpclib/http
```

### Project Structure

```
my-api/
├── lib/
│   └── module.ts          # Package and transport configuration
├── rpc/
│   └── hello/
│       ├── index.ts       # Function declaration
│       └── constructor.ts # Handler implementation
├── server.ts              # Server setup
└── client.ts              # Client usage
```

### Step 1: Create Package

Create a package to namespace your IRPC functions.

```typescript
// lib/module.ts
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

export const irpc = createPackage({ 
  name: 'my-api', 
  version: '1.0.0' 
});

export const transport = new HTTPTransport({
  endpoint: `/irpc/${irpc.href}`,
});

irpc.use(transport);
```

The package name and version create a unique namespace (`my-api/1.0.0`). The transport handles network communication.

### Step 2: Declare Functions

Declare the function signature that both client and server will use.

```typescript
// rpc/hello/index.ts
import { irpc } from '../lib/module.js';

export type HelloFn = (name: string) => Promise<string>;

export const hello = irpc.declare<HelloFn>({
  name: 'hello'
});
```

The function signature is isomorphic—it works the same on client and server.

### Step 3: Implement Handler (Server)

Implement the actual logic on the server.

```typescript
// rpc/hello/constructor.ts
import { irpc } from '../lib/module.js';
import { hello } from './index.js';

irpc.construct(hello, async (name) => {
  return `Hello ${name}`;
});
```

The handler receives the same arguments as the declared function.

### Step 4: Setup Server

Configure the server to handle IRPC requests.

```typescript
// server.ts
import { setContextProvider } from '@irpclib/irpc';
import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { irpc, transport } from './lib/module.js';
import './rpc/hello/constructor.js'; // Import handlers

setContextProvider(new AsyncLocalStorage());

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith(transport.endpoint) && req.method === 'POST') {
      return router.resolve(req);
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log('Server running on http://localhost:3000');
```

The router automatically handles batching, routing, and streaming responses.

### Step 5: Use on Client

Call the function like any local async function.

```typescript
// client.ts
import { hello } from './rpc/hello/index.js';

const message = await hello('John');
console.log(message); // "Hello John"
```

No fetch calls, no manual serialization—just call the function.

## Advanced Features

### Caching

Cache responses to reduce network calls.

```typescript
export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser',
  maxAge: 60000, // Cache for 60 seconds
});
```

Subsequent calls with the same arguments return cached data.

### Timeout

Set per-function timeouts.

```typescript
export const slowQuery = irpc.declare<SlowQueryFn>({
  name: 'slowQuery',
  timeout: 30000, // 30 second timeout
});
```

Calls exceeding the timeout will reject with an error.

### Validation (Optional)

Use Zod for runtime validation.

```typescript
import { z } from 'zod';

export const createUser = irpc.declare({
  name: 'createUser',
  schema: {
    input: [z.object({
      name: z.string(),
      email: z.string().email(),
    })],
    output: z.object({
      id: z.string(),
      name: z.string(),
    }),
  },
});
```

Invalid inputs or outputs will throw validation errors.

### Context

Access request context in handlers.

```typescript
import { getContext, setContext } from '@irpclib/irpc';

// In middleware
router.use(async () => {
  const req = getContext<Request>('request');
  const userId = req.headers.get('x-user-id');
  setContext('userId', userId);
});

// In handler
irpc.construct(getProfile, async () => {
  const userId = getContext('userId');
  return await db.users.findById(userId);
});
```

Context is automatically scoped to each request.

## Multiple Functions

Create multiple functions in the same package.

```typescript
// rpc/users/index.ts
export const getUser = irpc.declare<GetUserFn>({ name: 'getUser' });
export const createUser = irpc.declare<CreateUserFn>({ name: 'createUser' });
export const updateUser = irpc.declare<UpdateUserFn>({ name: 'updateUser' });

// rpc/users/constructor.ts
irpc.construct(getUser, async (id) => { /* ... */ });
irpc.construct(createUser, async (data) => { /* ... */ });
irpc.construct(updateUser, async (id, data) => { /* ... */ });
```

All functions share the same transport and batching.

## Automatic Batching

When you call multiple functions simultaneously, they're automatically batched.

```typescript
const [user, posts, stats] = await Promise.all([
  getUser('123'),
  getPosts('123'),
  getStats('123'),
]);
```

This sends **1 HTTP request** instead of 3, with responses streaming back as they complete.

## Distribution

IRPC supports publishing your function stubs to NPM while keeping handlers private on the server.

### Publishing to NPM

Configure your `package.json` to publish only the `dist/` directory:

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./*": "./dist/rpc/*"
  },
  "files": ["dist"]
}
```

### Excluding Server Code

Use `.npmignore` to exclude server-side code:

```
# Source code (keep only dist/)
src

# Server files
**/constructor.ts
**/constructor.js

# Environment
.env
.env.example
```

### Build and Publish

```bash
# Build client stubs
npm run build

# Publish to NPM
npm publish
```

### Client Usage

Clients install your package and use the stubs:

```bash
npm install my-api
```

```typescript
import { getUser, createUser } from 'my-api/user';

const user = await getUser('123');
```

The stubs automatically connect to your server endpoint. Handlers remain private on your server.

## Next Steps

- [Comparison](/irpc/comparison) - See how IRPC compares to alternatives
- [HTTP Transport](/irpc/transports/http-transport) - Configure transport options
- [Specification](/irpc/specification) - Full protocol details
