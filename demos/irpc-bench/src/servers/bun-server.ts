// Bun native router server
export const server = Bun.serve({
  port: 3002,
  routes: {
    '/hello/:name': {
      GET: (req: Request) => {
        const url = new URL(req.url);
        const name = url.pathname.split('/')[2];
        return new Response(JSON.stringify(`Hello ${name}`), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});

console.log('Bun native server running on :3002');
