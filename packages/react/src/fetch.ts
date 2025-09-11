import { type FetchOptions, fetchState, type FetchState, type LinkableSchema, type StreamOptions } from '@anchor/core';
import { useEffect } from 'react';
import { useMicrotask, useStableRef } from './hooks.js';

export function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'GET' | 'DELETE' }
): FetchState<R>;
export function useFetch<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;
/**
 * A React hook that provides a simple data fetching functionality.
 *
 * This hook manages the state of a fetch request and automatically updates
 * when the underlying data changes. It returns a FetchState object containing
 * the current data, loading status, and any errors.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data structures
 * @param init - The initial value for the data
 * @param options - Configuration options for the fetch request
 * @returns A FetchState object with the current data and status
 */
export function useFetch<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: FetchOptions<S>
): FetchState<R> {
  const [schedule] = useMicrotask(0);
  const state = useStableRef(() => {
    return fetchState(init, { ...options, deferred: true });
  }, [init, options]).value;

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.fetch);
    }
  }, [state]);

  return state;
}

export function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'GET' | 'DELETE' }
): FetchState<S>;
export function useStream<R, P, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<S>;
/**
 * A React hook that provides a streaming data fetch functionality.
 *
 * This hook manages the state of a streaming request and automatically updates
 * when the underlying data changes. It returns a FetchState object containing
 * the current data, loading status, and any errors.
 *
 * @template R - The type of the initial data
 * @template S - The schema type for linkable data structures
 * @param init - The initial value for the data
 * @param options - Configuration options for the stream request
 * @returns A FetchState object with the current streaming data and status
 */
export function useStream<R, S extends LinkableSchema = LinkableSchema>(
  init: R,
  options: StreamOptions<R, S>
): FetchState<R> {
  const [schedule] = useMicrotask(0);
  const state = useStableRef(() => {
    return fetchState(init, { ...options, deferred: true });
  }, [init, options]).value;

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.fetch);
    }
  }, [state]);

  return state;
}
