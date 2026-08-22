import worker from '../dist/server/worker.js';

const port = Deno.env.get('PORT') ? parseInt(Deno.env.get('PORT')) : 3000;

Deno.serve({ port }, (req) => {
  return worker.fetch(req);
});
