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
import { createPackage } from '@irpclib/irpc';
import { HTTPTransport } from '@irpclib/http';

const irpc = createPackage({ name: 'my-api', version: '1.0.0' });

const transport = new HTTPTransport({
  baseURL: 'http://localhost:3000',
  endpoint: `/api/${irpc.href}`, // Recommended to use irpc.href for semantic versioning
});

irpc.use(transport);
```

**Note**: It's recommended to use `irpc.href` as part of the endpoint path to maintain semantic versioning. This ensures that client and server versions are aligned, helping prevent compatibility issues.

### Server Integration

```ts
import { HTTPRouter } from '@irpclib/http';

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

## Features

- **HTTP-based Transport**: Seamless communication over HTTP/HTTPS
- **Batch Request Support**: Efficiently batch multiple calls into single HTTP requests
- **Middleware Support**: Add custom middleware for authentication, logging, and more
- **Streaming Responses**: Stream responses for better performance with multiple concurrent calls
- **Error Handling**: Comprehensive error handling with detailed error reporting
- **Type Safety**: Full TypeScript support with end-to-end type checking

## API Reference

### HTTPTransport

The main transport class for HTTP communication.

```ts
const transport = new HTTPTransport(config: HTTPTransportConfig);
```

Configuration options:
- `baseURL`: The base URL for all HTTP requests
- `endpoint`: The specific endpoint path (defaults to '/irpc')
- `headers`: Custom headers to include in requests
- `timeout`: Request timeout in milliseconds
- `debounce`: Debounce time for batching requests

### HTTPRouter

Handles routing of IRPC requests on the server side.

```ts
const router = new HTTPRouter(module: IRPCPackage, transport: HTTPTransport, config?: Partial<HTTPResolveConfig>);
```

Methods:
- `use(middleware: HTTPMiddleware)`: Add middleware to the router
- `resolve(req: Request)`: Process incoming requests and return a Response

## Best Practices

### Semantic Versioning

It's recommended to use `irpc.href` in your endpoint path to maintain semantic versioning between client and server:

```ts
const irpc = createPackage({ name: 'my-api', version: '1.0.0' });
const transport = new HTTPTransport({
  baseURL: 'http://localhost:3000',
  endpoint: `/api/${irpc.href}`, // Results in '/api/my-api/1.0.0'
});
```

This approach ensures version alignment and helps prevent compatibility issues between client and server.

## License

MIT