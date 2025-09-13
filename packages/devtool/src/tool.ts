import { StateMap } from './map.js';
import {
  type DevTool,
  type Linkable,
  type LinkableSchema,
  microbatch,
  microtask,
  type StateMetadata,
} from '@anchorlib/core';
import { StateNode } from './node.js';

export class StateDevTool implements DevTool {
  public nodes = new StateMap();
  public rootNodes = new StateMap();

  private batch = microbatch(1000)[0];
  private later = microtask(50)[0];

  public onInit<T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) {
    this.batch(() => {
      const node = new StateNode(meta.id, init, meta as never);
      this.nodes.set(meta.id, node);

      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);
        parent?.children.set(meta.id, node);
      }

      if (!node.parentId) {
        this.rootNodes.set(meta.id, node);
      }

      this.later(() => {
        console.log(this);
      });
    });
  }

  public onDestroy<T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) {
    this.nodes.delete(meta.id);
    this.rootNodes.delete(meta.id);
  }
}
