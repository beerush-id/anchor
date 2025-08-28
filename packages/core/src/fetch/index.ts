import type { Linkable, LinkableSchema, ObjLike, StateOptions } from '../types.js';
import { anchor } from '../anchor.js';
import { isArray, isDefined, isFunction, isObject, isString, typeOf } from '@beerush/utils';
import { linkable } from '../internal.js';
import { captureStack } from '../exception.js';
import { derive } from '../derive.ts';

export type RequestOptions = RequestInit & {
  url: string | URL;
};
export type FetchOptions<S extends LinkableSchema = LinkableSchema> = StateOptions<S> & RequestOptions;

export type StreamOptions<T, S extends LinkableSchema = LinkableSchema> = FetchOptions<S> & {
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

export interface FetchFn {
  <T, S extends LinkableSchema = LinkableSchema>(init: T, options: FetchOptions<S>): FetchState<T>;

  promise<T, S extends FetchState<T>>(state: S): Promise<S>;
}

/**
 * Create a reactive fetch state object.
 * Reactive fetch state object will sync with fetch response.
 *
 * @template T - The type of data being fetched
 * @template S - The linkable schema type
 * @param {T} init - Initial data value
 * @param {FetchOptions<S>} options - Fetch configuration options including URL and request settings
 * @returns {FetchState<T>} A reactive state object containing data, status, error and response
 */
function fetchStateFn<T, S extends LinkableSchema = LinkableSchema>(init: T, options: FetchOptions<S>): FetchState<T> {
  if (linkable(init)) {
    init = anchor(init, options);
  }

  const state = anchor.raw<FetchState<T>, S>({ data: init, status: FetchStatus.Pending }, options);

  fetch(options.url, options)
    .then(async (response) => {
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const body = await response.text();

        if (typeof contentType === 'string' && contentType.includes('application/json')) {
          try {
            anchor.assign(state, {
              response,
              data: JSON.parse(body),
              status: FetchStatus.Success,
            });
          } catch (error) {
            captureStack.error.external('Unable to parse JSON body', error as Error);
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
        captureStack.error.external(
          'Something went wrong when fetching response',
          new Error(response.statusText),
          fetchStateFn
        );
        anchor.assign(state, {
          response,
          status: FetchStatus.Error,
          error: new Error(response.statusText),
        });
      }
    })
    .catch((error) => {
      captureStack.error.external('Something went wrong when fetching response', error as Error);
      anchor.assign(state, { status: FetchStatus.Error, error });
    });

  return state;
}

fetchStateFn.promise = <T extends FetchState<Linkable>>(state: T) => {
  return toPromise(state);
};

export const fetchState = fetchStateFn as FetchFn;

export interface StreamFn {
  <T, S extends LinkableSchema = LinkableSchema>(init: T, options?: StreamOptions<T, S>): FetchState<T>;

  promise<T, S extends FetchState<T>>(state: S): Promise<S>;
}

/**
 * Create a reactive stream state object that handles streaming responses.
 * The stream state will update incrementally as data chunks are received.
 *
 * @template T - The type of data being streamed
 * @template S - The linkable schema type
 * @param {T} init - Initial data value
 * @param {StreamOptions<T, S>} options - Stream configuration options including URL, request settings, and optional transform function
 * @returns {FetchState<T>} A reactive state object containing data, status, error and response
 */
function streamStateFn<T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options: StreamOptions<T, S>
): FetchState<T> {
  if (linkable(init)) {
    init = anchor(init, options);
  }

  const state = anchor.raw<FetchState<T>, S>({ data: init, status: FetchStatus.Pending }, options);

  fetch(options.url, options)
    .then(async (response) => {
      if (response.ok) {
        const readable = response.body?.getReader?.();

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
              appendChunk(state, chunk as T, options.transform);
              anchor.assign(state, { response, status: FetchStatus.Success });
            }
          );
        } catch (error) {
          captureStack.error.external('Something went wrong when streaming response', error as Error);
          anchor.assign(state, { response, error, status: FetchStatus.Error } as FetchState<T>);
        }
      } else {
        captureStack.error.external(
          'Something went wrong when fetching response',
          new Error(response.statusText),
          streamStateFn
        );
        anchor.assign(state, {
          response,
          status: FetchStatus.Error,
          error: new Error(response.statusText),
        });
      }
    })
    .catch((error) => {
      captureStack.error.external('Something went wrong when fetching stream', error as Error);
      anchor.assign(state, { status: FetchStatus.Error, error });
    });

  return state;
}

