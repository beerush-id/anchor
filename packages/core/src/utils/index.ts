export * from './batch.js';
export * from './task.js';

export function shortId() {
  return Math.random().toString(36).substring(2, 15);
}
