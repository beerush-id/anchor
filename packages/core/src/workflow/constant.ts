export const WORKFLOW_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
  SKIPPED: 'skipped',
  ABORTED: 'aborted',
} as const;

export const WORKFLOW_ABORT_REASON = {
  ERROR: 'error',
  SUCCESS: 'success',
  TIMEOUT: 'timeout',
  CANCELED: 'canceled',
  USER_ABORT: 'user_abort',
} as const;
