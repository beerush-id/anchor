import { describe, expect, it } from 'vitest';

// Test that all expected exports are available
import {
  anchor,
  applyAttributes,
  bind,
  bindable,
  BindingRef,
  callback,
  contextProvider,
  createEffect,
  createMemo,
  createRef,
  createState,
  derived,
  effect,
  escapeAttributes,
  exception,
  fetchState,
  flattenStyles,
  getContext,
  getProps,
  history,
  immutable,
  isBindable,
  isBinding,
  microbatch,
  microloop,
  micropush,
  microtask,
  model,
  mutable,
  nodeRef,
  onCleanup,
  onMount,
  ordered,
  setContext,
  setup,
  setupProps,
  shortId,
  streamState,
  subscribe,
  template,
  undoable,
  view,
  withProps,
  writable,
} from '../src/index';

describe('Anchor React - Index', () => {
  it('should export core functions', () => {
    expect(anchor).toBeDefined();
    expect(derived).toBeDefined();
    expect(exception).toBeDefined();
    expect(fetchState).toBeDefined();
    expect(getContext).toBeDefined();
    expect(history).toBeDefined();
    expect(immutable).toBeDefined();
    expect(microbatch).toBeDefined();
    expect(microloop).toBeDefined();
    expect(micropush).toBeDefined();
    expect(microtask).toBeDefined();
    expect(model).toBeDefined();
    expect(mutable).toBeDefined();
    expect(ordered).toBeDefined();
    expect(setContext).toBeDefined();
    expect(shortId).toBeDefined();
    expect(streamState).toBeDefined();
    expect(subscribe).toBeDefined();
    expect(undoable).toBeDefined();
    expect(writable).toBeDefined();
  });

  it('should export binding functions', () => {
    expect(bind).toBeDefined();
    expect(bindable).toBeDefined();
    expect(isBinding).toBeDefined();
    expect(isBindable).toBeDefined();
    expect(BindingRef).toBeDefined();
  });

  it('should export context functions', () => {
    expect(contextProvider).toBeDefined();
  });

  it('should export hoc functions', () => {
    expect(setup).toBeDefined();
    expect(template).toBeDefined();
    expect(view).toBeDefined();
  });

  it('should export hooks functions', () => {
    expect(createEffect).toBeDefined();
    expect(createMemo).toBeDefined();
    expect(createRef).toBeDefined();
    expect(createState).toBeDefined();
  });

  it('should export lifecycle functions', () => {
    expect(effect).toBeDefined();
    expect(onCleanup).toBeDefined();
    expect(onMount).toBeDefined();
  });

  it('should export node functions', () => {
    expect(nodeRef).toBeDefined();
    expect(applyAttributes).toBeDefined();
    expect(escapeAttributes).toBeDefined();
    expect(flattenStyles).toBeDefined();
  });

  it('should export props functions', () => {
    expect(getProps).toBeDefined();
    expect(setupProps).toBeDefined();
    expect(withProps).toBeDefined();
    expect(callback).toBeDefined();
  });
});
