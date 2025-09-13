import { shortId } from '@anchorlib/core';

let generateId = shortId;

export function setIdProvider(provider: () => string) {
  generateId = provider;
}

export function uuid(): string {
  return generateId();
}
