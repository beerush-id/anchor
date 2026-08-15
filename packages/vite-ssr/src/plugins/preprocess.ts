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

/**
 * Pre-compilation transforms for markdown sources: injects the code-group
 * component import for `:::code-group` directives and replaces the React
 * client-init marker with the client import. React-only, client-only
 * transforms, disabled when `markdown` is false.
 */
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

        const magic = new MagicString(code);
        magic.replace(/export const AIR_REACT_CLIENT_INIT = 'preprocessed';/, '');
        magic.prepend('import "@anchorlib/react/client";\n');

        return { code: magic.toString(), map: magic.generateMap({ hires: true }) };
      },
    } as Plugin,
    {
      name: 'air-pages:preprocess:mdx-code-group',
      enforce: 'pre',
      transform(code, id) {
        if (!markdown || !codeGroup || !isMdx(id)) return;
        if (!code.includes(':::code-group')) return;

        const resolved =
          typeof codeGroup === 'object'
            ? codeGroup
            : {
                name: 'CodeGroup',
                source: `@anchorlib/${AIR_ENV.framework}/docs`,
              };

        return [code, `import { ${resolved.name} as AirCodeGroup } from '${resolved.source}';`].join('\n');
      },
    } as Plugin,
  ];
}
