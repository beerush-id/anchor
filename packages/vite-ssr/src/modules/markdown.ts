import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { compile, type CompileOptions as MdxOptions } from '@mdx-js/mdx';
import type { Node } from 'mdast';
import type { Options as RehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { AnyType } from 'src/types.ts';
import type { PluggableList, Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { color, taggedLogger } from '../logger.js';
import { stripFrontmatter } from '../utils/frontmatter.js';
import { wrapJsx } from '../utils/jsx.js';
import type { FileMap } from '../utils/mapper.js';
import { createMatcher } from '../utils/matcher.js';
import { AIR_ENV, type Framework } from './env.js';
import { META_STORE } from './metadata.js';
import type { RouteResolution } from './route-store.js';

const log = taggedLogger('air-markdown');

/**
 * The id relative to the pages directory, for log identifiers. Files outside
 * the pages directory (temp fixtures, build artifacts) fall back to their
 * basename — a relative walk outside the project leaks the absolute path.
 */
export const relToPages = (id: string) => {
  const file = id.split('?')[0];
  const rel = path.relative(path.resolve(AIR_ENV.viteRoot, AIR_ENV.pagesDir), file);
  return rel.startsWith('..') ? path.basename(file) : rel;
};

export type MdxHeading = {
  id: string;
  text: string;
  depth: number;
};

/**
 * Configuration for the optional remark/rehype plugins (GFM, directives,
 * heading ids, code highlighting). Passed via `MdxModuleOptions.extended`;
 * `false` disables the plugins entirely.
 */
export type MdxExtendedOptions = {
  search?: boolean | { include?: string[]; exclude?: string[] };
  remarkGfm?: RemarkGfmOptions;
  rehypeAutolinkHeadings?: RehypeAutolinkHeadingsOptions;
  rehypePrettyCode?: RehypePrettyCodeOptions;
};

/**
 * Compilation options for MdxModule: MDX compile options (minus the plugin
 * arrays, which are extended by the framework) plus the markdown extensions
 * treated as pages, the heading depth to record, and post-compile hooks.
 */
export type MdxModuleOptions = Omit<MdxOptions, 'remarkPlugins' | 'rehypePlugins' | 'mdxExtensions'> & {
  include: string[];
  extended: boolean | MdxExtendedOptions;
  headingDepth: number;
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
  postProcesses?: Array<(ctx: MdxModule) => void | Promise<void>>;
};

export interface MarkdownNode extends Node {
  name?: string;
  lang?: string;
  meta?: string;
  data?: Record<string, unknown>;
  depth?: number;
  value?: string;
  children?: HTMLNode[];
  properties?: Record<string, unknown>;
}

export interface HTMLNode extends MarkdownNode {
  tagName: string;
  properties?: Record<string, string>;
}

export const MDX_DEFAULT_OPTIONS: MdxModuleOptions = {
  include: ['.md', '.mdx'],
  extended: true,
  headingDepth: 3,
  remarkPlugins: [],
  rehypePlugins: [],
};

/**
 * Compiles one MDX source into framework JSX. Compilation is deferred until
 * the optional remark/rehype plugins are loaded; the compiled output is split
 * into a module head and an MDX content function, assembled by `toString()`.
 * Metadata and headings are captured on the instance during compilation.
 */
export class MdxModule {
  public options: MdxModuleOptions;
  public headings: MdxHeading[] = [];
  public metadata: Record<string, unknown> = {};
  public initialized = false;

  public output: string = '';
  public locals: string[] = [];
  public globals: string[] = [];

  public tree?: HTMLNode;

  /**
   * @param id Module id — the absolute path of the MDX source.
   * @param options Compilation options (see `MdxModuleOptions`); defaults applied.
   */
  constructor(
    public id: string,
    options?: Partial<MdxModuleOptions>
  ) {
    this.options = {
      ...MDX_DEFAULT_OPTIONS,
      ...options,
      remarkPlugins: [...(options?.remarkPlugins ?? [])],
      rehypePlugins: [...(options?.rehypePlugins ?? [])],
      postProcesses: [...(options?.postProcesses ?? [])],
    };
  }

  public async compile(code: string) {
    const started = performance.now();
    log.debug(color.event('Compiling'), color.file(relToPages(this.id)));

    if (!this.initialized) {
      await this.loadPlugins();
      log.verbose(color.event('Applied'), 'remark/rehype plugins');
    }

    this.locals = [];
    this.globals = [];

    const { id, options } = this;
    const { include, remarkPlugins, rehypePlugins, postProcesses = [] } = options;

    this.metadata = META_STORE.resolve(id, code);
    const body = stripFrontmatter(code);
    log.verbose(color.event('Resolved'), 'frontmatter metadata');

    // Compilation errors propagate to the bundler: a broken MDX file must fail
    // the build instead of silently compiling to a blank module.
    const file = await compile(
      { path: id, value: body },
      { ...options, jsx: true, mdxExtensions: include, remarkPlugins, rehypePlugins, recmaPlugins: [airRecmaPlugin] }
    );
    log.verbose(color.event('Compiled'), 'MDX source');

    const postProcessors = [...postProcesses];

    const [source] = file.toString().split('export default function MDXContent');
    let [head, content] = source.split('function _createMdxContent');

    content = `function AirMdxContent${content}`;

    this.locals.push(content);
    this.globals.push(head);
    this.globals.push(`const airMdxMeta = ${JSON.stringify(this.metadata)};\n`);
    this.globals.push(`const airMdxHeadings = ${JSON.stringify(this.headings)};\n`);
    log.verbose(color.event('Split'), 'MDX content into head and body');

    if (postProcessors.length) log.verbose(color.event('Ran'), `${postProcessors.length} post-processors`);
    for (const handler of postProcessors) {
      try {
        await handler(this);
      } catch (error) {
        log.error(`Post-processing failed for ${relToPages(this.id)}`, error as Error);
      }
    }
    log.info(
      color.event('Compiled'),
      color.file(relToPages(this.id)),
      'in',
      color.timing(`${Math.round(performance.now() - started)}ms`)
    );
  }

  public toString() {
    const head = this.globals.join('\n');
    const body = this.locals.join('\n');

    this.output = wrapJsx(AIR_ENV.framework, head, body);
    log.verbose(color.event('Wrapped'), 'JSX output');

    return this.output;
  }

  private async loadPlugins() {
    this.initialized = true;

    const { extended, remarkPlugins, rehypePlugins } = this.options as MdxModuleOptions;

    if (extended === false) return;

    const { remarkPlugins: remark, rehypePlugins: rehype } = await loadExtendedPlugins(this);
    remarkPlugins.unshift(...remark);
    rehypePlugins.unshift(...rehype);
  }
}

export function airRecmaPlugin(cb?: (e: { hasLink: boolean }) => void) {
  let hasLink = false;

  const visit = (node: AnyType) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXElement') {
      if (node.openingElement) visit(node.openingElement);
      if (node.closingElement) visit(node.closingElement);
    }

    // Unwrap `_components.XXX` to `XXX`.
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXClosingElement') {
      if (node.name.type === 'JSXMemberExpression' && node.name.object.name === '_components') {
        let tagName = node.name.property.name;

        if (tagName === 'a') {
          hasLink = true;
          tagName = 'AirLink';
        }

        node.name = {
          type: 'JSXIdentifier',
          name: tagName,
        };
      }
    }

    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else {
        visit(child);
      }
    }
  };

  return (tree: AnyType) => {
    visit(tree);
    cb?.({ hasLink });
  };
}

