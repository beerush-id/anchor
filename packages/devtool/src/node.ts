import type { Linkable, LinkableSchema, StateBaseOptions, StateMetadata } from '@anchorlib/core';

import { StateMap } from './map.js';

export class StateNode {
  public data: Linkable;
  public schema?: LinkableSchema;
  public configs: StateBaseOptions;
  public children = new StateMap();
  public parentId?: string;

  constructor(
    public id: string,
    init: Linkable,
    meta: StateMetadata
  ) {
    this.data = init;
    this.schema = meta.schema;
    this.configs = meta.configs;
    this.parentId = meta.parent?.id;
  }

  public dispatch(type: string, key: string, value: unknown) {
    console.log(type, key, value);
  }
}
