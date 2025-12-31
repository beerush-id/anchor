import { vi } from 'vitest';
import type { DevTool } from '../src/index.js';

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
    'onAppend',
    'onPrepend',
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
