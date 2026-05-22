import { ERROR_TYPE } from './enum.js';
import type { RouteErrorType } from './types.js';

export class RouteError extends Error {
  constructor(
    public type: RouteErrorType,
    message: string,
    public cause?: Error
  ) {
    super(message);
  }
}

export class NotFoundError extends RouteError {
  constructor(message: string) {
    super(ERROR_TYPE.ROUTE, message);
  }
}

export class GuardError extends RouteError {
  public constructor(message: string, cause?: Error) {
    super(ERROR_TYPE.GUARD, message, cause);
  }
}

export class ProviderError extends RouteError {
  public constructor(message: string, reason?: Error) {
    super(ERROR_TYPE.PROVIDER, message, reason);
  }
}

export class UnknownError extends RouteError {
  constructor(message: string, reason?: Error) {
    super(ERROR_TYPE.UNKNOWN, message, reason);
  }
}
