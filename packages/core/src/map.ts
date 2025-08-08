import { STATE_REGISTRY } from './registry.js';
import { linkable } from './utils.js';
import { anchor } from '@anchor/svelte';
import type { AnchorConfig } from './types.js';

export class ReactiveMap<K, V> extends Map<K, V> {
  constructor(
    entries?: Iterable<readonly [K, V]>,
    private options?: AnchorConfig
  ) {
    super(entries);
  }

  public get(key: K) {
    let value = super.get(key);

    if (value) {
      if (!STATE_REGISTRY.has(value) && linkable(value)) {
        value = anchor(value, this.options);
      }

      super.set(key, value);
    }

    return value;
  }
}
