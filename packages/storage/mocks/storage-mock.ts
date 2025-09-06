export class StorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const globalListeners = new Map<string, Set<(event: unknown) => void>>();

export function emitGlobalEvent(type: string, event: unknown) {
  const listeners = globalListeners.get(type) as Set<(event: unknown) => void>;

  if (listeners) {
    for (const listener of listeners) {
      if (typeof listener === 'function') {
        listener(event as never);
      }
    }
  }
}

export function clearGlobalListeners() {
  globalListeners.clear();
}

export function mockBrowserStorage() {
  // Create mock storage instances
  const sessionStorageMock = new StorageMock();
  const localStorageMock = new StorageMock();

  Object.defineProperty(global, 'window', {
    value: {
      sessionStorage: sessionStorageMock,
      localStorage: localStorageMock,
      addEventListener: (type: string, listener: (event: StorageEvent) => void) => {
        if (!globalListeners.has(type)) {
          globalListeners.set(type, new Set());
        }

        globalListeners.get(type)?.add(listener as never);
      },
    },
    writable: true,
  });

  // Set up global mocks
  Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return {
    sessionStorage: sessionStorageMock,
    localStorage: localStorageMock,
  };
}

export function clearStorageMocks() {
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
  if (global.localStorage) {
    global.localStorage.clear();
  }
}
