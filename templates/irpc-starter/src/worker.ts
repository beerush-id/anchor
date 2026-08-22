import { HTTPRouter } from '@irpclib/http/router';
import { WebSocketRouter } from '@irpclib/ws/router';
import { httpTransport, wsTransport } from '@/lib/module.js';
import '@/constructor.js';

const httpRouter = new HTTPRouter(httpTransport);
const wsRouter = new WebSocketRouter(wsTransport);

export default {
  async fetch(req: Request) {
    if (req.method === 'POST' && req.url.includes(httpTransport.endpoint)) {
      return httpRouter.resolve(req);
    }
    return new Response('Not Found', { status: 404 });
  },
  async upgrade(req: Request) {
    return (message: string | ArrayBuffer, ws: WebSocket) => wsRouter.resolve(message, ws);
  },
};
