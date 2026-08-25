import type { BundledLanguage, CodeToHastOptions, Highlighter, ShikiTransformer } from 'shiki';
import { color, taggedLogger } from '../logger.js';
import type { AnyType } from '../types.js';
import type { Framework } from './env.js';
import { getLeafNode } from './markdown.js';

const log = taggedLogger('air-highlight');

let highlighter: Highlighter | undefined;
let highlighterPromise: Promise<Highlighter> | undefined;

export const SHIKI_THEMES = { light: 'catppuccin-latte', dark: 'catppuccin-mocha' };

export async function getHighlighterSingleton(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  /* istanbul ignore else */
  if (!highlighterPromise) {
    const started = performance.now();
    log.debug(color.event('Initializing Shiki highlighter'));
    highlighterPromise = import('shiki')
      .then((shiki) =>
        shiki.createHighlighter({
          themes: Object.values(SHIKI_THEMES),
          langs: [],
        })
      )
      .then((h) => {
        highlighter = h;
        log.debug(
          color.event('Initialized Shiki highlighter'),
          'in',
          color.timing(`${Math.round(performance.now() - started)}ms`)
        );
        return h;
      })
      .catch(() => {
        highlighterPromise = undefined;
        throw new Error(
          `\n\n[AirLib] Shiki is not installed.\n` +
            `Please run \`npm install shiki @shikijs/rehype @shikijs/transformers\` or add them to your package manager.\n\n`
        );
      });
  }
  return highlighterPromise;
}

export type HighlightOptions = {
  lang: string;
  title?: string;
  transformers?: ShikiTransformer[];
  options?: Partial<CodeToHastOptions<string, string>>;
};

export async function highlightCode(code: string, opts: HighlightOptions) {
  const h = await getHighlighterSingleton();

  /* istanbul ignore else */
  if (opts.lang && !h.getLoadedLanguages().includes(opts.lang)) {
    try {
      await h.loadLanguage(opts.lang as BundledLanguage);
    } catch {
      log.warn(`Failed to load Shiki language: ${opts.lang}`);
    }
  }

  const options = opts.options || {};
  const airTransformers = await getAirTransformers();
  const transformers = [...airTransformers, ...(opts.transformers ?? []), ...(options.transformers ?? [])];

  const html = h.codeToHtml(code, {
    lang: opts.lang,
    defaultColor: false,
    themes: SHIKI_THEMES,
    ...options,
    transformers,
  } as CodeToHastOptions<string, string>);

  return { code, html, lang: opts.lang, title: opts.title };
}

interface ShikiContextOptions {
  lang?: string;
  meta?: {
    __raw?: string;
  };
}

export function airEmulatePrettyCode(): ShikiTransformer {
  return {
    name: 'air:emulate-pretty-code',
    code(node) {
      const options = (this as unknown as { options: ShikiContextOptions }).options;
      node.properties = node.properties || {};

      if (options.meta?.__raw) {
        node.data = node.data || {};
        (node.data as Record<string, unknown>).meta = options.meta.__raw;
        Object.assign(node.properties, getMetaAttributes(node.data.meta!));
      }

      if (options.lang) {
        node.properties['data-language'] = options.lang as string;
      }

      node.properties.style = `${node.properties.style ?? ''}display: grid;`;
    },
    line(node) {
      node.properties = node.properties || {};
      node.properties['data-line'] = '';

      if (!node.children || node.children.length === 0) {
        node.children = [{ type: 'text', value: '\n' }];
      }
    },
    root(node) {
      const preElement = node.children?.[0] as AnyType;

      if (preElement?.tagName === 'pre') {
        const code = preElement.children?.[0] as AnyType;
        if (code?.properties?.executable === 'hidden') {
          node.children = [];
          return;
        }

        node.children = [
          {
            type: 'element',
            tagName: 'figure',
            properties: { ...code?.properties },
            children: [preElement],
          },
        ];
      }
    },
  };
}

export async function getAirTransformers(): Promise<ShikiTransformer[]> {
  const transformers = await import('@shikijs/transformers');
  return [
    airEmulatePrettyCode(),
    transformers.transformerNotationDiff(),
    transformers.transformerNotationHighlight(),
    transformers.transformerNotationWordHighlight(),
    transformers.transformerNotationFocus(),
    transformers.transformerNotationErrorLevel(),
  ];
}

export function wrapHighlightJsx(opts: { framework: Framework; html: string }): string {
  const { framework, html } = opts;

  const innerHTML = html.replace(/^<figure[^>]*>/, '').replace(/<\/figure>$/, '');

  if (framework === 'react') {
    return `
if (import.meta.hot) import.meta.hot.accept();
export default function HighlightedCode(props) {
  return <div className="air-code-hihlight" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(innerHTML)} }} {...props} />;
}
`;
  }

  return `
if (import.meta.hot) import.meta.hot.accept();
export default function HighlightedCode(props) {
  return <div class="air-code-hihlight" innerHTML={${JSON.stringify(innerHTML)}} {...props} />;
}
`;
}

export function getMetaAttributes(meta: string) {
  const attributes = {
    'data-title': meta.split(']')[0].replace(/\[/, ''),
  } as Record<string, AnyType>;

  meta.split(/\s+/g).forEach((candidate) => {
    const [key, value] = candidate.split('=');

    if (/^[\w\d\-_]+$/.test(key)) {
      try {
        attributes[key] = JSON.parse(value ?? '');
      } catch {
        attributes[key] = '';
      }
    }
  });

  return attributes;
}

export function getNodeTitle(node: AnyType) {
  const firstChild = node.children?.[0] as AnyType;
  let title: string | undefined = node.attributes?.title;
  if (firstChild?.data?.directiveLabel) {
    title = getLeafNode(firstChild)?.value ?? title;
    node.children = node.children!.slice(1);
  }
  return title;
}
