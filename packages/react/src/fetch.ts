import {
  derive,
  type FetchOptions,
  fetchState,
  type FetchState,
  type LinkableSchema,
  microtask,
  type StreamOptions,
} from '@anchor/core';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const [schedule] = useRef(microtask(0)).current;
  const [, setVersion] = useState(1);
  const state = useMemo(() => {
    return fetchState(init, { ...options, deferred: true });
  }, [init, options]);

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.fetch);
    }

    return derive(state, (_, event) => {
      if (event.type === 'init') {
        setVersion((c) => c + 1);
      }
    });
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
  const [schedule] = useRef(microtask(0)).current;
  const [, setVersion] = useState(1);
  const state = useMemo(() => {
    return fetchState(init, { ...options, deferred: true });
  }, [init, options]);

  useEffect(() => {
    if (!options.deferred) {
      schedule(state.fetch);
    }

    return derive(state, (_, event) => {
      if (event.type !== 'init') {
        setVersion((c) => c + 1);
      }
    });
  }, [state]);

  return state;
}
