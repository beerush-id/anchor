import { AsyncLocalStorage } from 'node:async_hooks';
import { HTTPRouter } from '@irpclib/http';
import { type IRPCContextProvider, setContextProvider } from '@irpclib/irpc';
import { irpc, transport } from '@lib';
import { Glob } from 'bun';

// Set up AsyncLocalStorage as the context provider for IRPC
setContextProvider(new AsyncLocalStorage() as IRPCContextProvider);

// Create a glob pattern to find all constructor files
const constructors = new Glob('**/*constructor.ts');

// Dynamically import all constructor modules
for await (const path of constructors.scan('.')) {
  await import(path);
}

// Initialize the HTTP router with IRPC and transport configurations
const router = new HTTPRouter(irpc, transport);

// Get port from environment or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Start the Bun server
Bun.serve({
  port: PORT,
  routes: {
    [transport.endpoint]: {
      // Health check endpoint
      GET: () => new Response('Ok!'),
      // Main IRPC endpoint that handles all RPC calls
      POST: (req: Request) => router.resolve(req),
    },
  },
});

console.log(`🚀 IRPC server running on http://localhost:${PORT}`);
console.log(`📡 Endpoint: ${transport.endpoint}`);
