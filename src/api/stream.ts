import { anchor, Init, Readable, Rec, State, writable, Writable } from '../core/index.js';
import { isBrowser, logger, once } from '../utils/index.js';

export type StreamMeta = {
  total: number;
  page: number;
  limit: number;
};
export type StreamStatus = 'init' | 'pending' | 'success' | 'error';
export type StreamMethod =
  | 'LIST'
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

export type StreamInit = {
  id: string;
  url: string;
  method: StreamMethod;
  request: Request;
  error?: Error;
};
export type StreamConfig = {
  timeout?: number;
  useRetries?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  stateLess?: boolean;
};
export type StreamRequest<T extends Init> = StreamInit & {
  body?: T;
  config: StreamConfig;
};
export type StreamResponse<T extends Init, M extends StreamMeta = StreamMeta> = {
  id: string;
  url: string;
  body: T;
  meta: T extends Rec[] ? M : never;
  data: State<T>;
  request: Request;
  response: Response;
  error?: Error;
};
export type Stream<T extends Init, M extends StreamMeta = StreamMeta> = Readable<
  StreamInit & {
    data: State<T>;
    duration: number;
    meta: T extends Rec[] ? M : never;
    progress: number;
    resolved: boolean;
    response: Response;
    status: StreamStatus;
    steps: number;
  }
>;
export type StreamQueue<T extends Init> = Readable<
  StreamInit & {
    data: State<T>;
    duration: number;
    progress: number;
    resolved: boolean;
    response: Response;
    status: StreamStatus;
    steps: number;
    fetch: StreamPublisher<T>;
  }
>;
export type StreamMiddleware = {
  req?: (stream: StreamRequest<Init>, next: () => void) => Promise<void> | void;
  res?: (stream: StreamResponse<Init>, next: () => void) => Promise<void> | void;
};
export type Fetcher = (request: Request, init: StreamRequest<Init>) => Promise<Response>;
export type StreamPublisher<T extends Init> = (cb?: (stream: Stream<T>) => void) => Promise<State<T> | void>;

export const StreamKeys = new Map<string, string>();
export const StreamStore = new Map<string, State<Stream<Init>>>();

export const DEFAULT_REQUEST_TIMEOUT = 10000;
export const DEFAULT_RETRY_DELAY = 5000;
export const DEFAULT_MAX_RETRIES = 5;

