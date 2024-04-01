import type { Init, Readable, Rec, State, Writable } from '../core/index.js';
import { anchor, writable } from '../core/index.js';
import { Endpoint, type EndpointConfig } from './endpoint.js';
import { logger } from '../utils/index.js';

const StreamKeys = new Map<string, string>();
const StreamStore = new Map<string, State<Stream<Init>>>();

export type StreamPublisher<T extends Init> = (cb?: (stream: Stream<T>) => void) => Promise<State<T> | void>;
export type StreamMeta = {
  total: number;
  page: number;
  limit: number;
}

export type StreamStatus = 'init' | 'pending' | 'success' | 'error';
export type StreamMethod =
  'LIST'
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

export type StreamRequest<T extends Init> = StreamInit & {
  body?: T;
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
}

export type Stream<T extends Init, M extends StreamMeta = StreamMeta> = Readable<StreamInit & {
  data: State<T>;
  duration: number;
  meta: T extends Rec[] ? M : never;
  progress: number;
  resolved: boolean;
  response: Response;
  status: StreamStatus;
  steps: number;
}>;

export type StreamQueue<T extends Init> = Readable<StreamInit & {
  data: State<T>;
  duration: number;
  progress: number;
  resolved: boolean;
  response: Response;
  status: StreamStatus;
  steps: number;
  fetch: StreamPublisher<T>;
}>;

export type StreamMiddleware = {
  req?: (stream: StreamRequest<Init>, next: () => void) => Promise<void> | void;
  res?: (stream: StreamResponse<Init>, next: () => void) => Promise<void> | void;
}

export type RemoteConfig = {
  timeout?: number;
}

export class Remote {
  private endpoints: Map<string, Endpoint<Rec>> = new Map();
  public middlewares: StreamMiddleware[] = [];

  constructor(
    public baseUrl: string,
    public headers: HeadersInit = {
      accept: 'application/json', 'content-type': 'application/json',
    },
    public config: RemoteConfig = {},
  ) {}

  public endpoint<Entity extends Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec>(
    name: string,
    config: Omit<EndpointConfig<Entity, Params>, 'name'>,
  ): Endpoint<Entity, Meta, Params> {
    let endpoint = this.endpoints.get(name);

    if (!endpoint) {
      endpoint = new Endpoint<Entity, Meta>(this, { ...config, name } as never) as never;
      this.endpoints.set(name, endpoint);
    }

    return endpoint as never;
  }

