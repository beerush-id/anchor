import { type FetchOptions, fetchState, type FetchState, type StreamOptions, streamState } from '@anchorlib/core';
import type { ConstantRef } from './types.js';
import { constantRef } from './ref.js';

/**
 * Creates a readable Svelte store that manages the state of a fetch request.
 * This overload is for GET or DELETE requests, which typically do not have a request body.
 *
 * @template R The type of the data expected in the response.
 * @param init The initial value for the fetch state.
 * @param options The options for the fetch request, including the URL and method.
 * @returns A `ReadableRef` containing the `FetchState` of the request.
 */
export function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): ConstantRef<FetchState<R>>;

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
): ConstantRef<FetchState<R>>;
/** @internal */
export function fetchRef<R>(init: R, options: FetchOptions): ConstantRef<FetchState<R>> {
  const state = fetchState(init, options);
  return constantRef(state);
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
export function streamRef<R>(
  init: R,
  options: StreamOptions<R> & { method: 'GET' | 'DELETE' }
): ConstantRef<FetchState<R>>;

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
): ConstantRef<FetchState<R>>;

/** @internal */
export function streamRef<R>(init: R, options: StreamOptions<R>): ConstantRef<FetchState<R>> {
  const state = streamState(init, options);
  return constantRef(state);
}
