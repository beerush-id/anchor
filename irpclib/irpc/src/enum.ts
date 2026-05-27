export const IRPC_PACKET_TYPE = {
  CALL: 'call',
  EVENT: 'event',
  CLOSE: 'close',
  ANSWER: 'answer',
} as const;


export const IRPC_STATUS = {
  IDLE: 'idle',
  ERROR: 'error',
  PENDING: 'pending',
  SUCCESS: 'success',
  ABORTED: 'aborted',
} as const;

export const IRPC_STORE_EVENT = {
  ROUTE: 'route',
  QUEUE: 'queue',
  DEQUEUE: 'dequeue',
  REGISTER: 'register',
  ERROR: 'error',
} as const;

export const IRPC_BASE_CONTEXT = {
  ABORT_SIGNAL: Symbol('abort-signal'),
  ABORT_CONTROLLER: Symbol('abort-controller'),
  CREDENTIALS: Symbol('credentials'),
} as const;

export const IRPC_FILE_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;