/**
 * Builds the routed entry module for an MDX page: binds the compiled chunk
 * to its derived route export via a lazy `renderAsync` wrapper.
 *
 * Returns `undefined` when the file should not become an entry — a `page.mdx`
 * in a folder whose page kind is `tsx` attaches nothing (tsx wins).
 *
 * @param opts.file Absolute path of the MDX file.
 * @param opts.resolution The route identity resolved for the file.
 * @param opts.framework Target UI framework for the entry import.
 * @param opts.files Resolved file name map.
 * @param opts.chunkName Import specifier of the compiled chunk (e.g. `./page.mdx?chunk`).
 */
export function mdxEntryWrapper(opts: {
  file: string;
  resolution: RouteResolution;
  framework: Framework;
  files: FileMap;
  chunkName: string;
}): string | undefined {
  const { file, resolution, framework, files, chunkName } = opts;
  const base = path.basename(file);

  if (!base.endsWith('.mdx')) return undefined;
  if (base === files.pageMdx && resolution.node.page === 'tsx') return undefined;

  const routeName = resolution.exportName;
  const routePath = `./${files.route}`;

  return [
    `import { page as __airPage } from '@anchorlib/${framework}';`,
    `import { ${routeName} as __airRoute } from '${routePath}';`,
    `if (import.meta.hot) import.meta.hot.accept();`,
    `export default __airPage(__airRoute).renderAsync(async () => {`,
    `  const chunkModule = await import('${chunkName}')`,
    `  return chunkModule.default;`,
    `});`,
  ].join('\n');
}

