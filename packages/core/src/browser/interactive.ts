import { $ROOT } from '../module.js';
import { $symbol, isBrowser } from '../shared/env.js';
import { captureStack } from '../shared/exception.js';
import { sleep } from '../utils/sleep.js';

export type InteractiveHandler = () => void | InteractiveDisposer | Promise<void | InteractiveDisposer>;
export type InteractiveDisposer = () => void;

const DISPOSER_SYMBOL = $symbol('interactive-disposer');

if (!$ROOT[DISPOSER_SYMBOL]) {
  $ROOT[DISPOSER_SYMBOL] = new Set();
}

const INTERACTIVE_DISPOERS = $ROOT[DISPOSER_SYMBOL] as Set<InteractiveDisposer>;
const INTERACTIVE_LISTENERS = new Set<InteractiveHandler>();

let INTERACTIVE_ENABLED = false;

export function onInteractive(handler: InteractiveHandler) {
  if (INTERACTIVE_ENABLED) {
    callHandler(handler);
  } else {
    INTERACTIVE_LISTENERS.add(handler);
  }
}

export async function acceptInteractions(deferred = true) {
  if (deferred) await sleep(0);

  INTERACTIVE_ENABLED = true;

  for (const dispose of INTERACTIVE_DISPOERS) {
    dispose();
  }
  INTERACTIVE_DISPOERS.clear();

  for (const handler of INTERACTIVE_LISTENERS) {
    callHandler(handler);
  }

  INTERACTIVE_LISTENERS.clear();
}

function callHandler(handler: InteractiveHandler) {
  try {
    const result = handler();

    if (result instanceof Promise) {
      result.then(
        (fn) => {
          if (typeof fn === 'function') {
            INTERACTIVE_DISPOERS.add(fn);
          }
        },
        (error) => {
          console.error(`[INTERACTIVE-ERROR]: Interactive handler throwing an exception.`);
          console.error(error);
        }
      );
    } else if (typeof result === 'function') {
      INTERACTIVE_DISPOERS.add(result);
    }
  } catch (error) {
    console.error(`[INTERACTIVE-ERROR]: Interactive handler throwing an exception.`);
    console.error(error);
  }
}

if (isBrowser()) {
  setTimeout(() => {
    if (!INTERACTIVE_ENABLED && INTERACTIVE_LISTENERS.size) {
      const error = new Error('Dangling interaction listener.');
      captureStack.violation.general(
        'Dangling interaction listener detected',
        'Attempted to use interactive utilities without accepting interactions.',
        error,
        [
          'Did you forget to call acceptInteractions()?',
          '- In SSR project, make sure to call `acceptInteractions()` after hydrateRoot()',
          '- In SPA project, make sure to call `acceptInteractions()` before createRoot()',
        ]
      );
    }
  }, 1000);
}
