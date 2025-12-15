import { Hono } from 'hono';

const app = new Hono();

app.get('/hello/:name', (c) => {
  const name = c.req.param('name');
  return c.json(`Hello ${name}`);
});

export const server = Bun.serve({
  port: 3003,
  fetch: app.fetch,
});

console.log('Hono server running on :3003');
