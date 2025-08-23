import { type FetchOptions, fetchState, type FetchState, type StreamOptions, streamState } from '@anchor/core';
import { derivedRef } from './derive.js';
import type { Ref } from 'vue';

export function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): Ref<FetchState<R>>;
export function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): Ref<FetchState<R>>;
export function fetchRef<R>(init: R, options: FetchOptions): Ref<FetchState<R>> {
  const state = fetchState(init, options);
  return derivedRef(state);
}

export function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): Ref<FetchState<R>>;
export function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): Ref<FetchState<R>>;
export function streamRef<R>(init: R, options: StreamOptions<R>): Ref<FetchState<R>> {
  const state = streamState(init, options);
  return derivedRef(state);
}
