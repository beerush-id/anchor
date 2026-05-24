import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';
import { WebSocketTransport } from '@irpclib/ws';

export const irpc = createPackage({
  name: 'irpc',
  version: '1.0.0',
});

export const transport = new HTTPTransport({
  endpoint: `/api/${irpc.href}`,
});

export const wsTransport = new WebSocketTransport({
  url: `/ws/${irpc.href}`,
});

// Credential Seeder.
// You can use this to seed your transport with credentials,
// such as getting BYOK from localStorage.
const credSeeder = () => ({
  USER_CUSTOM_KEY: 'my-api-key',
});

// Sign the transport with the credential seeder.
transport.sign(credSeeder);
wsTransport.sign(credSeeder);

// Uncomment to use HTTP transport
irpc.use(transport);

// Uncomment to use WebSocket transport
// irpc.use(wsTransport);
