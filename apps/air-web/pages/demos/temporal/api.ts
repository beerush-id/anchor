import { createPackage } from '@irpclib/irpc';
import { wsTransport } from '@/src/api.js';

/**
 * Temporal RPC Package
 * Dedicated WebSocket-bound RPC namespace for real-time virtual world and spatial chat.
 */
export const temporalRpc = createPackage({
  name: 'temporal',
  version: '1.0.0',
});

temporalRpc.use(wsTransport);
