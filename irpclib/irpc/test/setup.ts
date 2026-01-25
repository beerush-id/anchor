import { afterEach, beforeEach, vi } from 'vitest';

let errorSpy: ReturnType<typeof vi.spyOn>;

// Reset mocks before each test
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Set up fake timers for all tests
  vi.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  errorSpy.mockRestore();

  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
