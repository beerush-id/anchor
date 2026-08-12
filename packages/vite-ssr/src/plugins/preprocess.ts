import MagicString from 'magic-string';
import type { Plugin } from 'vite';

export type AirPreprocessOptions = {
  heading?: boolean | number;
  codeGroup?: boolean | string;
};

export function airPreprocess(options: AirPreprocessOptions = {}) {
  const { heading = 6, codeGroup = '@anchorlib/react/docs' } = { ...options };

  return [
    {
      name: 'vite-plugin-air-preprocess:react-effect',
      enforce: 'pre',
      transform(code) {
        if (this.environment?.name !== 'client') return;
        if (!code.includes('AIR_REACT_CLIENT_INIT')) return;

        const s = new MagicString(code);
        s.replace(/export const AIR_REACT_CLIENT_INIT = 'preprocessed';/, '');
        s.prepend('import "@anchorlib/react/client";\n');

        return { code: s.toString(), map: s.generateMap({ hires: true }) };
      },
    } as Plugin,
    {
      name: 'vite-plugin-air-preprocess:mdx-toc',
      enforce: 'pre',
      transform(code, id) {
        if (heading === false || !id.split('?')[0].endsWith('.mdx')) return;

        const headings: { id: string; text: string; depth: number }[] = [];

        code.split('\n').forEach((line) => {
          if (line.startsWith('#')) {
            const head = transformHeading(line);
            if (head.depth <= (heading as number)) {
              headings.push(head);
            }
          }
        });

        return [code, `export const __airHeadings = ${JSON.stringify(headings)};`].join('\n');
      },
    } as Plugin,
    {
      name: 'vite-plugin-air-preprocess:mdx-code',
      enforce: 'pre',
      transform(code, id) {
        if (!codeGroup || !id.split('?')[0].endsWith('.mdx')) return;

        if (code.includes('code-group')) {
          return [code, `import { CodeGroup as AirCodeGroup } from '${codeGroup}';`].join('\n');
        }
      },
    } as Plugin,
  ];
}

export function transformHeading(line: string) {
  const text = line.replace(/^#+/, '').trim().replace(/[*]+/g, '');
  const depth = line.match(/^#+/g)?.[0].length || 1;

  return {
    id: text
      .toLowerCase()
      .replace(/[:&()]+/g, '')
      .replace(/[\s.]+/g, '-'),
    text,
    depth,
  };
}
