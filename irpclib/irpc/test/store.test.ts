import { describe, expect, it, vi } from 'vitest';
import { IRPC_STORE_EVENT } from '../src/enum.js';
import { IRPCPackage } from '../src/module.js';
import { IRPCRouter } from '../src/router.js';
import { IRPCStore } from '../src/store.js';
import { IRPCStream } from '../src/stream.js';

describe('IRPCStore', () => {
  describe('register', () => {
    it('should register a valid IRPCPackage', () => {
      const store = new IRPCStore();
      const pkg = Object.create(IRPCPackage.prototype);

      store.register(pkg);
      expect(store.packages.has(pkg)).toBe(true);
    });

    it('should broadcast REGISTER event when package is registered', () => {
      const store = new IRPCStore();
      const pkg = Object.create(IRPCPackage.prototype);
      const handler = vi.fn();

      store.subscribe(handler);
      store.register(pkg);

      expect(handler).toHaveBeenCalledWith({
        type: IRPC_STORE_EVENT.REGISTER,
        data: pkg,
      });
    });

    it('should throw when registering non-IRPCPackage', () => {
      const store = new IRPCStore();

      expect(() => store.register({} as any)).toThrow(
        'Invalid package: package must be an instance of IRPCPackage.'
      );
    });
  });

  describe('route', () => {
    it('should register a valid IRPCRouter', () => {
      const store = new IRPCStore();
      const router = Object.create(IRPCRouter.prototype);

      store.route(router);
      expect(store.routers.has(router)).toBe(true);
    });

    it('should broadcast ROUTE event when router is registered', () => {
      const store = new IRPCStore();
      const router = Object.create(IRPCRouter.prototype);
      const handler = vi.fn();

      store.subscribe(handler);
      store.route(router);

      expect(handler).toHaveBeenCalledWith({
        type: IRPC_STORE_EVENT.ROUTE,
        data: router,
      });
    });

    it('should throw when routing non-IRPCRouter', () => {
      const store = new IRPCStore();

      expect(() => store.route({} as any)).toThrow(
        'Invalid router: router must be an instance of IRPCRouter.'
      );
    });
  });

  describe('queue', () => {
    it('should add a valid IRPCStream to calls', () => {
      const store = new IRPCStore();
      const stream = Object.create(IRPCStream.prototype);

      store.queue(stream);
      expect(store.calls.has(stream)).toBe(true);
    });

    it('should broadcast QUEUE event when stream is queued', () => {
      const store = new IRPCStore();
      const stream = Object.create(IRPCStream.prototype);
      const handler = vi.fn();

      store.subscribe(handler);
      store.queue(stream);

      expect(handler).toHaveBeenCalledWith({
        type: IRPC_STORE_EVENT.QUEUE,
        data: stream,
      });
    });

    it('should throw when queuing non-IRPCStream', () => {
      const store = new IRPCStore();

      expect(() => store.queue({} as any)).toThrow(
        'Invalid call: call must be an instance of IRPCStream.'
      );
    });
  });

  describe('dequeue', () => {
    it('should remove an IRPCStream from calls', () => {
      const store = new IRPCStore();
      const stream = Object.create(IRPCStream.prototype);

      store.queue(stream);
      expect(store.calls.has(stream)).toBe(true);

      store.dequeue(stream);
      expect(store.calls.has(stream)).toBe(false);
    });

    it('should broadcast DEQUEUE event when stream is dequeued', () => {
      const store = new IRPCStore();
      const stream = Object.create(IRPCStream.prototype);
      const handler = vi.fn();

      store.queue(stream);
      store.subscribe(handler);
      store.dequeue(stream);

      expect(handler).toHaveBeenCalledWith({
        type: IRPC_STORE_EVENT.DEQUEUE,
        data: stream,
      });
    });

    it('should throw when dequeuing non-IRPCStream', () => {
      const store = new IRPCStore();

      expect(() => store.dequeue({} as any)).toThrow(
        'Invalid call: call must be an instance of IRPCStream.'
      );
    });
  });

  describe('subscribe', () => {
    it('should add a subscriber and return unsubscribe function', () => {
      const store = new IRPCStore();
      const handler = vi.fn();

      const unsubscribe = store.subscribe(handler);

      const pkg = Object.create(IRPCPackage.prototype);
      store.register(pkg);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      const pkg2 = Object.create(IRPCPackage.prototype);
      store.register(pkg2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should throw when handler is not a function', () => {
      const store = new IRPCStore();

      expect(() => store.subscribe('not-a-function' as any)).toThrow(
        'Invalid handler: handler must be a function.'
      );
    });

    it('should support multiple subscribers', () => {
      const store = new IRPCStore();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      store.subscribe(handler1);
      store.subscribe(handler2);

      const pkg = Object.create(IRPCPackage.prototype);
      store.register(pkg);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not broadcast when no subscribers', () => {
      const store = new IRPCStore();
      const pkg = Object.create(IRPCPackage.prototype);

      // Should not throw.
      expect(() => store.register(pkg)).not.toThrow();
    });
  });
});
