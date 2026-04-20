import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Context from '../src/context.js';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { RemoteState } from '../src/state.js';
import { IRPCStream } from '../src/stream.js';
import type { IRPCPacketAnswer, IRPCPacketClose, IRPCPacketEvent } from '../src/types.js';

describe('IRPCStream', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should stream a synchronous plain value as an ANSWER SUCCESS', async () => {
    const stream = new IRPCStream('id1', 'test_plain', async () => ({ id: 'id1', name: 'test', result: 'hello' }));
    const pipeline = vi.fn();
    const closeHandler = vi.fn();

    stream.pipe(pipeline);
    stream.close(closeHandler);

    // Wait microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const packet = pipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(packet.type).toBe(IRPC_PACKET_TYPE.ANSWER);
    expect(packet.status).toBe(IRPC_STATUS.SUCCESS);
    expect(packet.data).toBe('hello');

    expect(closeHandler).toHaveBeenCalledTimes(1);
  });

  it('should stream an async thrown error as an ANSWER ERROR', async () => {
    const stream = new IRPCStream('id2', 'test_err', async () => {
      throw new Error('Sync fail');
    });

    const pipeline = vi.fn();
    const errHandler = vi.fn();

    stream.pipe(pipeline);
    stream.catch(errHandler);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const packet = pipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(packet.status).toBe(IRPC_STATUS.ERROR);
    expect(packet.error?.message).toBe('Sync fail');

    expect(errHandler).toHaveBeenCalledTimes(1);
    expect(errHandler.mock.calls[0][0].message).toBe('Sync fail');
  });

  it('should send early ANSWER PENDING for active RemoteState', async () => {
    const state = new RemoteState('partial');
    const stream = new IRPCStream('id3', 'test_stream', async () => ({ id: 'id3', name: 'test', result: state }));

    const pipeline = vi.fn();
    stream.pipe(pipeline);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const pkt = pipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(pkt.type).toBe(IRPC_PACKET_TYPE.ANSWER);
    expect(pkt.status).toBe(IRPC_STATUS.PENDING);
    expect(pkt.data).toBe('partial');
  });

  it('should stream data updates as EVENT packets', async () => {
    const state = new RemoteState('start');
    const stream = new IRPCStream('id4', 'test_ev', async () => ({ id: 'id4', name: 'test', result: state }));

    const pipeline = vi.fn();
    stream.pipe(pipeline);

    await new Promise((resolve) => setTimeout(resolve, 0));
    pipeline.mockClear();

    // Trigger data mutation
    state.data = 'next';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const pkt = pipeline.mock.calls[0][0] as IRPCPacketEvent;
    expect(pkt.type).toBe(IRPC_PACKET_TYPE.EVENT);
    expect(pkt.status).toBe(IRPC_STATUS.PENDING);
    expect(pkt.data.keys).toEqual(['data']);
    expect(pkt.data.value).toBe('next');
  });

  it('should complete with a CLOSE packet on RemoteState success', async () => {
    const state = new RemoteState('start');
    const stream = new IRPCStream('id5', 'test_close', async () => ({ id: 'id5', name: 'test', result: state }));

    const pipeline = vi.fn();
    stream.pipe(pipeline);

    await new Promise((resolve) => setTimeout(resolve, 0));
    pipeline.mockClear();

    // Finish state
    state.status = IRPC_STATUS.IDLE; // Make sure the short-circuit covered.
    state.status = IRPC_STATUS.SUCCESS;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const pkt = pipeline.mock.calls[0][0] as IRPCPacketClose;
    expect(pkt.type).toBe(IRPC_PACKET_TYPE.CLOSE);
    expect(pkt.status).toBe(IRPC_STATUS.SUCCESS);
  });

  it('should send CLOSE with proper error when RemoteState errors asynchronously', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const state = new RemoteState('start');
    const stream = new IRPCStream('id6', 'test_async_err', async () => ({ id: 'id6', name: 'test', result: state }));

    const pipeline = vi.fn();
    stream.pipe(pipeline);

    await new Promise((resolve) => setTimeout(resolve, 0));
    pipeline.mockClear();

    // Error state
    state.error = new Error('Async Stream Crash');
    state.status = IRPC_STATUS.ERROR;
    state.catch(() => {});

    await new Promise((resolve) => setTimeout(resolve, 0));

    const pkt = pipeline.mock.calls[pipeline.mock.calls.length - 1][0] as IRPCPacketClose;

    expect(pkt.type).toBe(IRPC_PACKET_TYPE.CLOSE);
    expect(pkt.status).toBe(IRPC_STATUS.ERROR);
    expect(pkt.error?.message).toBe('Async Stream Crash');

    errSpy.mockRestore();
  });

  it('should immediately resolve fast-success RemoteState', async () => {
    const state = new RemoteState('fast');
    state.status = IRPC_STATUS.SUCCESS; // fast cache finish

    const stream = new IRPCStream('id7', 'test_fast', async () => ({ id: 'id7', name: 'test', result: state }));

    const pipeline = vi.fn();
    const closeHandler = vi.fn();

    stream.pipe(pipeline);
    await Promise.resolve();

    stream.close(closeHandler);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(closeHandler).toHaveBeenCalledTimes(1);

    const pkt = pipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(pkt.type).toBe(IRPC_PACKET_TYPE.ANSWER);
    expect(pkt.status).toBe(IRPC_STATUS.SUCCESS);
    expect(pkt.data).toBe('fast');
  });

  it('should immediately resolve fast-error RemoteState', async () => {
    const state = new RemoteState('fast');

    state.catch(() => {});
    state.error = new Error('Fast Crash');
    state.status = IRPC_STATUS.ERROR; // fast cache finish

    const handler = vi.fn();

    const stream = new IRPCStream('id7', 'test_fast', async () => ({ id: 'id7', name: 'test', result: state }));

    const pipeline = vi.fn();
    stream.pipe(pipeline);

    await Promise.resolve();

    stream.catch(handler);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).toHaveBeenCalledTimes(1);
    const pkt = pipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].message).toBe('Fast Crash');
    expect(pkt.type).toBe(IRPC_PACKET_TYPE.ANSWER);
    expect(pkt.status).toBe(IRPC_STATUS.ERROR);
    expect(pkt.error?.message).toBe('Fast Crash');
  });

  it('should hydrate late-bound pipe listeners with dynamic status and error', async () => {
    const stream = new IRPCStream('id8', 'test_late', async () => {
      throw new Error('Boom');
    });

    // Mount first listener to trigger execution
    stream.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));

    const latePipeline = vi.fn();
    stream.pipe(latePipeline); // Should instantly evaluate

    expect(latePipeline).toHaveBeenCalledTimes(1);
    const pkt = latePipeline.mock.calls[0][0] as IRPCPacketAnswer<string>;
    expect(pkt.status).toBe(IRPC_STATUS.ERROR);
    expect(pkt.error?.message).toBe('Boom');
  });

  it('should explicitly bypass pipeline internally when prematurely aborted', async () => {
    const abortController = new AbortController();
    vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);
    
    abortController.abort(); // Cancel before execution

    const stream = new IRPCStream('id-abort-safe', 'test_abort', async () => ({ id: '1', name: 'abc', result: 'dropped' }));
    
    const pipeline = vi.fn();
    stream.pipe(pipeline);
    
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('should drop async response stream cleanly natively mapped', async () => {
    const abortController = new AbortController();
    vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);
    
    const stream = new IRPCStream('id-abort-2', 'test_abort_2', async () => {
      abortController.abort(); // Abort during await initializer execution explicitly
      return { id: '2', name: 'def', result: 'discarded' };
    });

    const pipeline = vi.fn();
    stream.pipe(pipeline);
    
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pipeline).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('should unsubscribe internally when abort hook triggers continuously mapped stream', async () => {
    const abortController = new AbortController();
    vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);
    
    const state = new RemoteState('stable');
    const subscribeSpy = vi.spyOn(state, 'subscribe');
    
    const stream = new IRPCStream('id-abort-3', 'test_abort_3', async () => ({ id: '3', name: 'ghi', result: state }));
    
    stream.pipe(vi.fn());

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Make sure subscribe returned something hookable natively
    expect(subscribeSpy).toHaveBeenCalled();
    
    // Trigger the abort mapped explicitly on state stream pipeline bound hooks structurally
    abortController.abort();
    
    // Status should be effectively terminated natively internally without output payload tracking pipeline properly functionally
    expect(stream.closed).toBe(true);

    vi.restoreAllMocks();
  });

  it('should ignore pipe registrations safely when already closed completely', () => {
    const stream = new IRPCStream('id-closed-1', 'test_pipe', async () => ({} as any));
    stream.closed = true;
    const pipeline = vi.fn();
    stream.pipe(pipeline);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it('should ignore catch registrations safely when completely closed', () => {
    const stream = new IRPCStream('id-closed-2', 'test_catch', async () => ({} as any));
    stream.closed = true;
    const errHandler = vi.fn();
    stream.catch(errHandler);
    expect(errHandler).not.toHaveBeenCalled();
  });

  it('should ignore close registrations safely when natively closed completely', () => {
    const stream = new IRPCStream('id-closed-3', 'test_close', async () => ({} as any));
    stream.closed = true;
    const closeHandler = vi.fn();
    stream.close(closeHandler);
    expect(closeHandler).not.toHaveBeenCalled();
  });
});
