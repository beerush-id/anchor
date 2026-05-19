import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';

export const irpc = createPackage({
  name: 'irpc',
  version: '1.0.0',
});

export const transport = new HTTPTransport({
  endpoint: `/api/${irpc.href}`,
});

irpc.use(transport);
