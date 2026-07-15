// Web Standard Edge Worker
// This file is built by Vite and becomes the standalone production serverless handler.

import { createSSR, createWorker } from '@anchorlib/react/ssr';
import router from './lib/router.js';
import RootLayout from './pages/layout.js';

const render = createSSR(router, RootLayout);

export default createWorker(render);
