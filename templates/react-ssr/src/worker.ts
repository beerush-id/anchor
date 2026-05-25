// Web Standard Edge Worker
// This file is built by Vite and becomes the standalone production serverless handler.

import { createSSR, createWorker } from '@anchorlib/react/ssr';
import template from '../dist/client/index.html?raw';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

export default createWorker(render, {
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
