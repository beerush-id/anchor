import { anchor, mutable, type StateSubscriber, subscribe } from '@anchorlib/core';
import { IRPC_STATUS } from './enum.js';
import type { IRPCReadable, IRPCStatus } from './types.js';

export class RemoteState<T> {
  readonly #state: IRPCReadable<T>;

  public get data(): T {
    return this.#state.data;
  }
  public set data(data: T) {
    this.#state.data = data;
  }

  public get error(): Error | undefined {
    return this.#state.error;
  }
  public set error(error: Error | undefined) {
    this.#state.error = error;
  }

  public get status(): IRPCStatus {
    return this.#state.status;
  }
  public set status(status: IRPCStatus) {
    this.#state.status = status;
  }

  constructor(init: T) {
    this.#state = mutable({
      data: mutable(init) as T,
      error: undefined,
      status: IRPC_STATUS.IDLE,
    });
  }

  public subscribe(handler: StateSubscriber<IRPCReadable<T>>) {
    return subscribe(this.#state, handler);
  }

  public destroy() {
    anchor.destroy(this.#state);
  }
}
