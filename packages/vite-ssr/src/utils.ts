import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

/**
 * Converts a Node.js IncomingMessage into a Web Standard Request.
 *
 * Wires the AbortController so that `req.on('close')` (client disconnect)
 * propagates as `request.signal.aborted`, enabling IRPC stream cleanup.
 *
 * @param req - The incoming Node.js HTTP request.
 * @param controller - AbortController to wire to the request signal.
 * @returns A Web Standard Request.
 */
export function toWebRequest(req: IncomingMessage, controller: AbortController): Request {
  const { method = 'GET', headers } = req;
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  const url = (req as any).originalUrl ?? req.url ?? '/';
  const origin = `http://${headers.host ?? 'localhost'}`;
  const fullUrl = new URL(url, origin).href;

  const isBodyMethod = method !== 'GET' && method !== 'HEAD';

  return new Request(fullUrl, {
    method,
    headers: headers as Record<string, string>,
    body: isBodyMethod ? (Readable.toWeb(req) as ReadableStream) : undefined,
    signal: controller.signal,
    duplex: 'half',
  });
}

/**
 * Pipes a Web Standard Response back into a Node.js ServerResponse.
 *
 * Handles both streaming and non-streaming responses. For streaming responses,
 * pipes the ReadableStream with proper backpressure handling.
 *
 * @param res - The Node.js ServerResponse to write to.
 * @param response - The Web Standard Response to send.
 */
export async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  response.headers.forEach((value, key) => {
    // Don't set content-encoding — Vite/Node handles this
    if (key.toLowerCase() !== 'content-encoding') {
      res.setHeader(key, value);
    }
  });

  res.writeHead(response.status, response.statusText);

  if (response.body) {
    const readable = Readable.fromWeb(response.body as any);
    readable.pipe(res);

    // If the client disconnects, destroy the readable to signal upstream abort
    res.on('close', () => {
      if (!readable.destroyed) {
        readable.destroy();
      }
    });
  } else {
    const text = await response.text();
    res.end(text);
  }
}
