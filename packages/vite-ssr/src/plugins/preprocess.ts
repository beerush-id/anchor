import type { LogLevel } from '@beerush/logger';
import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { color, setLogLevel, taggedLogger } from '../logger.js';
import { AIR_ENV, initEnv } from '../modules/env.js';
import type { AirMarkdownOptions } from './markdown.js';

const log = taggedLogger('air-markdown');

export type AirPreprocessOptions = AirMarkdownOptions & {
  markdown?: boolean;
  logLevel?: LogLevel;
};

/**
 * Pre-compilation transforms for markdown sources: injects the code-group
 * component import for `:::code-group` directives and replaces the React
 * client-init marker with the client import. React-only, client-only
 * transforms, disabled when `markdown` is false.
 */
export function airPreprocess(options: Partial<AirPreprocessOptions> = {}) {
  return [
    {
      name: 'air-pages:preprocess:react-side-effect',
      enforce: 'pre',
      configResolved(config) {
        initEnv(config);
        setLogLevel(options.logLevel);
      },
      transform(code) {
        if (AIR_ENV.framework !== 'react') return;
        if (this.environment?.name !== 'client') return;
        if (!code.includes('__AIR_REACT_CLIENT_INIT__')) return;

        log.verbose(color.event('Injected client import'));
        const magic = new MagicString(code);
        magic.prepend('import "@airlib/react/client";');

        return { code: magic.toString(), map: magic.generateMap({ hires: true }) };
      },
    } as Plugin,
  ];
}
