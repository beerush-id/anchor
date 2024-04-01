import type { Remote, Stream, StreamMeta, StreamQueue } from './remote.js';
import type { ItemTypeOf, KeyOf, Part, Rec } from '../core/base.js';
import { isBrowser, isNumber, isString } from '../utils/index.js';
import { createQuery, Query, QueryState } from './query.js';
import { State } from '@beerush/reactor';
import { Schema } from '../schema/index.js';

export type Fields<F> = Array<KeyOf<F> | { [K in keyof F]?: Fields<F[K]> | Fields<ItemTypeOf<F[K]>> }>;
export type WhereFilter<T> = {
  [K in keyof T]?: T[K] | T[K][] | ConditionFilter<T[K]> | ConditionFilter<T[K]>[] | WhereFilter<T[K]> | WhereFilter<T[K]>[];
};
export type ConditionFilter<T> =
  T extends string ? TextFilter<T> : T extends number ? NumericFilter<T> : GenericFilter<T>;

export type NumericFilter<T extends number> = GenericFilter<T> & {
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  between?: [ T, T ];
};
export type TextFilter<T extends string> = GenericFilter<T> & {
  inq?: T[];
  nin?: T[];
  nlike?: T;
  ilike?: T;
  nilike?: T;
};
export type GenericFilter<T> = {
  eq?: T;
  neq?: T;
  exists?: boolean;
  like?: T;
  regexp?: string | RegExp;
};

export type Filter<Entity extends Rec, Params extends Rec = Rec> = {
  fields?: Fields<Entity>;
  where?: WhereFilter<Entity>;
  params?: Part<Params>;
  prefix?: string;
  suffix?: string;
  page?: number;
  limit?: number;
};

export type RelationMethod = 'find' | 'findOne' | 'create' | 'update' | 'patch' | 'delete';
export type BelongsToRelation = {
  endpoint: Endpoint<Rec>;
  foreignKey: string;
  acceptMethods?: RelationMethod[];
};

export type HasManyRelation = {
  endpoint: Endpoint<Rec>;
  localKey: string;
  acceptMethods?: RelationMethod[];
};

export type HasOneRelation = {
  endpoint: Endpoint<Rec>;
  localKey: string;
  acceptMethods?: RelationMethod[];
};

export type EndpointRelation = {
  belongsTo?: BelongsToRelation[];
  hasMany?: HasManyRelation[];
  hasOne?: HasOneRelation[]
};

export type EndpointConfig<Entity extends Rec = Rec, Params extends Rec = Rec> = {
  name: string;
  endpoint: string;
  endpointPrefix?: string;
  relations?: EndpointRelation;
  schema?: Schema<Entity>;
  defaultFilter?: Filter<Entity, Params>;
};

const QUERY_STORE = new Map<Endpoint<Rec>, Map<string, Query<Rec>>>;

export class Endpoint<Entity extends Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec> {
  constructor(private remote: Remote, private config: EndpointConfig<Entity, Params>) {
    QUERY_STORE.set(this as never, new Map() as never);
  }

  public init(init: Part<Entity>, filters: Filter<Entity, Params>, options?: RequestInit): StreamQueue<Entity> {
    const url = this.createUrl('create', filters as never, (init as never as { id: string })?.id, init);
    return this.remote.stream(url, 'POST', init, options);
  }

  public get<R extends Rec = Entity, M extends StreamMeta = Meta, P extends Rec = Params>(
    id: string,
    filter?: Filter<R, P>,
    immediate?: boolean,
  ): State<Query<R, R, M, P>> {
    return this.query(filter, id, immediate) as never;
  }

