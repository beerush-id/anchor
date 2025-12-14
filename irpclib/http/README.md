# IRPC HTTP Transport

The HTTP transport package for IRPC (Isomorphic Remote Procedure Call) provides HTTP-based communication between IRPC clients and servers.

## Learn More

For detailed documentation, visit [https://irpc.anchorlib.dev](https://irpc.anchorlib.dev)

## Quick Start

### Installation

```bash
npm install @irpclib/http
```

### Usage

```ts
import { createModule } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

const irpc = createModule({ name: 'my-api', version: '1.0.0' });

const transport = new HTTPTransport(
  {
    baseURL: 'http://localhost:3000',
    endpoint: '/rpc',
  },
  irpc
);
```

### Server Integration

```ts
Bun.serve({
  routes: {
    [transport.endpoint]: {
      GET: () => new Response('OK'),
      POST: (req) => transport.respond(req),
    }
  },
});
```

## Features

- **HTTP-based Transport**: Seamless communication over HTTP/HTTPS
- **Batch Request Support**: Efficiently batch multiple calls into single HTTP requests
- **Middleware Support**: Add custom middleware for authentication, logging, and more
- **Streaming Responses**: Stream responses for better performance with multiple concurrent calls
- **Error Handling**: Comprehensive error handling with detailed error reporting
- **Type Safety**: Full TypeScript support with end-to-end type checking

## License

MIT