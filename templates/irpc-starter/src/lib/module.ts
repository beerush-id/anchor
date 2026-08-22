import pkg from '../../package.json' with { type: 'json' };
import { HTTPTransport } from '@irpclib/http';
import { createPackage } from '@irpclib/irpc';
import { WebSocketTransport } from '@irpclib/ws';

export const irpc = createPackage({
  name: pkg.name,
  version: pkg.version,
});

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const wsUrl = baseUrl.replace(/^http/, 'ws');

export const httpTransport = new HTTPTransport({ endpoint: `${baseUrl}/irpc/${irpc.href}` });
export const wsTransport = new WebSocketTransport({ url: `${wsUrl}/ws/${irpc.href}` });

// Switch to `wsTransport` to experience near-0 latency.
irpc.use(httpTransport);