streamStateFn.promise = <T extends FetchState<Linkable>>(state: T) => {
  return toPromise(state);
};

export const streamState = streamStateFn as StreamFn;

/**
 * Reads data chunks from a ReadableStream and processes them through receiver and finalizer callbacks.
 * This function recursively reads from the stream until it's done, decoding each chunk and attempting
 * to parse it as JSON. If JSON parsing fails, the raw string is passed to the receiver instead.
 *
 * @template T - The type of data being processed
 * @param {ReadableStreamDefaultReader<Uint8Array>} readable - The stream reader to read data from
 * @param {(chunk: T) => void} receiver - Callback function to process each data chunk
 * @param {(chunk?: T) => void} finalizer - Callback function to finalize processing when stream is done
 * @returns {Promise<void>} A promise that resolves when the stream has been fully read
 */
async function readStream<T>(
  readable: ReadableStreamDefaultReader<Uint8Array>,
  receiver: (chunk: T) => void,
  finalizer: (chunk?: T) => void
): Promise<void> {
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

/**
 * Appends a data chunk to the fetch state, applying transformation logic based on data types.
 * This function handles different data types (string, object, array) appropriately:
 * - Strings are concatenated
 * - Objects are merged using `anchor.assign`
 * - Arrays have their elements pushed
 * If no transform function is provided, the chunk replaces the current data.
 *
 * @template T - The type of data being processed
 * @param {FetchState<T>} state - The fetch state object to update
 * @param {T} chunk - The data chunk to append
 * @param {(current: T, chunk: T) => T} [transform] - Optional transformation function to apply to the data
 * @returns {void}
 */
function appendChunk<T>(state: FetchState<T>, chunk: T, transform?: (current: T, chunk: T) => T): void {
  if (typeof transform !== 'function') {
    transform = () => chunk;
  }

  if (isString(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    if (isString(state.data)) {
      (state as { data: string }).data += transform(state.data, chunk) as string;
    }
  } else if (isObject(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    if (isObject(state.data)) {
      anchor.assign(state.data as ObjLike, transform(state.data, chunk) as ObjLike);
    }
  } else if (isArray(chunk)) {
    if (typeof state.data === 'undefined') {
      state.data = transform(state.data, chunk);
      return;
    }

    if (isArray(state.data)) {
      (state.data as unknown[]).push(...(transform(state.data, chunk) as unknown[]));
    }
  }
}

/**
 * Converts a FetchState object to a Promise that resolves when the fetch operation completes.
 * If the state is still pending, it creates a promise that listens for state changes and resolves
 * or rejects based on the final status. If the state is already completed (success or error),
 * it returns a resolved promise with the current state.
 *
 * @template T - The type of the FetchState object
 * @param {T} state - The FetchState object to convert to a promise
 * @returns {Promise<T>} A promise that resolves with the final state or rejects with an error
 */
const toPromise = <T, S extends FetchState<T>>(state: S): Promise<S> => {
  if (state.status === FetchStatus.Pending) {
    return new Promise((resolve, reject) => {
      const unsubscribe = derive(state, (_s, event) => {
        if (event.type !== 'init' && !event.keys.includes('data')) {
          if (state.status === FetchStatus.Error) {
            reject(state.error);
          } else if (state.status === FetchStatus.Success) {
            resolve(state);
          }

          unsubscribe();
        }
      });
    });
  }

  return Promise.resolve(state);
};
