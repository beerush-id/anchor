import type { StateChange } from '@anchorlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { ERROR_CODE } from '../src/index.js';
import { IRPCReader } from '../src/reader.js';
import type { IRPCPacketAnswer, IRPCPacketClose, IRPCPacketEvent } from '../src/types.js';

describe('IRPCReader', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should initialize clean reader via readStream', () => {
    const reader = new IRPCReader('id1');
    expect(reader).toBeInstanceOf(IRPCReader);
    expect(reader.id).toBe('id1');
    expect(reader.status).toBe(IRPC_STATUS.PENDING);
    expect(reader.data).toBeUndefined();
  });

  it('should hydrate from ANSWER stream correctly', () => {
    const reader = new IRPCReader<string>('id2');

    const answerPkt: IRPCPacketAnswer<string> = {
      id: 'id2',
      name: 'test',
      type: IRPC_PACKET_TYPE.ANSWER,
      status: IRPC_STATUS.PENDING,
      data: 'initial-load',
    };

    reader.push(answerPkt);

    expect(reader.data).toBe('initial-load');
    expect(reader.status).toBe(IRPC_STATUS.PENDING);
    expect(reader.packets.size).toBe(1);
  });

  it('should map replay events strictly to data', () => {
    const reader = new IRPCReader<string>('id3', 'start');

    const eventPkt: IRPCPacketEvent = {
      id: 'id3',
      name: 'test',
      type: IRPC_PACKET_TYPE.EVENT,
      status: IRPC_STATUS.PENDING,
      data: {
        type: 'set',
        keys: ['data'],
        value: 'mutated',
        oldValue: 'start',
      } as StateChange,
    };

    reader.push(eventPkt);

    expect(reader.data).toBe('mutated');
    expect(reader.status).toBe(IRPC_STATUS.PENDING);
  });

  it('should terminate and cleanup correctly on CLOSE with SUCCESS', async () => {
    const reader = new IRPCReader('id4');
    reader.data = 'final'; // Assume loaded

    const closePkt: IRPCPacketClose = {
      id: 'id4',
      name: 'test',
      type: IRPC_PACKET_TYPE.CLOSE,
      status: IRPC_STATUS.SUCCESS,
    };

    reader.push(closePkt);

    // Because push set status to SUCCESS, the Promise should resolve
    const result = await reader;
    expect(result).toBe('final');
  });

  it('should terminate and throw correctly on CLOSE with ERROR', async () => {
    const reader = new IRPCReader('id5');

    const closePkt: IRPCPacketClose = {
      id: 'id5',
      name: 'test',
      type: IRPC_PACKET_TYPE.CLOSE,
      status: IRPC_STATUS.ERROR,
      error: { code: ERROR_CODE.UNKNOWN, message: 'Server explosion' },
    };

    let caughtError: Error | undefined;
    reader.catch((err) => {
      caughtError = err;
    });

    reader.push(closePkt);

    // microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(caughtError?.message).toBe('Server explosion');
  });

  it('should immediately throw on sync ANSWER error', async () => {
    const reader = new IRPCReader<string>('id6');

    const answerErr: IRPCPacketAnswer<string> = {
      id: 'id6',
      name: 'test',
      type: IRPC_PACKET_TYPE.ANSWER,
      status: IRPC_STATUS.ERROR,
      error: { code: ERROR_CODE.UNKNOWN, message: 'Validation fail' },
    };

    let caughtError: Error | undefined;
    reader.catch((err) => {
      caughtError = err;
    });

    reader.push(answerErr);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(caughtError?.message).toBe('Validation fail');
  });
});
