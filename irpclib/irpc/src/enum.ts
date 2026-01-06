export const IRPC_PACKET_TYPE = {
  CALL: 'call',
  EVENT: 'event',
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

export const IRPC_EVENT_TYPE = {
  OBJECT_SET: 'set',
  OBJECT_DELETE: 'delete',
  ARRAY_PUSH: 'push',
  ARRAY_POP: 'pop',
  ARRAY_SHIFT: 'shift',
  ARRAY_UNSHIFT: 'unshift',
  ARRAY_SPLICE: 'splice',
  ARRAY_REVERSE: 'reverse',
  ARRAY_COPY_WITHIN: 'copyWithin',
} as const;

export const IRPC_STATUS = {
  IDLE: 'idle',
  ERROR: 'error',
  PENDING: 'pending',
  SUCCESS: 'success',
} as const;
