import { afterEach, beforeEach, vi } from 'vitest';

// Reset mocks before each test
beforeEach(() => {
  // Set up fake timers for all tests
  vi.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
