import type { StateNode } from './node.js';

export class StateMap {
  [id: string]: StateNode | unknown;

  protected size = 0;

  constructor(init?: Record<string, StateNode>) {
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        this.set(key, value);
      }
    }
  }

  public has(id: string): boolean {
    return this[id] !== undefined;
  }

  public get(id: string): StateNode | undefined {
    return this[id] as StateNode;
  }

  public set(id: string, node: StateNode): boolean {
    this[id] = node;
    this.size++;
    return true;
  }

  public delete(id: string): boolean {
    delete this[id];
    this.size--;
    return true;
  }

  public values() {
    return Object.values(this);
  }

  public entries() {
    return Object.entries(this);
  }
}
