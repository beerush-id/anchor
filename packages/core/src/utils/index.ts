export * from './batch.js';
export * from './task.js';
export * from './clone.ts';

export function shortId() {
  const dateId = `${Date.now()}`.substring(7);
  return `${dateId}-${Math.random().toString(36).substring(2, 15)}`;
}
