import { AsyncStore } from '@anchorlib/core';

export class RenderContext extends AsyncStore {
  constructor(
    public name?: string,
    parent?: AsyncStore
  ) {
    super(parent);
  }
}
