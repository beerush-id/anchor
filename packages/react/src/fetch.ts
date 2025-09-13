import {
  type FetchOptions,
  fetchState,
  type FetchState,
  type LinkableSchema,
  type StreamOptions,
  streamState,
} from '@anchorlib/core';
import { useEffect } from 'react';
import { useMicrotask } from './hooks.js';
import { useVariable } from './ref.js';
import type { AnchorState } from './types.js';

/**
 * Fetch hook for GET or DELETE requests.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data
 * @param init - Initial data or fetch configuration
 * @param options - Fetch options with method restricted to GET or DELETE
 * @returns Anchor state containing the fetch result
 */
export function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'GET' | 'DELETE' }
): AnchorState<FetchState<R>>;

/**
 * Fetch hook for POST, PUT, or PATCH requests.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body
 * @template S - The schema type for linkable data
 * @param init - Initial data or fetch configuration
 * @param options - Fetch options with method restricted to POST, PUT, or PATCH and requiring a body
 * @returns Anchor state containing the fetch result
 */
export function useFetch<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): AnchorState<FetchState<R>>;

/**
 * General fetch hook for any HTTP method.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data
 * @param init - Initial data or fetch configuration
 * @param options - Fetch options
 * @returns Anchor state containing the fetch result
 */
export function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S>
): AnchorState<FetchState<R>> {
  const [schedule] = useMicrotask(0);
  const [state, setState] = useVariable(() => {
    return fetchState(init, { ...options, deferred: true });
  }, [init, options]);

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.value.fetch);
    }
  }, [state]);

  return [state.value, state, setState];
}

/**
 * Stream hook for GET or DELETE requests.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data
 * @param init - Initial data or stream configuration
 * @param options - Stream options with method restricted to GET or DELETE
 * @returns Anchor state containing the stream result
 */
export function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'GET' | 'DELETE' }
): AnchorState<FetchState<S>>;

/**
 * Stream hook for POST, PUT, or PATCH requests.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body
 * @template S - The schema type for linkable data
 * @param init - Initial data or stream configuration
 * @param options - Stream options with method restricted to POST, PUT, or PATCH and requiring a body
 * @returns Anchor state containing the stream result
 */
export function useStream<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): AnchorState<FetchState<S>>;

/**
 * General stream hook for any HTTP method.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data
 * @param init - Initial data or stream configuration
 * @param options - Stream options
 * @returns Anchor state containing the stream result
 */
export function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S>
): AnchorState<FetchState<R>> {
  const [schedule] = useMicrotask(0);
  const [state, setState] = useVariable(() => {
    return streamState(init, { ...options, deferred: true });
  }, [init, options]);

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.value.fetch);
    }
  }, [state]);

  return [state.value, state, setState];
}
