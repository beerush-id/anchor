# hello-irpc

A production-ready IRPC (Isomorphic Remote Procedure Call) application template built with Bun.

## Features

- ✅ **Type-safe RPC calls** - End-to-end TypeScript
- ✅ **Auto-import constructors** - Zero boilerplate
- ✅ **Automatic versioning** - Synced with package.json
- ✅ **Production-ready** - Docker support included

---

## Quick Start

### Installation

```bash
bun install
```

### Development

```bash
# Start the server
bun run serve

# Build client files (watch mode)
bun run dev
```

Server runs on `http://localhost:3000`

---

## Usage

### Client

```typescript
import { hello } from 'hello-irpc/hello';

const message = await hello('World');
console.log(message); // "Hello World"
```

### Adding New RPCs

1. Create a new directory in `src/rpc/`:

```bash
mkdir -p src/rpc/user
```

2. Create `index.ts` (stub):

```typescript
// src/rpc/user/index.ts
import { irpc } from '@lib';

export type GetUserFn = (id: string) => Promise<{ id: string; name: string }>;

export const getUser = irpc.declare<GetUserFn>({
  name: 'getUser'
});
```

3. Create `constructor.ts` (handler):

```typescript
// src/rpc/user/constructor.ts
import { irpc } from '@lib';
import { getUser } from './index.js';

irpc.construct(getUser, async (id) => {
  return { id, name: 'John Doe' };
});
```

4. Done! The constructor is auto-imported on server start.

---

## Environment Variables

Create a `.env` file:

```env
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
```

---

## Building

```bash
# Build for production
bun run build

# Publish to npm
npm publish
```

**Note:** Only `dist/` is published. Source code and constructors stay private.

---

## Docker

### Build

```bash
docker build -t hello-irpc .
```

### Run

```bash
docker run -p 3000:3000 hello-irpc
```

---

## Project Structure

```
hello-irpc/
├── src/
│   ├── index.ts              # Server entry point
│   ├── lib/
│   │   ├── index.ts          # Exports
│   │   └── module.ts         # IRPC config
│   └── rpc/
│       └── hello/
│           ├── index.ts      # Stub (exported to npm)
│           └── constructor.ts # Handler (server-only)
├── dist/                     # Built output (published to npm)
├── .env.example              # Environment template
├── Dockerfile                # Container config
└── package.json              # Package config
```

---

## How It Works

### Automatic Versioning

The IRPC package version is synced with `package.json`:

```typescript
// lib/module.ts
import pkg from '../../package.json';

export const irpc = createPackage({
  name: pkg.name,      // "hello-irpc"
  version: pkg.version // "1.0.0"
});
```

Endpoint: `/irpc/hello-irpc/1.0.0`

### Auto-Import Constructors

All `*constructor.ts` files are automatically imported:

```typescript
// index.ts
const constructors = new Glob('**/*constructor.ts');

for await (const path of constructors.scan('.')) {
  await import(path);
}
```

No manual imports needed!

---

## License

MIT
