import '../../src/server/index.js';
import { describe, expect, it, vi } from 'vitest';
import { closure } from '../../src/index.js';

describe('Anchor - Server binding', () => {
  it('should assign AsyncLocalStorage', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.unstubAllGlobals();

    expect(() => {
      closure.get('foo');
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
  });
});
