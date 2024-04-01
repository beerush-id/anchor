import { Endpoint, Filter } from './endpoint.js';
import { anchor, Rec, State } from '../core/index.js';
import { Remote, Stream, StreamMeta, StreamQueue } from './remote.js';

export type Query<Entity extends Rec, Data extends Rec | Rec[] = Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec> = {
  data: Data;
  meta: Meta;
  filter: Filter<Entity, Params>;
  status: 'idle' | 'pending' | 'done' | 'error';
  fetch: (options?: RequestInit) => Promise<Stream<Entity[], Meta>>;
};

export type QueryState<Entity extends Rec, Data extends Rec | Rec[] = Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec> = State<Query<Entity, Data, Meta, Params>>;

type InternalEndpoint = {
  remote: Remote;
  createUrl: (method: string, filters: Filter<Rec>) => string;
}

export function createQuery<Entity extends Rec, Data extends Rec | Rec[] = Rec, Meta extends StreamMeta = StreamMeta, Params extends Rec = Rec>(
  endpoint: Endpoint<Entity, Meta, Params>,
  init?: Filter<Entity, Params>,
  immediate = false,
): QueryState<Entity, Data, Meta, Params> {
  const fetch = async (options?: RequestInit) => {
    query.set({ status: 'pending' });

    const url = (endpoint as never as InternalEndpoint).createUrl('find', { ...query.filter });
    const stream = (endpoint as never as InternalEndpoint).remote.request(url, [], {
      method: 'LIST',
      ...options,
    }, false);

    await (stream as never as StreamQueue<Entity>).fetch();

    query.set({
      status: stream.error ? 'error' : 'done',
      data: stream.data as never,
      meta: stream.meta as never,
    });

    return stream as never;
  };

  const query = anchor<Query<Entity, Data, Meta, Params>>({
    data: [] as never,
    meta: {} as never,
    filter: {
      fields: (init?.fields ?? []) as never,
      where: (init?.where ?? {}) as never,
      params: (init?.params ?? {}) as never,
    },
    status: 'idle',
    fetch,
  });

  query.filter.subscribe(() => {
    fetch().catch(() => {
      query.set({ status: 'error' });
    });
  }, immediate);

  return query;
}
