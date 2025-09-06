import type { Plugin } from 'vite';

export function anchor(): Plugin {
  const PLUGIN_NAME = 'vite-plugin-reactive-transform';
  const REACTIVE_FUNCTIONS = ['useAnchor', 'useDerived'];

  const declarationRegex = new RegExp(`([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*(?:${REACTIVE_FUNCTIONS.join('|')})`, 'g');

  return {
    name: PLUGIN_NAME,

    transform(code: string, id: string): string | null {
      if (!id.endsWith('.svelte')) {
        return null;
      }

      let match: RegExpExecArray | null;
      const reactiveVariables = new Set<string>();
      while ((match = declarationRegex.exec(code)) !== null) {
        reactiveVariables.add(match[1]);
      }

      if (reactiveVariables.size === 0) {
        return null;
      }

      let transformedCode = code;

      for (const varName of reactiveVariables) {
        transformedCode = transform(transformedCode, varName);
      }

      return transformedCode;
    },
  };
}

function transform(code: string, varName: string) {
  const regex = new RegExp(`(.*?)(?<!\\$)\\b(${varName})\\b(.*)`, 'g');

  code = code.replace(regex, (match, before, varName, after) => {
    if (before.trimEnd().endsWith('$')) {
      return match;
    }

    if (before.trimEnd().endsWith('.')) {
      return match;
    }

    if (after.trimStart().startsWith('=')) {
      return match;
    }

    if (/(const|let|var)\s*$/.test(before.trimEnd())) {
      return match;
    }

    if (after.trimStart().startsWith('(')) {
      return match;
    }

    if (after.trimStart().startsWith(':')) {
      return match;
    }

    const result = `${before}$${varName}${after}`;

    if (regex.test(result)) {
      return transform(result, varName);
    }

    return result;
  });

  return code;
}
