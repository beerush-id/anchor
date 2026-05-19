import '@irpclib/irpc/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { decodeCookies, getContext, setCookieContext } from '@anchorlib/solid';
import { HTTPRouter } from '@irpclib/http/router';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { irpc, transport } from './src/lib/module.js';

// Import IRPC Handlers.
import './src/pages/constructor.js';
import { IRPC_STORE } from '@irpclib/irpc';

const rpcRouter = new HTTPRouter(irpc, transport);

IRPC_STORE.subscribe(() => {
  IRPC_STORE.print();
});

// Provide CookieJar to the IRPC handlers.
rpcRouter.use(() => {
  const cookieJar = decodeCookies(getContext('cookie', ''));
  setCookieContext(cookieJar);
});

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  // Handle IRPC requests
  app.post(transport.endpoint, express.text({ type: '*/*' }), async (req, res, next) => {
    try {
      const fullUrl = `${req.headers.origin}${req.originalUrl}`;
      const webReq = new Request(fullUrl, {
        method: 'POST',
        headers: req.headers as Record<string, string>,
        body: req.body || '',
      });

      // Resolve the calls and seed with cookie.
      const webRes = await rpcRouter.resolve(webReq, [['cookie', req.headers?.cookie]]);
      webRes.headers.forEach((v, k) => res.setHeader(k, v));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.status(webRes.status);

      Readable.fromWeb(webRes.body as never).pipe(res);
    } catch (e) {
      next(e);
    }
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;

      // @ts-ignore
      let template = await fs.readFile(path.resolve((import.meta as any).dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);

      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
      const { html, head, redirect } = await render(url, req.headers.cookie ?? '');

      if (redirect) {
        return res.redirect(302, redirect);
      }

      const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-outlet-->', html);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5174;
  app.listen(port, () => {
    console.log(`Vite SSR Dev Server running on http://localhost:${port}`);
  });
}

createServer();
