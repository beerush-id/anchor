import type { DevTool } from '../src/index.js';
import { vi } from 'vitest';

export function createDevTool() {
  const devTool = {} as DevTool;

  for (const key of [
    'onGet',
    'onSet',
    'onDelete',
    'onCall',
    'onInit',
    'onAssign',
    'onRemove',
    'onClear',
    'onDestroy',
    'onSubscribe',
    'onUnsubscribe',
    'onLink',
    'onUnlink',
    'onTrack',
    'onUntrack',
  ] as (keyof DevTool)[]) {
    devTool[key] = vi.fn();
  }

  return devTool;
}
