import worker from '../dist/server/worker.js';

Deno.serve({ port: Deno.env.get('PORT') || 3000 }, worker.fetch);