export const handleStream = (input: StreamRequest<Init>, middlewares: StreamMiddleware[], immediate = true) => {
  const stream = createStream(input.id, input);

  const requestMiddlewares = [...middlewares].filter((m) => typeof m.req === 'function');
  const responseMiddlewares = [...middlewares].filter((m) => typeof m.res === 'function');
  const totalProgress = requestMiddlewares.length + responseMiddlewares.length + 2;
  (stream as never as Writable<Init>).set({ steps: totalProgress });

  let startTime = 0;
  let currentProgress = 0;

  const start = async () => {
    startTime = Date.now();
    logger.verbose(`[anchor:request:${input.id}] Progress: ${stream.progress}%`);

    (stream as never as Writable<Init>).set({ status: 'pending' });

    try {
      const handleReq = async () => {
        const handle = requestMiddlewares.shift();

        if (typeof handle?.req === 'function') {
          const next = async () => {
            currentProgress += 1;
            (stream as never as Writable<Init>).set({
              progress: Math.round((currentProgress / totalProgress) * 100),
            });
            logger.verbose(`[anchor:request:${input.id}] Progress: ${stream.progress}%`);

            await handleReq();
          };

          try {
            await handle.req(input as never, next);
          } catch (error) {
            input.error = error as Error;
          }
        }
      };

      await handleReq();

      if (input.error) {
        stream.error = input.error;
        reject(stream);
        return;
      }
      stream.request = new Request(input.url, {
        ...input.request,
        method: (input.method === 'LIST' ? 'GET' : input.method) ?? 'GET',
      });

      stream.response = await once<Response>(
        async () => {
          const response = await fetcher(stream.request, input);

          if (response.ok) {
            return response;
          } else {
            throw new Error(response.statusText);
          }
        },
        input.config?.retryDelay ?? DEFAULT_RETRY_DELAY,
        input.config?.useRetries ? input.config?.maxRetries ?? DEFAULT_MAX_RETRIES : 1
      );

      currentProgress += 1;
      (stream as never as Writable<Init>).set({
        progress: Math.round((currentProgress / totalProgress) * 100),
      });
      logger.verbose(`[anchor:request:${input.id}] Progress: ${stream.progress}%`);

      if (stream.response.ok) {
        try {
          (stream as never as StreamResponse<Init>).data = anchor(await stream.response.json());
        } catch (error) {
          // skip.
        }
      } else {
        stream.error = new Error(stream.response.statusText);
      }

      const handleRes = async () => {
        const handle = responseMiddlewares.shift();

        if (typeof handle?.res === 'function') {
          const next = async () => {
            currentProgress += 1;
            (stream as never as Writable<Init>).set({
              progress: Math.round((currentProgress / totalProgress) * 100),
            });
            logger.verbose(`[anchor:request:${input.id}] Progress: ${stream.progress}%`);
            await handleRes();
          };

          try {
            await handle.res(stream as never, next);
          } catch (error) {
            stream.error = error as Error;
          }
        }
      };

      await handleRes();

      if (stream.error) {
        reject(stream);
      } else {
        resolve(stream);
      }
    } catch (error) {
      stream.error = error as Error;
      reject(stream);
    }

    return stream;
  };

  if (immediate) {
    start()
      .then(() => {
        stream.duration = Date.now() - startTime;
      })
      .catch((error) => {
        stream.duration = Date.now() - startTime;
        reject(stream, error);
      });
  } else {
    (stream as never as Writable<Init>).set({
      fetch: async (cb?: (stream: Stream<Init>) => void) => {
        try {
          await start();
          stream.duration = Date.now() - startTime;
        } catch (error) {
          stream.duration = Date.now() - startTime;
          reject(stream, error as Error);
        }

        cb?.(stream);

        return stream;
      },
    });
  }

  return stream;
};

const createStream = <T extends Init>(id: string, input: StreamRequest<T>): Stream<T> => {
  const { stateLess = !isBrowser() } = input.config ?? {};
  let stream = StreamStore.get(id) as Stream<Init>;

  if (!stream || stateLess) {
    const init = {
      ...input,
      data: anchor((input as never as Stream<Init>).data),
      progress: 0,
      duration: 0,
      status: 'init',
    };
    delete init.body;
    stream = writable(init as never, false)[0];

    if (stateLess) {
      return stream as never;
    }

    StreamStore.set(id, stream as never);
  }

  return stream as never;
};

const reject = (stream: Stream<Init>, error?: Error) => {
  (stream as never as Writable<Init>).set({
    error: stream.error ?? error,
    progress: 100,
    status: 'error',
    resolved: true,
  });
  logger.verbose(`[anchor:request:${stream.id}] Progress: ${stream.progress}%`);
};

const resolve = (stream: Stream<Init>) => {
  for (const [key, id] of StreamKeys.entries()) {
    if (id === stream.id) {
      StreamKeys.delete(key);
      StreamStore.delete(id);
    }
  }

  (stream as never as Writable<Init>).set({
    progress: 100,
    status: 'success',
    resolved: true,
  });
  logger.verbose(`[anchor:request:${stream.id}] Progress: ${stream.progress}%`);
};

export function backendStreams<T>(...streams: T[]): T[] | Promise<T[]> {
  if (isBrowser()) {
    return streams;
  }

  return Promise.all<T>(
    streams.map((stream) => {
      return new Promise((resolve) => {
        const s = stream as never as Stream<Init>;
        const unsubscribe = s.subscribe(() => {
          if (s.progress === 100) {
            resolve(stream);
            unsubscribe();
          }
        }, false);
      });
    })
  );
}

export function defineFetcher(fn: Fetcher) {
  fetcher = fn;
}

let fetcher: Fetcher = async (request: Request, init?: StreamRequest<Init>) => {
  const { timeout = DEFAULT_REQUEST_TIMEOUT } = init?.config ?? {};

  if (timeout) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), timeout);

    const response = await fetch(request, {
      signal: control.signal,
    });

    clearTimeout(timer);
    return response;
  } else {
    return fetch(request);
  }
};
