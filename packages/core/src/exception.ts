import type { KeyLike, StateMutation } from './types.js';
import { typeOf } from '@beerush/utils';

export const generator = {
  init(message: string) {
    const messages = [
      '\x1b[1m[violation] Initializing non-linkable object:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mRemember\x1b[0m: Only the following types are supported:',
      '- Object, Array, Set, and Map',
      '',
      '\x1b[3m\x1b[1mPlease check the error stack below for more details.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  internalException(message: string) {
    const messages = [
      '\x1b[1mAn internal exception occured:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      'This is likely a bug in the library implementation.',
      'Please report this issue with the full stack trace.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor] ' + messages.join('\n')}\x1b[0m\n\n`;
  },
  externalException(message: string) {
    const messages = [
      '\x1b[1mAn external exception occured:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      'This error originated from an external source (e.g., application logic, subscription handler).',
      'If you believe this is an issue with the library, please report it with the full stack trace.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor] ' + messages.join('\n')}\x1b[0m\n\n`;
  },
  warning(title: string, message: string, ...extras: string[]) {
    const messages = [
      `\x1b[1m[warning] ${title}\x1b[0m`,
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      ...extras,
      '',
      '\x1b[3m\x1b[1mSee stack trace below for more details if available.',
    ];

    return `⚠️\x1b[33m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  violation(message: string) {
    const messages = [
      '\x1b[1m[violation] Read-only state violation detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mImportant\x1b[0m: Direct mutation of read-only state is not permitted.',
      "- If this state was declared immutable, use a designated 'writer' function to modify it.",
      "- If this state should be mutable, ensure it was initialized without the 'immutable: true' option.",
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  contractViolation(message: string) {
    const messages = [
      '\x1b[1m[violation] Write contract violation detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mImportant\x1b[0m: Mutation of non-contract property is not allowed.',
      '- If write contract is declared with specific props, only those props are mutable.',
      '- If write contract of array, set, and map is declared with specific methods, only those methods are available.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  schemaViolation(message: string) {
    const messages = [
      '\x1b[1m[schema] Schema violation detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      'The provided schema does not match the expected structure.',
      '- Ensure that all required properties are present and of the correct type.',
      '- Check that the schema adheres to the defined structure and constraints.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  validation(context: string, message: string) {
    const messages = [
      '\x1b[1m[schema] Schema validation failed:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${context}\x1b[0m`,
      '',
      message,
      '',
      'The provided schema does not match the expected structure.',
      '- Ensure that all required properties are present and of the correct type.',
      '- Check that the schema adheres to the defined structure and constraints.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
  circularViolation(message: string) {
    const messages = [
      '\x1b[1m[violation] Circular reference detected:\x1b[0m',
      '',
      `\x1b[4m\x1b[1m${message}\x1b[0m`,
      '',
      '\x1b[1mImportant\x1b[0m: Circular references in state objects are not permitted.',
      '- Ensure that the state object does not contain circular references.',
      '- Consider using a different data structure or serialization approach.',
      '',
      '\x1b[3m\x1b[1mSee stack trace below for debugging information.',
    ];

    return `⚠️\x1b[31m${'\x1b[1m[anchor]' + messages.join('\n')}\x1b[0m\n\n`;
  },
};

export const captureStack = {
  warning: {
    external(title: string, body: string, trace: string | unknown, ...excludeStacks: unknown[]) {
      const message = generator.warning(title, body);
      const error = new Error(typeof trace === 'string' ? trace : body);
      shiftStack(error, captureStack.warning.external, excludeStacks);

      console.warn(message, error, '\n');
    },
  },
  error: {
    internal(text: string, error: Error, ...excludeStacks: unknown[]) {
      const message = generator.internalException(text);
      shiftStack(error, captureStack.error.internal, excludeStacks);
      console.error(message, error, '\n');
    },
    external(text: string, error: Error, ...excludeStacks: unknown[]) {
      const message = generator.externalException(text);
      shiftStack(error, captureStack.error.external, excludeStacks);
      console.error(message, error, '\n');
    },
    validation(context: string, error: Error, strict?: boolean, ...excludeStacks: unknown[]) {
      const message = generator.validation(context, error.message as string);
      error = new Error('Invalid schema.');
      shiftStack(error, captureStack.error.validation, excludeStacks);

      if (strict) {
        console.error(message);
        throw error;
      }

      console.error(message, error, '\n');
    },
  },
  violation: {
    init(value: unknown, ...excludeStacks: unknown[]) {
      const message = generator.init(`Attempted to create state from "${typeOf(value)}".`);
      const error = new Error(`Type data "${typeOf(value)}" is not observable.`);
      shiftStack(error, captureStack.violation.init, excludeStacks);

      console.error(message, error, '\n');
    },
    circular(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.circularViolation(
        `Attempted to initialize child state: "${prop as string}" that references to itself.`
      );
      const error = new Error(`Circular reference violation: "${prop as string}".`);
      shiftStack(error, captureStack.violation.circular, excludeStacks);

      console.error(message, error, '\n');
    },
    schema(expected: string, value: string, strict: boolean, ...excludeStacks: unknown[]) {
      const message = generator.schemaViolation(
        `Attempted to initialize schema of state: "${value}". Expected: "${value}".`
      );
      const error = new Error(`Invalid init schema: "${typeOf(value)}".`);
      shiftStack(error, captureStack.violation.schema, excludeStacks);

      if (strict) {
        console.error(message);
        throw error;
      }

      console.error(message, error, '\n');
    },
    setter(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempted to modify property "${prop as string}" of a read-only state.`);
      const error = new Error(`Property "${prop as string}" is read-only.`);
      shiftStack(error, captureStack.violation.setter, excludeStacks);

      console.error(message, error, '\n');
    },
    remover(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempt to delete property "${prop as string}" of a read-only state.`);
      const error = new Error(`Property "${prop as string}" is read-only.`);
      shiftStack(error, captureStack.violation.remover, excludeStacks);

      console.error(message, error, '\n');
    },
    methodCall(method: StateMutation, ...excludeStacks: unknown[]) {
      const message = generator.violation(`Attempt to mutate: "${method}" of a read-only state.`);
      const error = new Error(`State is read-only.`);
      shiftStack(error, captureStack.violation.methodCall, excludeStacks);

      console.error(message, error, '\n');
    },
  },
  contractViolation: {
    setter(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempted to modify property "${prop as string}" of a write contract.`
      );
      const error = new Error(`Property "${prop as string}" is read-only.`);
      shiftStack(error, captureStack.contractViolation.setter, excludeStacks);

      console.error(message, error, '\n');
    },
    remover(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempt to delete property "${prop as string}" of a write contract.`
      );
      const error = new Error(`Property "${prop as string}" is read-only.`);
      shiftStack(error, captureStack.contractViolation.remover, excludeStacks);

      console.error(message, error, '\n');
    },
    methodRead(prop: KeyLike, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(
        `Attempted to access mutation: "${prop as string}" of a write contract.`
      );
      const error = new Error(`Method "${prop as string}" is immutable.`);
      shiftStack(error, captureStack.contractViolation.methodRead, excludeStacks);

      console.error(message, error, '\n');
    },
    methodCall(method: StateMutation, ...excludeStacks: unknown[]) {
      const message = generator.contractViolation(`Attempt to mutate: "${method}" of a write contract.`);
      const error = new Error(`State is read-only.`);
      shiftStack(error, captureStack.contractViolation.methodCall, excludeStacks);

      console.error(message, error, '\n');
    },
  },
};

function shiftStack(error: Error, caller: unknown, excludedStacks: unknown[]) {
  if (excludedStacks.length) {
    Error.captureStackTrace?.(error, caller as () => void);

    for (const fn of [...excludedStacks]) {
      Error.captureStackTrace?.(error, fn as () => void);
    }
  }
}