  public query<R extends Rec = Entity, M extends StreamMeta = Meta, P extends Rec = Params>(
    init?: Filter<R, P>,
    name = 'main',
    immediate?: boolean,
  ): QueryState<R, R[], M, P> {
    if (!isBrowser()) {
      return createQuery(this, init as never, immediate) as never;
    }

    const queryName = `query://collection.${ this.config.name }/${ name }`;
    const queries = QUERY_STORE.get(this as never) ?? new Map() as never;
    let query = queries.get(queryName);
    if (!query) {
      query = createQuery(this, {
        ...this.config.defaultFilter,
        ...init,
      } as never, immediate) as never;
      queries.set(queryName, query as never);
    }

    return query as never;
  }

  public find<R extends Rec = Entity, M extends StreamMeta = Meta, P extends Rec = Params>(
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R[], M> {
    const url = this.createUrl('find', filter as never);
    return this.remote.list(url, options);
  }

  public findOne<R extends Rec = Entity, P extends Rec = Params>(
    id: string,
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R> {
    const url = this.createUrl('findOne', filter as never, id);
    return this.remote.get(url, options);
  }

  public create<R extends Rec = Entity, P extends Rec = Params>(
    body: R,
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R> {
    const url = this.createUrl('create', filter as never);
    return this.remote.post<R>(url, body as never, options);
  }

  public update<R extends Rec = Entity, P extends Rec = Params>(
    id: string,
    body: R,
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R> {
    const url = this.createUrl('update', filter as never, id, body as never);
    return this.remote.put<R>(url, body as never, options);
  }

  public patch<R extends Rec = Entity, P extends Rec = Params>(
    id: string,
    body: Part<R>,
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R> {
    const url = this.createUrl('patch', filter as never, id, body as never);
    return this.remote.patch<R>(url, body as Part<R>, options);
  }

  public delete<R extends Rec = Entity, P extends Rec = Params>(
    id: string,
    filter?: Filter<R, P>,
    options?: RequestInit,
  ): Stream<R> {
    const url = this.createUrl('delete', filter as never, id);
    return this.remote.delete<R>(url, options);
  }

  private createUrl(
    method: RelationMethod,
    filter?: Filter<Entity, Params>,
    suffix?: string,
    body?: Part<Entity>,
  ) {
    const { endpointPrefix, relations } = this.config;
    const segments = [ this.config.endpoint ];

    let prefix = endpointPrefix;

    if (relations?.belongsTo) {
      for (const { endpoint, foreignKey, acceptMethods } of relations.belongsTo) {
        if (!acceptMethods || acceptMethods.includes(method)) {
          const foreignId = (
            filter?.where?.[foreignKey] ||
            filter?.params?.[foreignKey] ||
            body?.[foreignKey]
          ) as string;

          if (isString(foreignId) || isNumber(foreignId)) {
            segments.unshift(endpoint.config.endpoint, foreignId);

            if (endpoint.config.endpointPrefix) {
              prefix = endpoint.config.endpointPrefix;
            }

            delete filter?.where?.[foreignKey];
            delete filter?.params?.[foreignKey];
            delete body?.[foreignKey];
          }
        }
      }
    }

    if (filter?.prefix) {
      prefix = filter.prefix;
    }

    if (prefix) {
      segments.unshift(prefix);
    }

    if (suffix) {
      segments.push(suffix);
    }

    if (filter?.suffix) {
      segments.push(filter.suffix);
    }

    const url = new URL(segments.join('/'), 'http://localhost');

    if (filter?.fields && filter.fields.length) {
      url.searchParams.append('fields', JSON.stringify(filter.fields));
    }

    if (filter?.where && Object.keys(filter.where).length) {
      url.searchParams.append('where', JSON.stringify(filter.where));
    }

    for (const [ key, value ] of Object.entries(filter?.params || {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, JSON.stringify(value));
      }
    }

    if (filter?.limit) {
      url.searchParams.append('limit', `${ filter?.limit }`);
    }

    if (filter?.page) {
      url.searchParams.append('page', `${ filter.page }`);
    }

    return [ url.pathname, url.search ].join('')
      .replace(/[/]+/g, '/')
      .replace(/\/$/, '');
  }
}
