import { describe, expect, it } from 'vitest';
import { decodeFileFrame, encodeFileFrame } from '../src/frame.js';

describe('frame', () => {
  it('should cleanly encode and decode file frames natively', () => {
    const id = 'test-file-id';
    const data = new Uint8Array([1, 2, 3, 4, 5]);

    const frame = encodeFileFrame(id, data.buffer);
    expect(frame).toBeInstanceOf(ArrayBuffer);

    const decoded = decodeFileFrame(frame);
    expect(decoded.id).toBe(id);
    expect(decoded.data).toEqual(data);
  });

  it('should neatly handle empty binary buffers natively', () => {
    const id = 'empty-file';
    const data = new Uint8Array([]);

    const frame = encodeFileFrame(id, data.buffer);
    const decoded = decodeFileFrame(frame);

    expect(decoded.id).toBe(id);
    expect(decoded.data).toEqual(data);
  });
});
