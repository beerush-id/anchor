export const ERROR_CODE = {
  UNKNOWN: 'unknown',
  TIMEOUT: 'timeout',
  NOT_FOUND: 'not_found',
  NOT_SUPPORTED: 'not_supported',
  INVALID_TYPE: 'invalid_type',
  INVALID_STATE: 'invalid_state',
  INVALID_VALUE: 'invalid_value',
  INVALID_INPUT: 'invalid_argument',
  INVALID_OUTPUT: 'invalid_argument',
  NOT_IMPLEMENTED: 'not_implemented',
  INVALID_HANDLER: 'invalid_handler',
  INVALID_OPERATION: 'invalid_operation',

  TRANSPORT_MISSING: 'transport_missing',
  TRANSPORT_INVALID: 'transport_invalid',
  TRANSPORT_NOT_IMPLEMENTED: 'transport_not_implemented',

  STUB_MISSING: 'stub_missing',
  STUB_INVALID: 'stub_invalid',
  STUB_NOT_IMPLEMENTED: 'stub_not_implemented',

  RESOLVER_MISSING: 'resolver_missing',
  RESOLVER_NOT_IMPLEMENTED: 'resolver_not_implemented',
  RESOLVER_NOT_FOUND: 'resolver_not_found',
  RESOLVER_NOT_SUPPORTED: 'resolver_not_supported',
};

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export const ERROR_MESSAGE = {
  [ERROR_CODE.UNKNOWN]: 'IRPC: Unknown error',
  [ERROR_CODE.TIMEOUT]: 'IRPC: Timeout error',
  [ERROR_CODE.NOT_FOUND]: 'IRPC: Not found error',
  [ERROR_CODE.NOT_SUPPORTED]: 'IRPC: Not supported error',
  [ERROR_CODE.INVALID_TYPE]: 'IRPC: Invalid type error',
  [ERROR_CODE.INVALID_STATE]: 'IRPC: Invalid state error',
  [ERROR_CODE.INVALID_VALUE]: 'IRPC: Invalid value error',
  [ERROR_CODE.INVALID_INPUT]: 'IRPC: Invalid input error',
  [ERROR_CODE.INVALID_OUTPUT]: 'IRPC: Invalid output error',
  [ERROR_CODE.NOT_IMPLEMENTED]: 'IRPC: Not implemented error',
  [ERROR_CODE.INVALID_HANDLER]: 'IRPC: Invalid handler error',
  [ERROR_CODE.INVALID_OPERATION]: 'IRPC: Invalid operation error',

  [ERROR_CODE.TRANSPORT_MISSING]: 'IRPC: Transport missing error',
  [ERROR_CODE.TRANSPORT_INVALID]: 'IRPC: Transport invalid error',
  [ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED]: 'IRPC: Transport not implemented error',

  [ERROR_CODE.STUB_INVALID]: 'IRPC: Stub invalid error',
  [ERROR_CODE.STUB_NOT_IMPLEMENTED]: 'IRPC: Stub not implemented error',

  [ERROR_CODE.RESOLVER_MISSING]: 'IRPC: Resolver missing error',
  [ERROR_CODE.RESOLVER_NOT_IMPLEMENTED]: 'IRPC: Resolver not implemented error',
  [ERROR_CODE.RESOLVER_NOT_FOUND]: 'IRPC: Resolver not found error',
};
