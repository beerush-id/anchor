import { logger } from '../utils/index.js';
import { signal, type Unsubscribe } from '../core/index.js';
import type { Getter } from '../core/signal.js';

const REGISTRY_NAME = `anchor-storage-sync`;

// Simple ID generator.
const suid = () => {
  const random = `${Math.random()}`.slice(2);
  return `${Date.now()}-${random}`;
};

const CHANNEL = suid();
const STORAGE = new Map<string, unknown>();
const SUBSCRIBERS = new Map<string, Set<(data: unknown) => void>>();

type MessageType = 'sync' | 'init' | 'init-response';
type MessageData<T> = { key: string; value: T };
type MessageRequest<T> = {
  id: string;
  type: MessageType;
  data: MessageData<T>;
};
type InitRequest = { id: string; type: 'init' };
type InitResponse<T> = {
  id: string;
  type: 'init-response';
  data: Array<MessageData<T>>;
};

let broadcastChannel: BroadcastChannel;

// Publish storage changes.
const notifyStorageChange = (key: string, value: unknown) => {
  const subscribers = SUBSCRIBERS.get(key);
  for (const notify of subscribers ?? []) {
    notify(value);
  }
};

const syncStorageChange = (key: string, value: unknown) => {
  broadcastChannel?.postMessage({ id: CHANNEL, type: 'sync', data: { key, value } });
};

// Handle data synchronization.
const handleSync = (e: MessageEvent) => {
  const { id, type, data } = e.data as MessageRequest<unknown>;

  if (type === 'sync' && id !== CHANNEL) {
    if (typeof data.value === 'undefined') {
      STORAGE.delete(data.key);
    } else {
      STORAGE.set(data.key, data.value);
    }

    notifyStorageChange(data.key, data.value);
  }
};

// Function to subscribe to storage change.
function subscribe<T>(key: string, callback: (data: MessageData<T>) => void) {
  if (!SUBSCRIBERS.has(key)) {
    SUBSCRIBERS.set(key, new Set());
  }

  SUBSCRIBERS.get(key)?.add(callback as never);

  return () => {
    SUBSCRIBERS.get(key)?.delete(callback as never);
  };
}

const SLAVES = new Set<string>();

// Initialize the instance as master.
function initMaster() {
  const handleSlaveLeave = (e: MessageEvent) => {
    const { id, type } = e.data;

    if (type === 'slave-leave') {
      SLAVES.delete(id);
      logger.info(`[anchor:hot-storage] New slave connected: ${id}.`);
      console.log(SLAVES);
    }
  };

  const handleSlaveInit = (e: MessageEvent) => {
    const { id, type } = e.data as InitRequest;

    if (type === 'init') {
      const data = [];
      for (const [key, value] of STORAGE) {
        data.push({ key, value });
      }

      SLAVES.add(id);
      broadcastChannel?.postMessage({ id, data, type: 'init-response' } as InitResponse<unknown>);
      logger.info(`[anchor:hot-storage] New slave connected: ${id}.`);
      logger.info(SLAVES);
    }
  };

  window.addEventListener('beforeunload', () => {
    if (SLAVES.size) {
      const candidate = SLAVES.values().next();
      SLAVES.delete(candidate.value as string);

      broadcastChannel.postMessage({
        id: CHANNEL,
        type: 'master-leave',
        candidate,
        slaves: SLAVES,
      });
    }

    broadcastChannel?.removeEventListener('message', handleSlaveInit);
  });

  broadcastChannel?.addEventListener('message', handleSlaveInit);
  broadcastChannel?.addEventListener('message', handleSlaveLeave);

  logger.info(`[anchor:hot-storage] Initialized as master: ${CHANNEL}.`);
}

// Initialize the instance as slave.
function initSlave() {
  const initId = suid();
  const initTime = Date.now();

  const handleMasterLeave = (e: MessageEvent) => {
    const { type } = e.data;

    if (type === 'master-leave') {
      const { candidate, slaves } = e.data;

      if (candidate === CHANNEL) {
        for (const slave of slaves) {
          SLAVES.add(slave);
        }

        initMaster();
      }
    }
  };

  const handleInitResponse = (e: MessageEvent) => {
    const { id, type, data } = e.data as InitResponse<unknown>;

    if (type === 'init-response' && id === initId) {
      clearTimeout(initTimeout);

      for (const { key, value } of data) {
        STORAGE.set(key, value);
        notifyStorageChange(key, value);
      }

      broadcastChannel?.removeEventListener('message', handleInitResponse);
      broadcastChannel?.addEventListener('message', handleMasterLeave);

      logger.info(`[anchor:hot-storage] Initialized as slave ${Date.now() - initTime}ms.`);
    }
  };

  broadcastChannel?.addEventListener('message', handleInitResponse);
  broadcastChannel?.postMessage({ id: initId, type: 'init' } as InitRequest);

  const initTimeout = setTimeout(() => {
    initMaster();
  }, 50) as never;

  window.addEventListener('beforeunload', () => {
    broadcastChannel?.removeEventListener('message', handleInitResponse);
  });
}

// Initialize instance only on browser.
if (typeof window !== 'undefined') {
  broadcastChannel = new BroadcastChannel(REGISTRY_NAME);
  broadcastChannel?.addEventListener('message', handleSync);

  initSlave();
}

export function read<T>(key: string): T {
  return STORAGE.get(key) as T;
}

export function write<T>(key: string, value: T) {
  STORAGE.set(key, value);
  syncStorageChange(key, value);
  notifyStorageChange(key, value);
}

export function hotMemory<T>(name: string, init: T): [Getter<T>, Unsubscribe] {
  let initValue = STORAGE.get(name);

  if (!initValue) {
    initValue = init;
    STORAGE.set(name, initValue);
    syncStorageChange(name, initValue);
  }

  const [value, setValue, sub] = signal<T>(initValue as T);

  const leaveStorage = subscribe(name, (newValue) => {
    STORAGE.set(name, newValue);
    setValue(newValue as T);
  });

  const leaveSignal = sub((newValue) => {
    STORAGE.set(name, newValue);
    syncStorageChange(name, newValue);
  }, false);

  const unsubscribe = () => {
    leaveStorage();
    leaveSignal();
  };

  return [value, unsubscribe];
}
