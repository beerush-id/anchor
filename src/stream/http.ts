import type { Stream } from './remote.js';
import type { Init } from '../core/index.js';

export function http<T extends Init>() {
  return (stream: Stream<T>, next: () => void) => {
    Object.defineProperty(stream, 'fetch', {
      value: async () => {
        try {
          stream.set({ status: 'pending', statusCode: undefined, headers: undefined, error: undefined });

          const url = new URL(stream.url, !stream.url.startsWith('http') ? 'http://localhost' : undefined);

          const fields = url.searchParams.get('fields');
          console.log(fields);

          const payload = stream.request.body ? JSON.stringify(stream.request.body) : undefined;
          const response = await fetch(stream.url, { ...stream.request, body: payload });

          if (response.ok) {
            try {
              const body = await response.json();
              stream.resolve({ ...response, body } as never);
            } catch (error) {
              stream.reject(error as Error, response as never);
            }

            return stream.data;
          } else {
            stream.reject(new Error(response.statusText), response as never);
          }
        } catch (error) {
          stream.reject(error as Error);
        }
      },
      enumerable: false,
    });

    next();
  };
}
