export * from './batch.js';
export * from './task.js';
export * from './clone.ts';

export function shortId() {
  return Math.random().toString(36).substring(2, 15);
}
