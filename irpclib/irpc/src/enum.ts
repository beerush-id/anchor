export const IRPC_PACKET_TYPE = {
  CALL: 'call',
  EVENT: 'event',
  CLOSE: 'close',
  ANSWER: 'answer',
  REQUEST: 'request',
  RESPONSE: 'response',
} as const;

export const IRPC_DATA_TYPE = {
  ARRAY: 'array',
  OBJECT: 'object',
  READABLE: 'readable',
  WRITABLE: 'writable',
  PRIMITIVE: 'primitive',
} as const;

export const IRPC_STATUS = {
  IDLE: 'idle',
  ERROR: 'error',
  PENDING: 'pending',
  SUCCESS: 'success',
} as const;

export const IRPC_BASE_CONTEXT = {
  ABORT_CONTROLLER: Symbol('abort-controller'),
} as const;
