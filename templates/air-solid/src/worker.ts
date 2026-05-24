// Web Standard Edge Worker
// This file is built by Vite and becomes the standalone production serverless handler.

import '@irpclib/irpc/server';
import { createFullWorker, createSSR } from '@anchorlib/solid/ssr';
import { HTTPRouter } from '@irpclib/http/router';
import { IRPC_STORE } from '@irpclib/irpc';
import template from '../dist/client/index.html?raw';
import { irpc, transport } from './lib/module.js';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

import './pages/constructor.js';

const render = createSSR(router, RootLayout);

const irpcHttpRouter = new HTTPRouter(irpc, transport);

IRPC_STORE.subscribe(() => {
  IRPC_STORE.print();
});

export default createFullWorker(irpcHttpRouter, render, {
  template,
  async resolveAsset(request, url, env) {
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
  },
});
