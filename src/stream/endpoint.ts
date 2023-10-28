import type { Remote, Stream } from './remote.js';
import type { ItemTypeOf, KeyOf, Part, Rec } from '../core/index.js';
import { isNumber, isString } from '../utils/index.js';

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

export type Filter<T extends Rec, F extends Part<T> = T, P extends Rec = Rec> = {
  fields?: Fields<F>;
  where?: WhereFilter<T>;
  params?: Part<P>;
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

export type EndpointConfig = {
  name: string;
  endpoint: string;
  endpointPrefix?: string;
  relations?: EndpointRelation;
  defaultLimit?: number;
};

export class Endpoint<T extends Rec> {
  constructor(private remote: Remote, private config: EndpointConfig) {}

  public find<F extends T = T>(filter?: Filter<T>, options?: RequestInit): Stream<F[]>;
  public find<F extends Part<T>>(filter?: Filter<T, F>): Stream<F[]>;
  public find<F extends T, P extends Rec>(filter?: Filter<T, F, P>): Stream<F[]>;
  public find<F extends Part<T>, P extends Rec>(filter?: Filter<T, F, P>): Stream<F[]>;
  public find<F extends Part<T> = T, P extends Rec = Rec>(
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F[]> {
    const url = this.createUrl('find', filter as never);
    return this.remote.getAll(url, options);
  }

  public findOne<F extends T = T>(id: string, filter?: Filter<T>, options?: RequestInit): Stream<F>;
  public findOne<F extends Part<T>>(id: string, filter?: Filter<T, F>): Stream<F>;
  public findOne<F extends T, P extends Rec>(id: string, filter?: Filter<T, F, P>): Stream<F>;
  public findOne<F extends Part<T>, P extends Rec>(id: string, filter?: Filter<T, F, P>): Stream<F>;
  public findOne<F extends Part<T> = T, P extends Rec = Rec>(
    id: string,
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F> {
    const url = this.createUrl('findOne', filter as never, id);
    return this.remote.get(url, options);
  }

  public create<F extends T = T>(body: T, filter?: Filter<T>, options?: RequestInit): Stream<F>;
  public create<F extends Part<T>>(body: T, filter?: Filter<T, F>): Stream<F>;
  public create<F extends T, P extends Rec>(body: T, filter?: Filter<T, F, P>): Stream<F>;
  public create<F extends Part<T>, P extends Rec>(body: T, filter?: Filter<T, F, P>): Stream<F>;
  public create<F extends Part<T> = T, P extends Rec = Rec>(
    body: T,
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F> {
    const url = this.createUrl('create', filter as never);
    return this.remote.post<F>(url, body as never, options);
  }

  public update<F extends T = T>(id: string, body: T, filter?: Filter<T>, options?: RequestInit): Stream<F>;
  public update<F extends Part<T>>(id: string, body: T, filter?: Filter<T, F>): Stream<F>;
  public update<F extends T, P extends Rec>(id: string, body: T, filter?: Filter<T, F, P>): Stream<F>;
  public update<F extends Part<T>, P extends Rec>(id: string, body: T, filter?: Filter<T, F, P>): Stream<F>;
  public update<F extends Part<T> = T, P extends Rec = Rec>(
    id: string,
    body: T,
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F> {
    const url = this.createUrl('update', filter as never, id, body);
    return this.remote.put<F>(url, body as never, options);
  }

  public patch<F extends T = T>(id: string, body: Part<T>, filter?: Filter<T>, options?: RequestInit): Stream<F>;
  public patch<F extends Part<T>>(id: string, body: Part<T>, filter?: Filter<T, F>): Stream<F>;
  public patch<F extends T, P extends Rec>(id: string, body: Part<T>, filter?: Filter<T, F, P>): Stream<F>;
  public patch<F extends Part<T>, P extends Rec>(id: string, body: Part<T>, filter?: Filter<T, F, P>): Stream<F>;
  public patch<F extends Part<T> = T, P extends Rec = Rec>(
    id: string,
    body: Part<T>,
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F> {
    const url = this.createUrl('patch', filter as never, id, body);
    return this.remote.patch<F>(url, body as Part<F>, options);
  }

  public delete<F extends T = T>(id: string, filter?: Filter<T>, options?: RequestInit): Stream<F>;
  public delete<F extends Part<T>>(id: string, filter?: Filter<T, F>): Stream<F>;
  public delete<F extends T, P extends Rec>(id: string, filter?: Filter<T, F, P>): Stream<F>;
  public delete<F extends Part<T>, P extends Rec>(id: string, filter?: Filter<T, F, P>): Stream<F>;
  public delete<F extends Part<T> = T, P extends Rec = Rec>(
    id: string,
    filter?: Filter<T, F, P>,
    options?: RequestInit,
  ): Stream<F> {
    const url = this.createUrl('delete', filter as never, id);
    return this.remote.delete<F>(url, options);
  }

  private createUrl(
    method: RelationMethod,
    filter?: Filter<T>,
    suffix?: string,
    body?: Part<T>,
  ) {
    const { endpointPrefix, relations, defaultLimit } = this.config;
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

    if (filter?.limit || defaultLimit) {
      url.searchParams.append('limit', `${ filter?.limit || defaultLimit }`);
    }

    if (filter?.page) {
      url.searchParams.append('page', `${ filter.page }`);
    }

    return [ url.pathname, url.search ].join('')
      .replace(/[/]+/g, '/')
      .replace(/\/$/, '');
  }
}
