import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { httpTransport, irpc, wsTransport } from '@/lib/module.js';
import '@/constructor.js';

const httpRouter = new HTTPRouter(httpTransport);
const wsRouter = new WebSocketRouter(wsTransport);

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname.includes(irpc.href)) {
      return httpRouter.resolve(req);
    }
    return new Response('Not Found', { status: 404 });
  },
  async upgrade(req: Request) {
    return (message: string | ArrayBuffer, ws: WebSocket) => wsRouter.resolve(message, ws);
  },
};
