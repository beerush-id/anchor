import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({
  name: 'irpc',
  version: '1.0.0',
});

export const transport = new HTTPTransport({
  endpoint: `/api/${irpc.href}`,
});

// Credential Seeder, e.g., BYOK from localStorage.
const credSeeder = () => ({
  USER_CUSTOM_KEY: 'my-api-key',
});

transport.sign(credSeeder);

// Uncomment to use HTTP transport
irpc.use(transport);
