import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';

import pkg from '../../package.json' with { type: 'json' };

export const irpc = createPackage({
  name: pkg.name,
  version: pkg.version,
});

export const transport = new HTTPTransport({
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  endpoint: `/irpc/${irpc.href}`,
});

irpc.use(transport);
