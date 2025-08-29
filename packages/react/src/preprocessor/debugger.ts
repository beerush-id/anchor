import type { Plugin } from 'vite';

export type DebuggerOptions = {
  enabled?: boolean;
  prefixed?: boolean;
};

export function injectDebugger({ enabled = true, prefixed = false }: DebuggerOptions): Plugin {
  return {
    name: 'anchor-react-debugger',
    transform(code, id) {
      if (!enabled || !id.endsWith('main.tsx') || code.includes('setDebugger')) return;

      const begin = [
        "import { setDebugger } from '@anchor/core';",
        '',
        'setDebugger((...args) => {',
        `  if (typeof args[0] === "string") args[0] = \`${prefixed ? '\\x1b[33m@anchor/react\\x1b[0m ' : ''}\${args[0]}\`;`,
        '  console.debug(...args);',
        '});',
      ].join('\n');

      return [begin, code].join('\n');
    },
  };
}
