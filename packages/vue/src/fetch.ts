import { type FetchOptions, fetchState, type FetchState, type StreamOptions, streamState } from '@anchor/core';
import { derivedRef } from './derive.js';
import type { Ref } from 'vue';

/**
 * Creates a reactive reference to a fetch state.
 *
 * This function wraps the core **fetchState** functionality with Vue's reactivity system,
 * allowing the fetch state to be used as a reactive reference in Vue components.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body (for POST, PUT, PATCH requests)
 *
 * @param init - The initial data for the fetch state
 * @param options - Configuration options for the fetch request
 * @param options.method - The HTTP method to use for the request
 * @param options.body - The request body (required for POST, PUT, PATCH requests)
 *
 * @returns A reactive reference to the fetch state
 */
export function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): Ref<FetchState<R>>;
export function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): Ref<FetchState<R>>;
export function fetchRef<R>(init: R, options: FetchOptions): Ref<FetchState<R>> {
  const state = fetchState(init, options);
  return derivedRef(state);
}

/**
 * Creates a reactive reference to a stream state.
 *
 * This function wraps the core **streamState** functionality with Vue's reactivity system,
 * allowing the stream state to be used as a reactive reference in Vue components.
 * It is typically used for handling Server-Sent Events (SSE) or similar streaming data sources.
 *
 * @template R - The type of the initial data
 * @template P - The type of the request body (for POST, PUT, PATCH requests)
 *
 * @param init - The initial data for the stream state
 * @param options - Configuration options for the stream request
 * @param options.method - The HTTP method to use for the request
 * @param options.body - The request body (required for POST, PUT, PATCH requests)
 *
 * @returns A reactive reference to the stream state
 */
export function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): Ref<FetchState<R>>;
export function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): Ref<FetchState<R>>;
export function streamRef<R>(init: R, options: StreamOptions<R>): Ref<FetchState<R>> {
  const state = streamState(init, options);
  return derivedRef(state);
}
