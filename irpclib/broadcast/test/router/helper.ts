import { vi } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

export const createMockBroadcastChannel = () => {
  const mockChannel = {
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: null as ((event: AnyType) => void) | null,
  };

  vi.stubGlobal(
    'BroadcastChannel',
    vi.fn().mockImplementation(() => mockChannel)
  );

  return mockChannel;
};
