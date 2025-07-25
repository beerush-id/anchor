import { logger } from '../utils/index.js';

// Simple ID generator.
const suid = () => {
  const random = `${Math.random()}`.slice(2);
  return `${Date.now()}-${random}`;
};

type Handshake = {
  type: 'handshake';
  source: string;
  target?: string;
  states?: Map<string, unknown>;
};

type TabEventType = 'close' | 'open' | 'error' | 'message';
type SocketEvent = {
  type: TabEventType;
  source?: string;
  data: unknown;
};

type StateMessage = {
  type: 'state' | string;
  source: string;

  key: string;
  value: unknown;
};

type TabRole = 'master' | 'slave';
type TabBaseEvent = {
  type: TabEventType;
};
type TabRoleEvent = TabBaseEvent & {
  role: TabRole;
};
type TabOpenEvent = TabRoleEvent & {
  states: Map<string, unknown>;
};
type TabCloseEvent = TabRoleEvent & {
  reason: string;
};
type TabErrorEvent = TabRoleEvent & {
  error: Error;
  message: string;
};
type TabMessageEvent = TabBaseEvent & {
  data: unknown;
  source: string;
};

type TabEvent<T> = T extends 'open'
  ? TabOpenEvent
  : T extends 'close'
    ? TabCloseEvent
    : T extends 'error'
      ? TabErrorEvent
      : T extends 'message'
        ? TabMessageEvent
        : never;

const LISTENER_MAPS = new WeakMap<TabSocket, Map<TabEventType, Set<(event: SocketEvent) => void>>>();

enum TabReadyState {
  CONNECTING,
  OPEN,
  CLOSED,
}

export class TabSocket {
  private readonly name: string;
  private readonly slaves = new Set<string>();
  private readonly address: string;
  private readonly channel: BroadcastChannel;

  private role: TabRole = 'master';
  private readyState: TabReadyState = TabReadyState.CONNECTING;
  private states = new Map<string, unknown>();

  constructor(address: `${'tabsocket://' | string}${string}`) {
    if (!address.startsWith('tabsocket://')) {
      address = `tabsocket://${address}`;
    }

    this.name = `${address}/${suid()}`;
    this.address = address;
    this.channel = new BroadcastChannel(address);

    LISTENER_MAPS.set(this, new Map());

    const master = localStorage.getItem(address);

    if (typeof master === 'string') {
      const handlePong = (e: MessageEvent) => {
        const { type, target } = e.data;

        if (type === 'pong' && target === this.name) {
          clearTimeout(timeout);
          this.initSlave();
          this.channel.removeEventListener('message', handlePong);
        }
      };

      this.channel.addEventListener('message', handlePong);
      this.channel.postMessage({ type: 'ping', source: this.name });

      const timeout = setTimeout(() => {
        logger.info(`[tab-socket] No response from master: ${master}.`);

        this.initMaster();
        this.channel.removeEventListener('message', handlePong);
      }, 100);
    } else {
      this.initMaster();
    }

    // Add a listener to handle incoming messages.
    const handleMessage = (e: MessageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      const { type, source } = e.data as TabMessageEvent;

      if (type === 'message' && source !== this.name) {
        this.emit<TabMessageEvent>({ ...e.data });
      }
    };
    this.channel.addEventListener('message', handleMessage);

    // Add a listener to handle incoming state changes.
    const handleStateChange = (e: MessageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      const { type, source, key, value } = e.data as StateMessage;

      if (type === 'state' && source !== this.name) {
        this.states.set(key, value);
      }
    };
    this.channel.addEventListener('message', handleStateChange);
  }

