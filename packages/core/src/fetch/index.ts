import type { ZodType } from 'zod/v4';
import type { AnchorOptions, PlainObject } from '../types.js';
import { anchor } from '../anchor.js';
import { isArray, isDefined, isFunction, isObject, isString, typeOf } from '@beerush/utils';
import { linkable } from '../utils.js';
import { logger } from '../logger.js';

export type RequestOptions = RequestInit & {
  url: string | URL;
};
export type FetchOptions<S extends ZodType> = AnchorOptions<S> & RequestOptions;

export type StreamOptions<T, S extends ZodType> = FetchOptions<S> & {
  transform?: (current: T, chunk: T) => T;
};

export enum FetchStatus {
  Idle = 'idle',
  Pending = 'pending',
  Success = 'success',
  Error = 'error',
}

export type FetchState<T> = {
  data: T;
  status: FetchStatus;
  error?: Error;
  response?: Response;
};

/**
 * Create a reactive fetch state object.
 * Reactive fetch state object will sync with fetch response.
 * @param {T} init
 * @param {FetchOptions<S>} options
 * @returns {FetchState<T>}
 */
export function fetchState<T, S extends ZodType = ZodType>(init: T, options: FetchOptions<S>): FetchState<T> {
  if (linkable(init)) {
    init = anchor(init, options);
  }

  const state = anchor<FetchState<T>, S>({ data: init, status: FetchStatus.Pending });

  fetch(options.url, options)
    .then(async (response) => {
      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        const body = await response.text();

        if (contentType.includes('application/json')) {
          try {
            anchor.assign(state, {
              response,
              data: JSON.parse(body),
              status: FetchStatus.Success,
            });
          } catch (error) {
            logger.error('Unable to parse JSON body:', error);
            anchor.assign(state, {
              error,
              response,
              status: FetchStatus.Error,
            } as FetchState<T>);
          }
        } else {
          anchor.assign(state, {
            response,
            data: body as T,
            status: FetchStatus.Success,
          });
        }
      } else {
        anchor.assign(state, {
          response,
          status: FetchStatus.Error,
          error: new Error(response.statusText),
        });
      }
    })
    .catch((error) => {
      anchor.assign(state, { status: FetchStatus.Error, error });
    });

  return state;
}

/**
 * Create a reactive stream state object.
 * Reactive stream state object will be updated with each stream chunk.
 * @param {T} init
 * @param {StreamOptions} options
 * @returns {FetchState<T>}
 */
export function streamState<T, S extends ZodType = ZodType>(init: T, options: StreamOptions<T, S>): FetchState<T> {
  if (linkable(init)) {
    init = anchor(init, options);
  }

  const state = anchor<FetchState<T>, S>({ data: init, status: FetchStatus.Pending });

  fetch(options.url, options)
    .then(async (response) => {
      if (response.ok) {
        const readable = response.body?.getReader();

        if (!isDefined(readable) || !isFunction(readable?.read)) {
          const error = new Error(`Invalid response body. Expected readable stream, got: "${typeOf(readable)}.`);
          anchor.assign(state, { response, status: FetchStatus.Error, error });
          return;
        }

        try {
          await readStream<T>(
            readable,
            (chunk) => {
              appendChunk(state, chunk, options.transform);
            },
            (chunk) => {
              if (isDefined(chunk)) {
                appendChunk(state, chunk, options.transform);
              }

              anchor.assign(state, { response, status: FetchStatus.Success });
            }
          );
        } catch (error) {
          logger.error('Something went wrong when streaming response:', error);
          anchor.assign(state, { response, error, status: FetchStatus.Error } as FetchState<T>);
        }
      } else {
        anchor.assign(state, {
          response,
          status: FetchStatus.Error,
          error: new Error(response.statusText),
        });
      }
    })
    .catch((error) => {
      anchor.assign(state, { status: FetchStatus.Error, error });
    });

  return state;
}

async function readStream<T>(
  readable: ReadableStreamDefaultReader<Uint8Array>,
  receiver: (chunk: T) => void,
  finalizer: (chunk?: T) => void
) {
  if (!isFunction(receiver)) return;

  const { done, value } = await readable.read();

  if (done) {
    if (value) {
      const decoder = new TextDecoder();
      const chunk = decoder.decode(value);

      try {
        receiver(JSON.parse(chunk));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        receiver(chunk as T);
      }
    }

    finalizer(value as T);
  } else {
    const decoder = new TextDecoder();
    const chunk = decoder.decode(value);

    try {
      receiver(JSON.parse(chunk));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      receiver(chunk as T);
    }

    await readStream(readable, receiver, finalizer);
  }
}

function appendChunk<T>(state: FetchState<T>, chunk: T, transform?: (current: T, chunk: T) => T) {
  if (typeof transform !== 'function') {
    transform = () => chunk;
  }

  if (isString(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    (state as { data: string }).data += transform(state.data, chunk) as string;
  } else if (isObject(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    anchor.assign(state.data as PlainObject, transform(state.data, chunk) as PlainObject);
  } else if (isArray(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    (state.data as unknown[]).push(...(transform(state.data, chunk) as unknown[]));
  }
}
