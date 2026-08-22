import worker from '../dist/server/worker.js';

const port = process.env.PORT || 3000;

Bun.serve({
  port,
  fetch(req) {
    return worker.fetch(req);
  },
});

console.log(`Bun server running at http://localhost:${port}`);
