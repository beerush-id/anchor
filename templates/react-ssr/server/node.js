import { serve } from '@hono/node-server';
import worker from '../dist/server/worker.js';

const port = process.env.PORT || 3000;

serve({
  fetch: worker.fetch,
  port,
}, (info) => {
  console.log(`Node server running at http://localhost:${info.port}`);
});
