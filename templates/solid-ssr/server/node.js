import { serve } from '@hono/node-server';
import worker from '../dist/server/worker.js';

serve({
  fetch: worker.fetch,
  port: process.env.PORT || 3000,
}, (info) => {
  console.log(`Node server running at http://localhost:${info.port}`);
});
