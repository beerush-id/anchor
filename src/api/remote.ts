import { anchor, Init, Rec, State } from '../core/index.js';
import { http } from './http.js';
import { logger } from '@beerush/utils';

const StreamStore = new Map<string, State<Stream<Init>>>();

export type StreamPublisher<T extends Init> = () => Promise<State<T> | void>;
export type StreamMeta = {
  total: number;
  page: number;
  limit: number;
}
export type Stream<T extends Init, M extends StreamMeta = StreamMeta> = State<{
  url: string;
  data: State<T>;
  meta: T extends Rec[] ? M : never;
  status: 'init' | 'pending' | 'success' | 'error';
  resolved: boolean;
  request: Request;

  error?: Error;
  headers?: Headers;
  statusCode?: number;
  response?: Response;

  resolve: (response: Response) => void;
  reject: (error: Error, response?: Response) => void;
  revoke: () => void;
  fetch: StreamPublisher<T>;
}, false>;

export type StreamMiddleware = (stream: Stream<Init>, next: () => void) => Promise<void> | void;

export class Remote {
  public middlewares: StreamMiddleware[] = [];

  constructor(
    public baseUrl: string,
    public headers: HeadersInit = {
      accept: 'application/json', contentType: 'application/json',
    },
  ) {}

  public use(...middlewares: StreamMiddleware[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  public get<T extends Rec>(url: string, options?: RequestInit): Stream<T> {
    return this.request<T>({} as never, url, {
      method: 'GET',
      ...options,
    });
  }

  public getAll<T extends Rec>(url: string, options?: RequestInit): Stream<T[]> {
    return this.request<T[]>([] as never, url, {
      method: 'GET',
      ...options,
    });
  }

  public post<T extends Rec>(url: string, body: T, options?: RequestInit): Stream<T> {
    return this.request<T>(body, url, {
      method: 'POST',
      body: body as never,
      ...options,
    });
  }

  public put<T extends Rec>(url: string, body: Partial<T>, options?: RequestInit): Stream<T> {
    return this.request<T>(body as never, url, {
      method: 'PUT',
      body: body as never,
      ...options,
    });
  }

  public patch<T extends Rec>(url: string, body: Partial<T>, options?: RequestInit): Stream<T> {
    return this.request<T>(body as never, url, {
      method: 'PATCH',
      body: body as never,
      ...options,
    });
  }

  public delete<T extends Rec>(url: string, options?: RequestInit): Stream<T> {
    return this.request<T>({} as never, url, {
      method: 'DELETE',
      ...options,
    });
  }

  public request<T extends Init>(init: T, url: string, options: RequestInit): Stream<T> {
    if (!this.middlewares.length) {
      this.use(http());
    }

    if (!url.includes('://')) {
      url = `${ this.baseUrl }/${ url.replace(/^\//, '') }`;
    }

    const reqInit: RequestInit = { ...options };
    reqInit.headers = { ...this.headers, ...options?.headers } as never;

    const key = JSON.stringify({ ...reqInit, url });

    let state: Stream<T> = StreamStore.get(key) as never;
    if (state) {
      return state as never;
    }

    state = createStream<T>(init, url, reqInit);

    const middlewares = [ ...this.middlewares ];
    const next = async () => {
      const handle = middlewares.shift();

      if (handle) {
        try {
          await handle(state as never, next);
        } catch (error) {
          state.reject?.(error as Error);
          logger.error?.(error as Error);
        }
      }
    };

    next().catch((error) => state.reject?.(error as Error));

    return state as never;
  }
}

const createStream = <T extends Init>(init: T, url: string, request: RequestInit): Stream<T> => {
  const stream: Stream<T> = anchor({
    url,
    data: anchor(init),
    status: 'init',
    resolved: false,
    request,
  } as never, false);

  Object.defineProperty(stream, 'resolve', {
    value: (response: Response) => {
      stream.data.set(response.body as never);
      stream.set({
        status: 'success',
        statusCode: response.status,
        headers: response.headers,
        resolved: true,
        response,
      });
    },
    enumerable: false,
  });

  Object.defineProperty(stream, 'reject', {
    value: (error: Error, response?: Response) => {
      stream.set({
        error,
        status: 'error',
        statusCode: response?.status,
        headers: response?.headers,
        resolved: true,
        response,
      });
    },
    enumerable: false,
  });

  Object.defineProperty(stream, 'revoke', {
    value: () => {
      StreamStore.delete(JSON.stringify(request));
    },
    enumerable: false,
  });

  if (typeof window !== 'undefined') {
    StreamStore.set(JSON.stringify(request), stream as never);
    logger.debug('[anchor:stream] Stream stored for later use.', stream.url);
  }

  return stream;
};
