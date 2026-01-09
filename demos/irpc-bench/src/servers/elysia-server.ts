import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/hello/:name', ({ params }) => {
    return `Hello ${params.name}`;
  })
  .listen(3004);

console.log('Elysia server running on :3004');

export const server = app.server;