  /**
   * Initialize the instance as a master.
   * @private
   */
  private initMaster() {
    this.role = 'master';

    // Cleaning up locks leftover.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith(this.address)) {
        localStorage.removeItem(key);
      }
    }

    // Add a master lock to the local storage.
    localStorage.setItem(this.address, this.name);

    // Add a listener to handle incoming handshake requests.
    const handleHandshakeRequest = (e: MessageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      const { type, source } = e.data as Handshake;

      if (type === 'handshake' && !this.slaves.has(source)) {
        this.slaves.add(source);
        this.channel.postMessage({ type, target: source, source: this.name, states: this.states } as Handshake);

        logger.info(`[tab-socket] Client connected: ${source}.`);
      }

      if ((type as string) === 'ping') {
        this.channel.postMessage({ type: 'pong', target: source });
        logger.info(`[tab-socket] Pong sent to: ${source}.`);
      }
    };
    this.channel.addEventListener('message', handleHandshakeRequest);

    // Set the ready state to open.
    this.readyState = TabReadyState.OPEN;

    // Notify the listeners that the connection is open.
    this.emit<TabOpenEvent>({ role: this.role, type: 'open', states: this.states });

    // Cleanup on window close.
    window.addEventListener('beforeunload', () => {
      const target = Array.from(this.slaves).shift();

      if (target) {
        localStorage.setItem(`next:${this.address}`, target);
      }

      localStorage.removeItem(this.address);
      this.close();
    });

    // Add a listener to handle slave leave.
    const handleSlaveLeave = (e: StorageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      const { key, newValue } = e;

      if (key && this.slaves.has(key) && !newValue) {
        this.slaves.delete(key);
        logger.info(`[tab-socket] Slave disconnected: ${key}.`);
      }
    };
    window.addEventListener('storage', handleSlaveLeave);
    logger.info(`[tab-socket] Initialized as a master: ${this.name}.`);
  }

  /**
   * Initialize the instance as a slave.
   * @private
   */
  private initSlave() {
    this.role = 'slave';

    // Add a slave lock to the local storage.
    localStorage.setItem(this.name, JSON.stringify({ lastSeen: Date.now() }));

    // Add a listener to handle incoming handshake response.
    const handleHandshakeResponse = (e: MessageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      const { type, target, states } = e.data as Handshake;

      if (type === 'handshake' && target === this.name) {
        this.states = states ?? new Map();
        this.readyState = TabReadyState.OPEN;

        this.emit<TabOpenEvent>({ type: 'open', role: this.role, states: this.states });
        this.channel.removeEventListener('message', handleHandshakeResponse);
        logger.info(`[tab-socket] Connected to a server: ${target}`);
      }
    };
    this.channel.addEventListener('message', handleHandshakeResponse);

    // Send a handshake request to the master.
    this.channel.postMessage({ type: 'handshake', source: this.name } as Handshake);

    // Add a listener to handle master leave.
    const handleMasterLeave = (e: StorageEvent) => {
      if (this.readyState !== TabReadyState.OPEN) return;

      if (this.role === 'master') {
        window.removeEventListener('storage', handleMasterLeave);
        return;
      }

      if (e.key === this.address && !e.newValue) {
        const nextMaster = localStorage.getItem(`next:${this.address}`);

        if (nextMaster && nextMaster === this.name) {
          localStorage.removeItem(this.name);
          this.initMaster();
          localStorage.removeItem(`next:${this.address}`);
        }
      }
    };

    window.addEventListener('storage', handleMasterLeave);
    window.addEventListener('beforeunload', () => {
      localStorage.removeItem(this.name);
    });

    logger.info(`[tab-socket] Initialized as a slave: ${this.name}.`);
  }

  /**
   * Emit an event to the event listeners.
   * @param {E} event
   * @private
   */
  private emit<E extends TabBaseEvent>(event: E) {
    if (this.readyState !== TabReadyState.OPEN) return;
    console.log(event);

    const listeners = LISTENER_MAPS.get(this)?.get(event.type);

    for (const listener of listeners ?? []) {
      if (typeof listener === 'function') {
        listener(event as never);
      } else {
        listeners?.delete(listener);
      }
    }
  }

  /**
   * Send a message to the connected sockets.
   * @param data
   */
  public send(data: unknown) {
    if (this.readyState !== TabReadyState.OPEN) return;

    this.channel.postMessage({ type: 'message', source: this.name, data } as SocketEvent);
  }

  /**
   * Get a state value by key.
   * @param {string} key
   * @returns {void | T}
   */
  public get<T>(key: string): T | void {
    if (this.readyState !== TabReadyState.OPEN) return;

    return this.states.get(key) as never;
  }

  /**
   * Set a state value by key.
   * @param {string} key
   * @param {unknown} value
   */
  public set<T>(key: string, value: T) {
    if (this.readyState !== TabReadyState.OPEN) return;

    this.states.set(key, value);
    this.channel.postMessage({ type: 'state', source: this.name, key, value } as StateMessage);
  }

  /**
   * Close the socket connection.
   */
  public close() {
    if (this.readyState !== TabReadyState.OPEN) return;

    this.states.clear();
    this.channel.close();

    localStorage.removeItem(this.name);
    if (this.role === 'master') {
      localStorage.removeItem(this.address);
    }

    this.emit<TabCloseEvent>({ role: this.role, type: 'close', reason: 'closed' });
    logger.info(`[tab-socket] Closed: ${this.name}.`);

    this.readyState = TabReadyState.CLOSED;
  }

  /**
   * Add an event listener to the specified event type.
   * @param {TabEventType} type
   * @param {(event: SocketEvent) => void} listener
   */
  public addEventListener<T extends TabEventType>(type: T, listener: (event: TabEvent<T>) => void) {
    if (this.readyState !== TabReadyState.OPEN) return;

    const map = LISTENER_MAPS.get(this);

    if (!map?.has(type)) {
      map?.set(type, new Set());
    }

    map?.get(type)?.add(listener as never);
  }

  /**
   * Remove an event listener from the specified event type.
   * @param {TabEventType} type
   * @param {(event: SocketEvent) => void} listener
   */
  public removeEventListener<T extends TabEventType>(type: T, listener: (event: TabEvent<T>) => void) {
    LISTENER_MAPS.get(this)
      ?.get(type)
      ?.delete(listener as never);
  }
}
