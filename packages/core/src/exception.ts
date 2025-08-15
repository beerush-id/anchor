import type { KeyLike, StateMutation } from './types.js';
import { assign, remove } from './helper.js';
import { typeOf } from '@beerush/utils';

export const generator = {
  init(message: string) {
    const messages = [
      '\x1b[1m[violation] Initializing non-linkable object:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mRemember\x1b[0m: Only the following type that supported:',
      '- Object, Array, Set, and Map',
      '',
      '\x1b[3m\x1b[1mPlease check the error stack below for more details.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  exception(message: string) {
    const messages = [
      '\x1b[1mInternal exception raised:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[3m\x1b[1mPlease check the error stack below for more details.',
    ];

    return `❌\x1b[31m${'\x1b[1m[anchor] ' + messages.join('\n')}\x1b[0m\n\n`;
  },
  warning(message: string, ...extras: string[]) {
    const messages = [`\x1b[1m${message}\x1b[0m`, ...extras];

    return `⚠️\x1b[33m${'\x1b[1m[anchor] ' + messages.join('\n')}\x1b[0m\n\n`;
  },
  violation(message: string) {
    const messages = [
      '\x1b[1m[violation] Read-only state violation detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mRemember\x1b[0m: Direct mutation of read-only state is not allowed.',
      "- If this state was declared immutable, use a designated 'writer' function to modify it.",
      "- If this state should be mutable, ensure it was initialized without the 'immutable: true' option.",
      '',
      '\x1b[3m\x1b[1mPlease check the error stack below for more details.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  contractViolation(message: string) {
    const messages = [
      '\x1b[1m[violation] Write contract violation detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mRemember\x1b[0m: Mutation of non-contract propery is not allowed.',
      '- If write contract is declared with specific props, only that props that mutable.',
      '- If write contract of array, set, and map is declared with specific methods, only that method that available.',
      '',
      '\x1b[3m\x1b[1mPlease check the error stack below for more details.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
};

const DEFAULT_STACKS = [assign, remove];

export const captureStack = {
  violation: {
    init(value: unknown, ...excludeStacks: unknown[]) {
      const message = generator.init(`Attempted to create state from "${typeOf(value)}".`);
      const error = new Error(`Type data "${typeOf(value)}" is not observable.`);

      Error.captureStackTrace?.(error, captureStack.violation.init);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    setter(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempted to modify property "${prop as string}" of a read-only state.`);
      const error = new Error(`Property "${prop as string}" is read-only.`);

      Error.captureStackTrace?.(error, captureStack.violation.setter);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    remover(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempt to delete property "${prop as string}" of a read-only state.`);
      const error = new Error(`Property "${prop as string}" is read-only.`);

      Error.captureStackTrace?.(error, captureStack.violation.remover);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    methodCall(method: StateMutation, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempt to mutate: "${method}" of a read-only state.`);
      const error = new Error(`State is read-only.`);

      Error.captureStackTrace?.(error, captureStack.violation.methodCall);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
  },
  contractViolation: {
    setter(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempted to modify property "${prop as string}" of a write contract.`
      );
      const error = new Error(`Property "${prop as string}" is read-only.`);

      Error.captureStackTrace?.(error, captureStack.contractViolation.setter);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    remover(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempt to delete property "${prop as string}" of a write contract.`
      );
      const error = new Error(`Property "${prop as string}" is read-only.`);

      Error.captureStackTrace?.(error, captureStack.contractViolation.remover);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    methodRead(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempted to access mutation: "${prop as string}" of a write contract.`
      );
      const error = new Error(`Method "${prop as string}" is immutable.`);

      Error.captureStackTrace?.(error, captureStack.contractViolation.methodRead);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
    methodCall(method: StateMutation, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(`Attempt to mutate: "${method}" of a write contract.`);
      const error = new Error(`State is read-only.`);

      Error.captureStackTrace?.(error, captureStack.contractViolation.methodCall);

      for (const fn of [...DEFAULT_STACKS, ...excludeStacks]) {
        Error.captureStackTrace?.(error, fn as () => void);
      }

      console.error(message, error, '\n');
    },
  },
};
