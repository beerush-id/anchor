import type { Init, Rec } from '../core/index.js';
import { Endpoint, type EndpointConfig } from './endpoint.js';
import { isBrowser, logger } from '../utils/index.js';
import {
  handleStream,
  Stream,
  StreamConfig,
  StreamKeys,
  StreamMeta,
  StreamMethod,
  StreamMiddleware,
  StreamQueue,
  StreamRequest,
} from './stream.js';

export type RemoteConfig = StreamConfig;

export class Remote {
  private endpoints: Map<string, Endpoint<Rec>> = new Map();
  public middlewares: StreamMiddleware[] = [];

  constructor(
    public baseUrl: string,
    public headers: HeadersInit = {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    public config: RemoteConfig = {}
  ) {}

  public endpoint<Entity extends Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec>(
    name: string,
    config: Omit<EndpointConfig<Entity, Params>, 'name'>
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
    options?: RequestInit
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
    options?: RequestInit
  ): StreamQueue<R> {
    return this.request<P, R>(
      url,
      init,
      {
        method,
        ...options,
      },
      false
    ) as never;
  }

  public request<T extends Init, R extends Init = T, M extends StreamMeta = StreamMeta>(
    url: string,
    init: T,
    options: RequestInit,
    immediate = true
  ): Stream<R, M> {
    if (!url.startsWith('http')) {
      url = `${this.baseUrl}/${url.replace(/^\//, '')}`;
    }

    const reqInit: RequestInit = { ...options };
    reqInit.headers = new Headers({ ...this.headers, ...options?.headers });

    const key = JSON.stringify({ ...reqInit, url });
    const req = createRequest(key, init, url, reqInit, this.config);

    logger.verbose(`[anchor:remote] Created request: ${req.id}`);

    return handleStream(req, this.middlewares, immediate) as never;
  }
}

const createRequest = <T extends Init>(
  key: string,
  init: T,
  url: string,
  request: RequestInit,
  config: RemoteConfig
): StreamRequest<T> => {
  const { stateLess = !isBrowser() } = config ?? {};

  if (stateLess) {
    return { id: crypto.randomUUID(), url, data: init, request, config } as never;
  }

  let id = StreamKeys.get(key);

  if (!id) {
    id = crypto.randomUUID();
    StreamKeys.set(key, id);
  }

  return { id, url, data: init, request, config } as never;
};