/**
 * Compiles an MDX source and returns the compiled module code plus the
 * MdxModule instance.
 *
 * @param id Module id — the absolute path of the MDX source.
 * @param code Raw MDX source text.
 * @param options Compilation options (see `MdxModuleOptions`).
 * @returns `{ id, file, code }` — the instance and its compiled module code.
 */
export async function mdxFile(id: string, code: string, options: Partial<MdxModuleOptions> = {}) {
  const file = new MdxModule(id, options);
  await file.compile(code);
  return { id, file, code: file.toString() };
}

export type ExtendedPlugins = Array<{ default: unknown }>;

// Hoisted singleton: the heavy optional AST plugins are resolved into memory
// exactly once per process instead of being dynamically imported inside the
// per-file compilation pipeline.
let extendedImportPromise: Promise<ExtendedPlugins> | undefined;
export const importExtended = (): Promise<ExtendedPlugins> => {
  if (!extendedImportPromise) {
    const started = performance.now();
    log.debug(color.event('Loading remark/rehype plugins'));
    extendedImportPromise = Promise.all([
      import('remark-gfm'),
      import('remark-directive'),
      import('rehype-slug'),
      import('rehype-autolink-headings'),
      import('rehype-pretty-code'),
    ])
      .then((plugins) => {
        log.debug(
          color.event('Loaded remark/rehype plugins'),
          'in',
          color.timing(`${Math.round(performance.now() - started)}ms`)
        );
        return plugins;
      })
      .catch(() => {
        throw new Error(
          `\n\n[AIR Stack] Docs mode is enabled, but required plugins are missing.\n` +
            `Please ensure the following plugins are in your plugin catalog and installed:\n\n` +
            `  - remark-gfm\n` +
            `  - remark-directive\n` +
            `  - rehype-slug\n` +
            `  - rehype-autolink-headings\n` +
            `  - rehype-pretty-code\n\n`
        );
      });
  }

  return extendedImportPromise;
};

/**
 * Resolves the remark/rehype plugin list for an MdxModule from its `extended`
 * option, configured per-plugin. The plugins themselves come from the hoisted
 * `importExtended()` singleton.
 *
 * @param module The MdxModule whose `extended` option configures the plugins.
 */
