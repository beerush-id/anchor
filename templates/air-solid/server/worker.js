import worker from '../dist/server/worker.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/ws/')) {
      if (req.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      try {
        const resolver = await worker.upgrade(req, env);
        
        // Create a WebSocketPair for Cloudflare Workers
        const [client, server] = Object.values(new WebSocketPair());
        server.accept();

        server.addEventListener('message', async (event) => {
          await resolver(event.data, server);
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      } catch (e) {
        console.error('WebSocket upgrade failed:', e);
        return new Response(e.message, { status: 400 });
      }
    }

    return worker.fetch(req, env, ctx);
  },
};
