import { type FetchOptions, fetchState, type FetchState, type StreamOptions, streamState } from '@anchorlib/core';

/**
 * Creates a readable Svelte store that manages the state of a fetch request.
 * This overload is for GET or DELETE requests, which typically do not have a request body.
 *
 * @template R The type of the data expected in the response.
 * @param init The initial value for the fetch state.
 * @param options The options for the fetch request, including the URL and method.
 * @returns A `ReadableRef` containing the `FetchState` of the request.
 */
export function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): FetchState<R>;

/**
 * Creates a readable Svelte store that manages the state of a fetch request.
 * This overload is for POST, PUT, or PATCH requests, which typically include a request body.
 *
 * @template R The type of the data expected in the response.
 * @template P The type of the request body.
 * @param init The initial value for the fetch state.
 * @param options The options for the fetch request, including the URL, method, and body.
 * @returns A `ReadableRef` containing the `FetchState` of the request.
 */
export function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

export function fetchRef<R>(init: R, options: FetchOptions): FetchState<R> {
  return fetchState(init, options);
}

/**
 * Creates a readable Svelte store that manages the state of a streaming request.
 * This overload is for GET or DELETE requests, which typically do not have a request body.
 *
 * @template R The type of the data expected in the response.
 * @param init The initial value for the fetch state.
 * @param options The options for the stream request, including the URL and method.
 * @returns A `ReadableRef` containing the `FetchState` of the request.
 */
export function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): FetchState<R>;

/**
 * Creates a readable Svelte store that manages the state of a streaming request.
 * This overload is for POST, PUT, or PATCH requests, which typically include a request body.
 *
 * @template R The type of the data expected in the response.
 * @template P The type of the request body.
 * @param init The initial value for the fetch state.
 * @param options The options for the stream request, including the URL, method, and body.
 * @returns A `ReadableRef` containing the `FetchState` of the request.
 */
export function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

export function streamRef<R>(init: R, options: StreamOptions<R>): FetchState<R> {
  return streamState(init, options);
}
