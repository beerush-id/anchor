import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    try {
      const url = req.originalUrl;

      // @ts-expect-error
      let template = await fs.readFile(path.resolve(import.meta.dirname, 'index.html'), 'utf-8');
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

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;
  app.listen(port, () => {
    console.log(`Vite SSR Dev Server running on http://localhost:${port}`);
  });
}

createServer();
