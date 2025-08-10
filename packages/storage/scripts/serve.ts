#!/usr/bin/env bun

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve the main index page
    if (pathname === '/') {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>@beerush/storage - Lib Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            ul { line-height: 1.6; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>@beerush/utils Lib Server</h1>
        </body>
        </html>
      `,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // Serve static files from lib directory
    const filePath = `.${pathname}`;
    const file = Bun.file(filePath);

    // Check if file exists
    const exists = await file.exists();

    if (exists) {
      return new Response(file);
    } else {
      return new Response('Not found.', {
        status: 404,
      });
    }
  },
});
