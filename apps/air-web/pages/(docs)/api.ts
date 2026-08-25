import { createPackage } from '@irpclib/irpc';
import { httpTransport } from '@/src/api.ts';

export const demoRpc = createPackage({
  name: 'demo',
  version: '1.0.0',
});

demoRpc.use(httpTransport);
