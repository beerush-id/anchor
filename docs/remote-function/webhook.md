---
title: 'WebHooks'
description: 'Handling incoming REST Webhooks by intercepting and translating them into IRPC executions at the server edge.'
---

# WebHooks

A **webhook** is an incoming HTTP request from a third-party service (like Stripe or GitHub) that delivers real-time data to your server. Because these services send standard REST JSON payloads, they cannot directly communicate with the IRPC transport layer, which strictly enforces a deterministic `FormData` and `NDJSON` protocol.

While the [Transports](/remote-function/transport) page covers standard client-server communication, this page explains how to intercept incoming REST requests at the server edge and seamlessly translate them into IRPC function executions without compromising protocol purity.

## Declaring a Webhook

Webhook stubs are declared just like standard IRPC functions, but they must follow one strict rule: **they must accept exactly one argument**.

Because the incoming webhook is a single JSON object, the IRPC function must mirror this shape so the router can map the payload directly into the function's first argument.

```typescript
// rpc/webhooks/index.ts
import { irpc } from '@lib/module.js';

export type StripeWebhookFn = (payload: any) => Promise<void>;
export const stripeWebhook = irpc.declare<StripeWebhookFn>('stripeWebhook', () => undefined);
```

The implementation handles the business logic exactly like any other function:

```typescript
// rpc/webhooks/constructor.ts
import { stripeWebhook } from './index.js';
import { irpc } from '@lib/module.js';

irpc.construct(stripeWebhook, async (payload) => {
  // Execute business logic with the payload
  console.log('Received Stripe event:', payload.type);
});
```

::: tip Webhook Validation

In most cases, IRPC's [Validation](./function#validation) will be enough to validate the incoming requests. However, if you can't guarantee the shape of the incoming requests, you should **always** validate the incoming requests yourself before passing to the resolver.

You can also use [Spec Hooks](./handler#spec-hooks-per-function) to intercept the incoming requests and validate them.

:::

## Server Adapter

The translation layer belongs directly in your server entry point. You must intercept the webhook route *before* it reaches the standard IRPC handler. 

The IRPC router provides two APIs to handle the translation depending on your server runtime.

### Resolving Request

Use **`router.resolveRest()`** API in modern edge environments (**Bun**, **Cloudflare Workers**, **Next.js Edge**, **SvelteKit**) that expose a native web `Request` object. The router will automatically parse the HTTP request, extract the JSON body, and route it to the target function.

```typescript
router.resolveRest(
  req: Request,
  name: string,
  initContext?: [string | symbol, unknown][],
  builder?: (body: any, init?: ResponseInit) => Response
): Promise<Response>
```

| Parameter | Description |
|-----------|-------------|
| `req` | The native web `Request` object. |
| `name` | The exact wire name of the registered IRPC function. |
| `initContext` | Optional context tuples seeded into the request (e.g., tokens). |
| `builder` | Optional function to override the default JSON response. |

```typescript
// server.ts (Bun / Edge)
import { HTTPRouter } from '@irpclib/http/router';
import { irpc, transport } from './lib/module.js';

const router = new HTTPRouter(irpc, transport);

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Standard IRPC Route
    if (url.pathname === transport.endpoint && req.method === 'POST') {
      return router.resolve(req, [['token', req.headers.get('authorization')]]);
    }

    // 2. Incoming Webhook Adapter Route
    if (url.pathname.startsWith('/rest/') && req.method === 'POST') {
      const name = url.pathname.replace('/rest/', '');
      return router.resolveRest(req, name, [['token', req.headers.get('authorization')]]);
    }

    return new Response('Not Found', { status: 404 });
  }
});
```

### Resolving JSON

Use **`router.resolveJson()`** API in legacy Node.js frameworks (**Express**, **Fastify**) where middleware like `express.json()` consumes the stream and exposes a parsed `req.body`.

```typescript
router.resolveJson(
  body: any,
  name: string,
  initContext?: [string | symbol, unknown][],
  builder?: (body: any, init?: ResponseInit) => Response
): Promise<Response>
```

| Parameter | Description |
|-----------|-------------|
| `body` | The pre-parsed JSON object (e.g., `req.body`). |
| `name` | The exact wire name of the registered IRPC function. |
| `initContext` | Optional context tuples seeded into the request. |
| `builder` | Optional function to override the default JSON response. |

```typescript
// server.ts (Express)
import express from 'express';
import { HTTPRouter } from '@irpclib/http/router';
import { irpc, transport } from './lib/module.js';

const router = new HTTPRouter(irpc, transport);
const app = express();

// Middleware parses the body
app.use(express.json());

app.post('/rest/:name', async (req, res) => {
  const { name } = req.params;
  
  const response = await router.resolveJson(req.body, name, [['token', req.headers.authorization]]);
  
  // Translate the Web Response back to Express
  res.status(response.status).json(await response.json());
});
```

## Response Builder

Both APIs accept an optional `builder` to override the standard JSON output. Webhook providers often require a specific HTTP status code (like `200 OK`) or plain text to acknowledge receipt.

```typescript
const builder = (body: any, init?: ResponseInit) => {
  // Stripe requires a 200 OK plain text response
  return new Response('OK', { status: 200 });
};

// Using the custom builder
router.resolveRest(req, name, context, builder);
```
