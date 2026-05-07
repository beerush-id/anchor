// Web Standard Edge Worker
// This file is built by Vite and becomes the standalone production serverless handler.

import template from '../dist/client/index.html?raw';
import { render } from './entry-server.tsx';

export default {
  // biome-ignore lint/suspicious/noExplicitAny: expect any.
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Attempt to serve static assets
    // If running in Bun:
    if (typeof Bun !== 'undefined') {
      const filePath = `./dist/client${url.pathname}`;
      const file = Bun.file(filePath);
      if (url.pathname !== '/' && (await file.exists())) {
        return new Response(file);
      }
    }
    // If running in Cloudflare Pages:
    if (env?.ASSETS) {
      try {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status < 400) return asset;
      } catch (_e) {}
    }

    const cookie = request.headers.get('cookie') ?? '';

    try {
      // Execute the environment-agnostic SSR render function
      const { html, head, redirect } = await render(url.pathname, cookie);

      // Handle server-side redirects
      if (redirect) {
        return Response.redirect(redirect, 302);
      }

      // Inject the rendered content into the HTML shell
      const page = template.replace('<!--ssr-head-->', head).replace('<!--ssr-outlet-->', html);

      return new Response(page, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (e) {
      console.error('SSR Error:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
