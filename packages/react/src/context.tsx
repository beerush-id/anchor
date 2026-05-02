import { AsyncStore, setContextStore } from '@anchorlib/core';

export class RenderContext extends AsyncStore {
  constructor(
    public name?: string,
    parent?: AsyncStore
  ) {
    super(parent);
  }
}

export function setRenderCtx(context: RenderContext) {
  setContextStore(context);
}
