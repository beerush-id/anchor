import { type FetchOptions, fetchState, type FetchState, type StreamOptions, streamState } from '@anchorlib/core';

/** @deprecated Use 'fetchState()' or 'asyncState()' instead.
 * Creates a fetch state with GET or DELETE method.
 *
 * @template R - The type of the initial data
 * @param init - The initial data
 * @param options - Fetch options with GET or DELETE method
 * @returns A fetch state object
 */
export function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): FetchState<R>;

/**
 * @deprecated Use 'fetchState()' or 'asyncState()' instead.
 * Creates a fetch state with POST, PUT or PATCH method.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body
 * @param init - The initial data
 * @param options - Fetch options with POST, PUT or PATCH method and body
 * @returns A fetch state object
 */
export function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

/**
 * @deprecated Use 'fetchState()' or 'asyncState()' instead.
 * Creates a fetch state with any HTTP method.
 *
 * @template R - The type of the initial data
 * @param init - The initial data
 * @param options - Fetch options with any HTTP method
 * @returns A fetch state object
 */
export function fetchRef<R>(
  init: R,
  options: FetchOptions & { method: 'GET' | 'DELETE' | 'POST' | 'PUT' | 'PATCH' }
): FetchState<R> {
  return fetchState(init, options);
}

/**
 * @deprecated Use 'streamState()' instead.
 * Creates a stream state with GET or DELETE method.
 *
 * @template R - The type of the initial data
 * @param init - The initial data
 * @param options - Stream options with GET or DELETE method
 * @returns A fetch state object that handles streaming data
 */
export function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): FetchState<R>;

/**
 * @deprecated Use 'streamState()' instead.
 * Creates a stream state with POST, PUT or PATCH method.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body
 * @param init - The initial data
 * @param options - Stream options with POST, PUT or PATCH method and body
 * @returns A fetch state object that handles streaming data
 */
export function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

/**
 * @deprecated Use 'streamState()' instead.
 * Creates a stream state with any HTTP method.
 *
 * @template R - The type of the initial data
 * @param init - The initial data
 * @param options - Stream options with any HTTP method
 * @returns A fetch state object that handles streaming data
 */
export function streamRef<R>(init: R, options: StreamOptions<R>): FetchState<R> {
  return streamState(init, options);
}
