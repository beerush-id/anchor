import { anchor, Rec, State } from '../core/index.js';
import { Part } from '../core/base.js';
import { Endpoint } from './endpoint.js';
import { stateHistory } from '../history/history.js';
import { StreamQueue } from './stream.js';

export type Record<Entity extends Rec> = {
  id: string;
  data: Entity;
  status: 'idle' | 'pending' | 'done' | 'error';
  fetch: (options?: RequestInit) => Promise<void>;
  update: (options?: RequestInit) => Promise<void>;
  replace: (options?: RequestInit) => Promise<void>;
  delete: (options?: RequestInit) => Promise<void>;
};

export type RecordState<Entity extends Rec> = State<Record<Entity>>;

export function createRecord<Entity extends Rec>(
  endpoint: Endpoint<Entity>,
  id: string,
  init: Part<Entity>,
  immediate = false
): RecordState<Entity> {
  const data = anchor(init);
  const fetch = async (options?: RequestInit) => {
    record.set({ status: 'pending' });

    const stream = endpoint.findOne(id, {}, options);
    await (stream as never as StreamQueue<Entity>).fetch();

    record.set({
      data: stream.data as never,
      status: stream.error ? 'error' : 'done',
    });

    return record;
  };

  const update = async (options?: RequestInit) => {
    if (!record.history.hasChanges) return record;

    const stream = endpoint.patch(id, record.history.changes as never, {}, options);
    await (stream as never as StreamQueue<Entity>).fetch();

    record.set({
      data: stream.data as never,
      status: stream.error ? 'error' : 'done',
    });

    return record;
  };

  const replace = async (options?: RequestInit) => {
    const stream = endpoint.update(id, record.data as never, {}, options);
    await (stream as never as StreamQueue<Entity>).fetch();

    record.set({
      data: stream.data as never,
      status: stream.error ? 'error' : 'done',
    });

    return record;
  };

  const remove = async (options?: RequestInit) => {
    const stream = endpoint.delete(id, {}, options);
    await (stream as never as StreamQueue<Entity>).fetch();

    record.set({
      status: stream.error ? 'error' : 'done',
    });

    return record;
  };

  const record = anchor({
    id,
    data,
    fetch,
    update,
    replace,
    history: stateHistory(data),
    status: 'idle',
    delete: remove,
  });

  if (immediate) {
    fetch().catch(() => {
      record.set({ status: 'error' });
    });
  }

  return record as never;
}
