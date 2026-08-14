import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { AIR_ENV } from '../modules/env.js';
import { mdxMatcher } from '../modules/markdown.js';
import type { AirMarkdownOptions } from './markdown.js';

export type CodeGroupOptions = {
  name: string;
  source: string;
};

export type AirPreprocessOptions = AirMarkdownOptions & {
  markdown?: boolean;
  codeGroup?: boolean | CodeGroupOptions;
};

export function airPreprocess(options: Partial<AirPreprocessOptions> = {}) {
  const { codeGroup = true, markdown } = { ...options };
  const isMdx = mdxMatcher(options.include);

  return [
    {
      name: 'air-pages:preprocess:react-side-effect',
      enforce: 'pre',
      transform(code) {
        if (AIR_ENV.framework !== 'react') return;
        if (this.environment?.name !== 'client') return;
        if (!code.includes('AIR_REACT_CLIENT_INIT')) return;

        const s = new MagicString(code);
        s.replace(/export const AIR_REACT_CLIENT_INIT = 'preprocessed';/, '');
        s.prepend('import "@anchorlib/react/client";\n');

        return { code: s.toString(), map: s.generateMap({ hires: true }) };
      },
    } as Plugin,
    {
      name: 'air-pages:preprocess:mdx-code-group',
      enforce: 'pre',
      transform(code, id) {
        if (!markdown || !codeGroup || !isMdx(id)) return;
        if (code.includes(':::code-group')) {
          const options =
            typeof codeGroup === 'object'
              ? codeGroup
              : {
                  name: 'CodeGroup',
                  source: `@anchorlib/${AIR_ENV.framework}/docs`,
                };
          const { name, source } = options;
          return [code, `import { ${name} as AirCodeGroup } from '${source}';`].join('\n');
        }
      },
    } as Plugin,
  ];
}
