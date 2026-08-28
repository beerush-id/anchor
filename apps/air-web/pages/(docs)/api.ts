import { createPackage } from '@irpclib/irpc';
import { httpTransport, wsTransport } from '@/src/api.js';

export const demoRpc = createPackage({
  name: 'demo',
  version: '1.0.0',
});

demoRpc.use(wsTransport);
demoRpc.use(httpTransport);

export { httpTransport, wsTransport };