  public use(...middlewares: StreamMiddleware[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  public get<T extends Rec, R extends Init = T>(url: string, options?: RequestInit): Stream<R> {
    return this.request<T, R>(url, {} as never, {
      method: 'GET',
      ...options,
    });
  }

  public list<T extends Rec, M extends StreamMeta = StreamMeta, R extends Init = T>(
    url: string,
    options?: RequestInit,
  ): Stream<R[], M> {
    return this.request<T, R[], M>(url, [] as never, {
      method: 'LIST',
      ...options,
    });
  }

  public post<T extends Rec, R extends Init = T>(url: string, body: T, options?: RequestInit): Stream<R> {
    return this.request<T, R>(url, body, {
      method: 'POST',
      body: body as never,
      ...options,
    });
  }

  public put<T extends Rec, R extends Init = T>(url: string, body: Partial<T>, options?: RequestInit): Stream<R> {
    return this.request<T, R>(url, body as never, {
      method: 'PUT',
      body: body as never,
      ...options,
    });
  }

  public patch<T extends Rec, R extends Init = T>(url: string, body: Partial<T>, options?: RequestInit): Stream<R> {
    return this.request<T, R>(url, body as never, {
      method: 'PATCH',
      body: body as never,
      ...options,
    });
  }

  public delete<T extends Rec, R extends Init = T>(url: string, options?: RequestInit): Stream<R> {
    return this.request<T, R>(url, {} as never, {
      method: 'DELETE',
      ...options,
    });
  }

  public stream<P extends Init, R extends Init = P>(
    url: string,
    method: StreamMethod = 'POST',
    init: P,
    options?: RequestInit,
  ): StreamQueue<R> {
    return this.request<P, R>(url, init, {
      method,
      ...options,
    }, false) as never;
  }

  public request<T extends Init, R extends Init = T, M extends StreamMeta = StreamMeta>(
    url: string,
    init: T,
    options: RequestInit,
    immediate = true,
  ): Stream<R, M> {
    if (!url.startsWith('http')) {
      url = `${ this.baseUrl }/${ url.replace(/^\//, '') }`;
    }

    const reqInit: RequestInit = { ...options };
    reqInit.headers = new Headers({ ...this.headers, ...options?.headers });

    const key = JSON.stringify({ ...reqInit, url });
    const req = createRequest(key, init, url, reqInit);

    logger.verbose(`[anchor:remote] Created request: ${ req.id }`);

    return handleStream(req, this.middlewares, immediate) as never;
  }
}

const createRequest = <T extends Init>(key: string, init: T, url: string, request: RequestInit): StreamRequest<T> => {
  let id = StreamKeys.get(key);

  if (!id) {
    id = crypto.randomUUID();
    StreamKeys.set(key, id);
  }

  return { id, url, data: init, request } as never;
};

const createStream = <T extends Init>(id: string, req: StreamRequest<T>): Stream<T> => {
  let stream = StreamStore.get(req.id) as Stream<Init>;

  if (!stream) {
    const init = { ...req, data: anchor((req as Stream<Init>).data), progress: 0, duration: 0, status: 'init' };
    delete init.body;
    stream = writable(init as never, false)[0];
    StreamStore.set(req.id, stream as never);
  }

  return stream as never;
};

const handleStream = (
  req: StreamRequest<Init>,
  middlewares: StreamMiddleware[],
  immediate = true,
) => {
  const stream = createStream(req.id, req);

  const requestMiddlewares = [ ...middlewares ].filter(m => typeof m.req === 'function');
  const responseMiddlewares = [ ...middlewares ].filter(m => typeof m.res === 'function');
  const totalProgress = requestMiddlewares.length + responseMiddlewares.length + 2;
  (stream as never as Writable<Init>).set({ steps: totalProgress });

  let startTime = 0;
  let currentProgress = 0;

  const start = async () => {
    startTime = Date.now();
    logger.verbose(`[anchor:request:${ req.id }] Progress: ${ stream.progress }%`);

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
            logger.verbose(`[anchor:request:${ req.id }] Progress: ${ stream.progress }%`);

            await handleReq();
          };

          try {
            await handle.req(req as never, next);
          } catch (error) {
            req.error = error as Error;
          }
        }
      };

      await handleReq();

      if (req.error) {
        stream.error = req.error;
        reject(stream);
        return;
      }
      stream.request = new Request(req.url, {
        ...req.request,
        method: (req.method === 'LIST' ? 'GET' : req.method) ?? 'GET',
      });
      stream.response = await fetch(stream.request);

      currentProgress += 1;
      (stream as never as Writable<Init>).set({
        progress: Math.round((currentProgress / totalProgress) * 100),
      });
      logger.verbose(`[anchor:request:${ req.id }] Progress: ${ stream.progress }%`);

      if (stream.response.ok) {
        try {
          (stream as never as StreamResponse<Init>).body = await stream.response.json();
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
            logger.verbose(`[anchor:request:${ req.id }] Progress: ${ stream.progress }%`);
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

const reject = (stream: Stream<Init>, error?: Error) => {
  (stream as never as Writable<Init>).set({
    error: stream.error ?? error,
    progress: 100,
    status: 'error',
    resolved: true,
  });
  logger.verbose(`[anchor:request:${ stream.id }] Progress: ${ stream.progress }%`);
};

const resolve = (stream: Stream<Init>) => {
  for (const [ key, id ] of StreamKeys.entries()) {
    if (id === stream.id) {
      StreamKeys.delete(key);
      StreamStore.delete(id);
    }
  }

  if (!stream.data) {
    stream.data = (stream as never as StreamResponse<Init>).body as never;
  }

  (stream as never as Writable<Init>).set({
    progress: 100,
    status: 'success',
    resolved: true,
  });
  logger.verbose(`[anchor:request:${ stream.id }] Progress: ${ stream.progress }%`);
};

export function readHeaders<T>(headers: Headers): T {
  const data: Record<string, string> = {};

  headers.forEach((value, key) => {
    data[key] = value;
  });

  return data as T;
}
