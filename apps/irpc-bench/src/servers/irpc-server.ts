import { HTTPRouter, HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';

// Create IRPC package
const irpc = createPackage({ name: 'bench', version: '1.0.0' });
const transport = new HTTPTransport({ endpoint: '/irpc' });
irpc.use(transport);

// Declare hello RPC
export type HelloFn = (name: string) => Promise<string>;
export const hello = irpc.declare<HelloFn>({ name: 'hello' });

// Implement hello RPC
irpc.construct(hello, async (name) => {
  return `Hello ${name}`;
});

// Create router
const router = new HTTPRouter(irpc, transport);

// Start server
export const server = Bun.serve({
  port: 3001,
  routes: {
    [transport.endpoint]: {
      POST: (req: Request) => router.resolve(req),
    },
  },
});

console.log('IRPC server running on :3001');
