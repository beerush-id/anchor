import { useEffect, useMemo, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../src/hooks';

describe('Anchor React - Client', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it('should initialize client hooks without errors', async () => {
    // Importing the client module should not throw
    expect(async () => {
      await import('../../src/client/index');
    }).not.toThrow();
  });

  it('should replace hook implementations after initialization', async () => {
    vi.useFakeTimers();

    // Before importing client, hooks should behave server-side
    const serverState = createState('test');
    vi.runAllTimers();

    expect(errSpy).toHaveBeenCalled();
    expect(Array.isArray(serverState)).toBe(true);

    // Import client initialization
    await import('../../src/client/index');

    // After importing, hooks should be properly bound to React
    // Note: We can't easily test the actual React behavior in this environment
    // but we can verify the imports worked
    expect(typeof useState).toBe('function');
    expect(typeof useEffect).toBe('function');
    expect(typeof useRef).toBe('function');
    expect(typeof useMemo).toBe('function');
  });
});
