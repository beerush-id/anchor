import { AsyncStore } from '@airlib/core';

export class RenderContext extends AsyncStore {
  constructor(
    public name?: string,
    parent?: AsyncStore
  ) {
    super(parent);
  }
}