export async function loadExtendedPlugins(module: MdxModule) {
  const { extended } = module.options;
  const options = (typeof extended === 'object' && extended ? extended : {}) as MdxExtendedOptions;

  const [gfm, directive, slug, autolink, prettyCode] = await importExtended();

  // Remark Plugins.
  const remarkPlugins: PluggableList = [
    [gfm.default as Plugin, { ...options.remarkGfm }],
    [directive.default as Plugin, {}],
    [airMdxRemark, module],
  ];

  // Rehype plugins.
  const shikiTheme = { light: 'catppuccin-latte', dark: 'catppuccin-mocha' };
  const shikiOptions = { theme: shikiTheme, ...options.rehypePrettyCode };

  const rehypePlugins: PluggableList = [
    [slug.default as Plugin, {}],
    [autolink.default as Plugin, { ...options.rehypeAutolinkHeadings, behavior: 'wrap' }],
    [prettyCode.default as Plugin, shikiOptions],
    [airMdxRehype, module],
  ];

  // rehypePlugins.push([prettyCode.default as Plugin, shikiOptions]);

  return { remarkPlugins, rehypePlugins };
}

/**
 * Remark plugin for an MdxModule: tags directives as admonitions, maps
 * `code-group` directives to `AirCodeGroup`, and moves `script` directive
 * bodies into the module's globals or locals.
 *
 * @param module The MdxModule to capture scripts into; omit for a standalone
 *   transform.
 */
export function airMdxRemark(module?: MdxModule) {
  return (tree: MarkdownNode) => {
    visit(tree, (node) => {
      const data = node.data || (node.data = {});

      if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
        data.hProperties = {
          ...node.properties,
          className: [`admonition`, node.name],
        };

        if (node.name === 'code-group') {
          data.hName = 'AirCodeGroup';
        } else {
          data.hName = 'div';
        }

        if (node.name === 'script') {
          for (const code of node.children ?? []) {
            if (code.lang !== 'js' && code.lang !== 'ts') {
              code.type = 'paragraph';
              code.value = '';
              continue;
            }

            if (code.value && module) {
              if (code.meta?.includes('module')) {
                module.globals.push(code.value);
              } else {
                module.locals.push(code.value);
              }
            }
          }

          node.type = 'paragraph';
          node.value = '';
          node.children = [];
        }
      }

      if (node.type === 'code' && node.meta) {
        data.meta = node.meta;
      }
    });
  };
}

/**
 * Rehype plugin for an MdxModule: normalizes heading ids and records the
 * module's headings, filtered by `headingDepth`.
 *
 * @param module The MdxModule to record headings on; omit for a standalone
 *   transform.
 */
export function airMdxRehype(module?: MdxModule) {
  return (tree: HTMLNode) => {
    const headings = [] as MdxHeading[];

    visit(tree, (node) => {
      const data = (node.data || (node.data = {})) as AnyType;
      const props = node.properties || (node.properties = {});

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
        props.id = (props.id ?? '').replace(/[-]+/g, '-');

        const text = getLeafNode(node);
        if (text?.value) {
          headings.push({
            id: props.id,
            text: text.value,
            depth: Number(node.tagName.charAt(1)),
          });
        }
      }

      if (node.tagName === 'code' && data.meta) {
        const [meta] = data.meta.match(/[\w\d\s\-_]+/gi) ?? [];
        props['data-title'] = meta;
      }
    });

    if (module) {
      const { headingDepth } = module.options;
      module.tree = tree;
      module.headings = headings.filter((h) => h.depth <= headingDepth!);
    }
  };
}

/**
 * Returns a predicate matching a file id against the given markdown extensions.
 *
 * @param include Markdown extensions to match (defaults to `['.md', '.mdx']`).
 */
export function mdxMatcher(include: string[] = MDX_DEFAULT_OPTIONS.include) {
  return createMatcher(include);
}

/**
 * Depth-first search for the first descendant of the given node type.
 *
 * @param node Root of the search.
 * @param type Node type to find (default `'text'`).
 */
export function getLeafNode(node: MarkdownNode, type = 'text'): MarkdownNode | undefined {
  if (node.type === type) return node;

  if (node.children) {
    for (const child of node.children) {
      const result = getLeafNode(child, type);
      if (result) return result;
    }
  }
}
