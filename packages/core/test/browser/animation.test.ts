import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { reframe } from '../../src/browser/animation.js';

describe('browser/animation', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should schedule a callback using requestAnimationFrame', () => {
    const [schedule] = reframe();
    const cb = vi.fn();

    schedule(cb);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(cb).toHaveBeenCalled();
  });

  it('should cancel the previously scheduled animation frame', () => {
    const [schedule, cancel] = reframe();
    const cb = vi.fn();

    schedule(cb);
    cancel();

    vi.advanceTimersByTime(20);
    expect(cb).not.toHaveBeenCalled();
  });

  it('should cancel the previous frame if scheduled multiple times rapidly', () => {
    const [schedule] = reframe();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    schedule(cb1);
    schedule(cb2); // This should cancel cb1

    vi.advanceTimersByTime(20);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });
});
