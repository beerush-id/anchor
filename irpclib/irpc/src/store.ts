import { IRPC_STORE_EVENT } from './enum.js';
import { IRPCPackage } from './module.js';
import { IRPCRouter } from './router.js';
import { IRPCStream } from './stream.js';
import type { IRPCData } from './types.js';

export type IRPCStoreEvent =
  | {
      type: typeof IRPC_STORE_EVENT.REGISTER;
      data: IRPCPackage;
    }
  | {
      type: typeof IRPC_STORE_EVENT.ROUTE;
      data: IRPCRouter;
    }
  | {
      type: typeof IRPC_STORE_EVENT.QUEUE;
      data: IRPCStream<IRPCData>;
    }
  | {
      type: typeof IRPC_STORE_EVENT.DEQUEUE;
      data: IRPCStream<IRPCData>;
    };

export type IRPCStoreSubscriber = (event: IRPCStoreEvent) => void;

export class IRPCStore {
  #subscribers = new Set<IRPCStoreSubscriber>();

  public calls = new Set<IRPCStream<IRPCData>>();
  public routers = new Set<IRPCRouter>();
  public packages = new Set<IRPCPackage>();
  public callCount = 0;

  public register(pkg: IRPCPackage) {
    if (!(pkg instanceof IRPCPackage)) {
      throw new Error('Invalid package: package must be an instance of IRPCPackage.');
    }
    this.packages.add(pkg);
    this.broadcast({ type: IRPC_STORE_EVENT.REGISTER, data: pkg });
  }

  public route(router: IRPCRouter) {
    if (!(router instanceof IRPCRouter)) {
      throw new Error('Invalid router: router must be an instance of IRPCRouter.');
    }
    this.routers.add(router);
    this.broadcast({ type: IRPC_STORE_EVENT.ROUTE, data: router });
  }

  public queue(call: IRPCStream<IRPCData>) {
    if (!(call instanceof IRPCStream)) {
      throw new Error('Invalid call: call must be an instance of IRPCStream.');
    }

    this.calls.add(call);
    this.callCount += 1;
    this.broadcast({ type: IRPC_STORE_EVENT.QUEUE, data: call });
  }

  public dequeue(call: IRPCStream<IRPCData>) {
    if (!(call instanceof IRPCStream)) {
      throw new Error('Invalid call: call must be an instance of IRPCStream.');
    }
    this.calls.delete(call);
    this.broadcast({ type: IRPC_STORE_EVENT.DEQUEUE, data: call });
  }

  public print() {
    console.table([
      {
        Packages: this.packages.size,
        Routers: this.routers.size,
        'Running Calls': this.calls.size,
        'Total Calls': this.callCount,
      },
    ]);
  }

  public subscribe(handler: IRPCStoreSubscriber) {
    if (typeof handler !== 'function') {
      throw new Error('Invalid handler: handler must be a function.');
    }
    this.#subscribers.add(handler);
    return () => this.#subscribers.delete(handler);
  }

  private broadcast(event: IRPCStoreEvent) {
    for (const subscriber of this.#subscribers) {
      subscriber(event);
    }
  }
}

export const IRPC_STORE = new IRPCStore();
