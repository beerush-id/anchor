import { DEV_TOOL_KEYS } from './constant.js';
import { getAsyncContext, setAsyncContext } from './context.js';
import { captureStack } from './exception.js';
import type { DevTool } from './types.js';
import { isFunction, isObjectLike } from './utils/index.js';

const DEV_TOOL_SYMBOL = Symbol('dev-tool');

/**
 * Sets the active development tool. This tool will receive callbacks for various state-related events.
 * @param {DevTool} devTool - The development tool to set as active.
 */
export function setDevTool(devTool: DevTool) {
  if (!isObjectLike(devTool)) {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a valid DevTool object.', error, setDevTool);
    return;
  }

  for (const [key, value] of Object.entries(devTool)) {
    if (DEV_TOOL_KEYS.has(key) && !isFunction(value)) {
      const error = new Error('Invalid callback.');
      captureStack.error.argument(`The given callback for "${key}" is not a function.`, error, setDevTool);
      delete devTool[key as never];
    }
  }

  if (!Object.keys(devTool).length) {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a valid DevTool object.', error, setDevTool);
    return;
  }

  const prevDevTool = getAsyncContext<DevTool>(DEV_TOOL_SYMBOL);
  setAsyncContext(DEV_TOOL_SYMBOL, devTool);

  return () => {
    setAsyncContext(DEV_TOOL_SYMBOL, prevDevTool);
  };
}

/**
 * Retrieves the currently active development tool.
 * @returns {DevTool | undefined} The active development tool, or `undefined` if none is set.
 */
export function getDevTool(): DevTool | undefined {
  return getAsyncContext(DEV_TOOL_SYMBOL);
}
