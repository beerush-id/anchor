import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { compile, type CompileOptions as MdxOptions } from '@mdx-js/mdx';
import type { Node } from 'mdast';
import { parseSync } from 'oxc-parser';
import rehypeAutolinkHeadings, { type Options as RehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { AnyType } from 'src/types.ts';
import type { PluggableList, Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { color, taggedLogger } from '../logger.js';
import { stripFrontmatter } from '../utils/frontmatter.js';
import { hashBlock } from '../utils/hash.js';
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
  rehypeAutolinkHeadings?: RehypeAutolinkHeadingsOptions;
};

export interface MarkdownNode extends Node {
  name?: string;
  lang?: string;
  meta?: string;
  data?: Record<string, unknown>;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  properties?: Record<string, unknown>;
  attributes?: Record<string, string>;
}

export interface HTMLNode extends MarkdownNode {
  tagName: string;
  properties?: Record<string, string>;
}

export const MDX_DEFAULT_OPTIONS: MdxModuleOptions = {
  include: ['.md', '.mdx'],
  extended: false,
  headingDepth: 3,
  remarkPlugins: [],
  rehypePlugins: [],
};

type MdxCache = {
  hash: string;
  item: MdxModule;
};
const MDX_CACHE = new Map<string, MdxCache>();

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

  public get extended() {
    return this.options.extended;
  }

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

    const hash = hashBlock(code);
    const cache = MDX_CACHE.get(this.id);

    if (cache && cache.hash === hash) {
      this.locals = cache.item.locals;
      this.globals = cache.item.globals;
      log.debug(color.event('Loaded cache for'), color.file(relToPages(this.id)));
      return;
    }

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
    log.verbose(color.event('Resolved'), 'frontmatter metadata');

    const body = stripFrontmatter(code);

    if (this.extended) {
      const compSource = `@anchorlib/${AIR_ENV.framework}/mdx`;
      this.globals.push(
        `import { CodeGroup as AirCodeGroup, CodeBlock as AirCodeBlock, Admonition as AirAdmonition, Badge as AirBadge } from '${compSource}';`
      );
      log.verbose(color.event('Injected'), 'mdx component imports');
    }

    rehypePlugins.push(
      rehypeSlug,
      [rehypeAutolinkHeadings, { ...options.rehypeAutolinkHeadings, behavior: 'wrap' }],
      [airMdxHeadings, this]
    );

    const file = await compile(
      { path: id, value: body },
      {
        ...options,
        jsx: true,
        mdxExtensions: include,
        remarkPlugins,
        rehypePlugins,
        recmaPlugins: [airRecmaPlugin],
      }
    );
    log.verbose(color.event('Compiled'), 'MDX source');

    const [source] = file.toString().split('export default function MDXContent');
    let [head, content] = source.split('function _createMdxContent');

    content = `function AirMdxContent${content}`;

    this.locals.push(content);
    this.globals.push(head);
    this.globals.push(`const airMdxMeta = ${JSON.stringify(this.metadata)};\n`);
    this.globals.push(`const airMdxHeadings = ${JSON.stringify(this.headings)};\n`);
    log.verbose(color.event('Split'), 'MDX content into head and body');

    const postProcessors = [...postProcesses];
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

    MDX_CACHE.set(this.id, { hash, item: this });
  }

  public toString() {
    const head = dedupeImports(this.globals.join('\n'));
    const body = this.locals.join('\n');

    this.output = wrapJsx(AIR_ENV.framework, head, body);
    log.verbose(color.event('Wrapped'), 'JSX output');

    return this.output;
  }

  private async loadPlugins() {
    this.initialized = true;

    if (!this.extended) return;

    const { remarkPlugins, rehypePlugins } = this.options as MdxModuleOptions;
    const { remarkPlugins: remark, rehypePlugins: rehype } = await loadExtendedPlugins(this);

    remarkPlugins.unshift(...remark);
    rehypePlugins.unshift(...rehype);
  }
}

export function airRecmaPlugin(cb?: (e: { hasLink: boolean }) => void) {
  let hasLink = false;

  const filterStatements = (statements: AnyType[]) => {
    return statements.filter((stmt) => {
      if (stmt.type === 'VariableDeclaration') {
        const isComponentsDecl = stmt.declarations.some(
          (d: AnyType) =>
            (d.id.type === 'Identifier' && d.id.name === '_components') ||
            (d.init?.type === 'Identifier' && d.init.name === '_components')
        );
        if (isComponentsDecl) return false;
      }

      if (stmt.type === 'IfStatement') {
        const isMissingRefCheck =
          stmt.consequent?.type === 'ExpressionStatement' &&
          stmt.consequent.expression?.type === 'CallExpression' &&
          stmt.consequent.expression.callee?.name === '_missingMdxReference';
        if (isMissingRefCheck) return false;
      }

      return true;
    });
  };

  const visit = (node: AnyType) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'BlockStatement' || node.type === 'Program') {
      if (Array.isArray(node.body)) {
        node.body = filterStatements(node.body);
      }
    }

    if (node.type === 'JSXElement') {
      if (node.openingElement) visit(node.openingElement);
      if (node.closingElement) visit(node.closingElement);
    }

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
      } else if (child && typeof child === 'object') {
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
  route: RouteResolution;
  framework: Framework;
  files: FileMap;
  chunkName: string;
}): string {
  const { route, framework, files, chunkName } = opts;
  const routeName = route.exportName;
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

let extendedImportPromise: Promise<ExtendedPlugins> | undefined;
export const importExtended = (): Promise<ExtendedPlugins> => {
  if (!extendedImportPromise) {
    const started = performance.now();
    log.debug(color.event('Loading remark/rehype plugins'));
    extendedImportPromise = Promise.all([
      import('remark-gfm'),
      import('remark-directive'),
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

  const [gfm, directive, prettyCode] = await importExtended();

  const remarkPlugins: PluggableList = [
    [gfm.default as Plugin, { ...options.remarkGfm }],
    [directive.default as Plugin, {}],
    [airMdxRemark, module],
  ];

  const shikiTheme = { light: 'catppuccin-latte', dark: 'catppuccin-mocha' };
  const shikiOptions = { theme: shikiTheme, ...options.rehypePrettyCode };

  const rehypePlugins: PluggableList = [
    [prettyCode.default as Plugin, shikiOptions],
    [airMdxRehype, module],
  ];

  return { remarkPlugins, rehypePlugins };
}

const ADMONITION_TYPES = new Set(['note', 'tip', 'info', 'warning', 'danger', 'important', 'caution', 'details']);

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
    visit(tree, (node: MarkdownNode) => {
      const data = node.data || (node.data = {});

      if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
        if (node.name === 'code-group') {
          data.hName = 'AirCodeGroup';
          data.hProperties = {
            ...node.properties,
          };
        } else if (ADMONITION_TYPES.has(node.name!)) {
          const firstChild = node.children?.[0] as AnyType;
          let title: string | undefined = node.attributes?.title;

          if (firstChild?.data?.directiveLabel) {
            title = getLeafNode(firstChild)?.value ?? title;
            node.children = node.children!.slice(1);
          }

          data.hName = 'AirAdmonition';
          data.hProperties = {
            ...node.properties,
            title,
            type: node.name,
          };
        } else if (node.name === 'badge') {
          let text = '';
          const firstChild = node.children?.[0] as AnyType;
          if (firstChild?.data?.directiveLabel) {
            text = getLeafNode(firstChild)?.value ?? '';
            node.children = node.children!.slice(1);
          } else if (node.children?.length) {
            text = getLeafNode(node)?.value ?? '';
            node.children = [];
          }

          const variant = node.attributes?.type ?? node.attributes?.variant ?? 'neutral';

          data.hName = 'AirBadge';
          data.hProperties = {
            ...node.properties,
            variant,
            children: text || node.attributes?.text,
          };
        } else {
          data.hName = 'div';
          data.hProperties = {
            ...node.properties,
            className: [node.name, (node.properties as AnyType)?.className].filter(Boolean).join(' '),
          };
        }

        if (node.name === 'interactive') {
          for (const code of node.children!) {
            if (!['js', 'ts', 'tsx', 'jsx'].includes(code.lang as string)) {
              // code.type = 'paragraph';
              // code.value = '';
              continue;
            }

            if (code.value && module) {
              const { head, body } = stripImports(code.value);

              if (head) {
                module.globals.push(head);
              }

              if (body) {
                if (code.meta?.includes('module')) {
                  module.globals.push(body);
                } else {
                  module.locals.push(body);
                }
              }
            }
          }

          if (node.attributes?.rendered !== 'false') {
            const firstChild = node.children?.[0] as AnyType;
            let title: string | undefined = node.attributes?.title ?? 'Demo';

            if (firstChild?.data?.directiveLabel) {
              title = getLeafNode(firstChild)?.value ?? title;
              node.children = node.children!.slice(1);
            }

            data.hName = 'AirAdmonition';
            data.hProperties = {
              ...node.properties,
              title,
              type: 'details',
              open: true,
            };
          } else {
            node.type = 'paragraph';
            node.value = '';
            node.children = [];
          }
        }
      }

      if (node.type === 'code' && node.meta) {
        data.meta = node.meta;
      }
    });
  };
}

export function airMdxHeadings(module?: MdxModule) {
  return (tree: HTMLNode) => {
    const headings = [] as MdxHeading[];

    visit(tree, (node: HTMLNode) => {
      const props = node.properties || (node.properties = {});

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
        props.id = props.id!.replace(/[-]+/g, '-');

        const text = getLeafNode(node);
        if (text?.value) {
          headings.push({
            id: props.id,
            text: text.value,
            depth: Number(node.tagName.charAt(1)),
          });
        }
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
 * Rehype plugin for an MdxModule: normalizes heading ids and records the
 * module's headings, filtered by `headingDepth`.
 *
 * @param module The MdxModule to record headings on; omit for a standalone
 *   transform.
 */
export function airMdxRehype(module?: MdxModule) {
  return (tree: HTMLNode) => {
    const headings = [] as MdxHeading[];

    visit(tree, (node: HTMLNode) => {
      const data = (node.data || (node.data = {})) as AnyType;

      const props = node.properties || (node.properties = {});

      if (node.tagName === 'figure') {
        node.tagName = 'AirCodeBlock';
        delete props['data-rehype-pretty-code-figure'];
      }

      if (node.tagName === 'code' && data.meta) {
        const [meta] = data.meta.match(/[\w\d\s\-_.]+/gi) ?? [];
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
 * @param key Node key to find the type from (default `'type'`).
 */
export function getLeafNode<N = MarkdownNode>(node: N, type = 'text', key = 'type'): N | undefined {
  const $node = node as MarkdownNode;
  if ($node[key as 'type'] === type) return node;

  if ($node.children) {
    for (const child of $node.children) {
      const result = getLeafNode(child, type);
      if (result) return result as N;
    }
  }
}

/**
 * Extracts top-level ES import statements from a code block using `oxc-parser`,
 * returning the import statements as `head` and the remaining code as `body`.
 */
export function stripImports(code: string): { head: string; body: string } {
  if (!code.includes('import')) {
    return { head: '', body: code.trim() };
  }

  try {
    const parsed = parseSync('snippet.tsx', code, {
      lang: 'tsx',
      sourceType: 'module',
    });

    if (parsed.errors.length === 0 && parsed.program.body) {
      const imports: string[] = [];
      const rangesToCut: Array<{ start: number; end: number }> = [];

      for (const stmt of parsed.program.body as AnyType[]) {
        if (stmt.type === 'ImportDeclaration') {
          imports.push(code.slice(stmt.start, stmt.end).trim());
          rangesToCut.push({ start: stmt.start, end: stmt.end });
        }
      }

      if (rangesToCut.length > 0) {
        let body = '';
        let lastIndex = 0;
        for (const range of rangesToCut) {
          body += code.slice(lastIndex, range.start);
          lastIndex = range.end;
        }
        body += code.slice(lastIndex);

        return {
          head: imports.join('\n'),
          body: body.trim(),
        };
      }
    }
  } catch {
    // Fall back to regex if snippet parsing fails
  }

  const importRegex = /^import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"];?|^import\s+['"][^'"]+['"];?/gm;
  const imports: string[] = [];
  const body = code.replace(importRegex, (match) => {
    imports.push(match.trim());
    return '';
  });

  return { head: imports.join('\n'), body: body.trim() };
}

/**
 * Deduplicates ES import statements in a string of global statements using `oxc-parser`,
 * consolidating multiple imports from the same module source.
 */
export function dedupeImports(head: string): string {
  if (!head.includes('import')) {
    return head.trim();
  }

  type ModuleImports = {
    defaults: Set<string>;
    namespaces: Set<string>;
    named: Set<string>;
    sideEffect: boolean;
  };

  const moduleMap = new Map<string, ModuleImports>();
  let rest = head;

  try {
    const parsed = parseSync('globals.tsx', head, {
      lang: 'tsx',
      sourceType: 'module',
    });

    if (parsed.errors.length === 0 && parsed.program.body) {
      const rangesToCut: Array<{ start: number; end: number }> = [];

      for (const stmt of parsed.program.body as AnyType[]) {
        if (stmt.type === 'ImportDeclaration') {
          rangesToCut.push({ start: stmt.start, end: stmt.end });

          const modPath = stmt.source?.value;
          if (typeof modPath !== 'string') continue;

          if (!moduleMap.has(modPath)) {
            moduleMap.set(modPath, {
              defaults: new Set(),
              namespaces: new Set(),
              named: new Set(),
              sideEffect: false,
            });
          }

          const entry = moduleMap.get(modPath)!;

          if (!stmt.specifiers || stmt.specifiers.length === 0) {
            entry.sideEffect = true;
            continue;
          }

          for (const spec of stmt.specifiers) {
            if (spec.type === 'ImportDefaultSpecifier') {
              if (spec.local?.name) {
                entry.defaults.add(spec.local.name);
              }
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              if (spec.local?.name) {
                entry.namespaces.add(`* as ${spec.local.name}`);
              }
            } else if (spec.type === 'ImportSpecifier') {
              const importedName = spec.imported?.name ?? spec.imported?.value;
              const localName = spec.local?.name;
              const isType = spec.importKind === 'type' || stmt.importKind === 'type';
              const typePrefix = isType ? 'type ' : '';

              if (importedName && localName && importedName !== localName) {
                entry.named.add(`${typePrefix}${importedName} as ${localName}`);
              } else if (localName) {
                entry.named.add(`${typePrefix}${localName}`);
              }
            }
          }
        }
      }

      if (rangesToCut.length > 0) {
        let text = '';
        let lastIndex = 0;
        for (const range of rangesToCut) {
          text += head.slice(lastIndex, range.start);
          lastIndex = range.end;
        }
        text += head.slice(lastIndex);
        rest = text;
      }
    }
  } catch {
    // Ignore parse errors and retain head as-is
  }

  if (moduleMap.size === 0) {
    return head.trim();
  }

  const dedupedImports: string[] = [];

  for (const [modPath, entry] of moduleMap.entries()) {
    if (entry.sideEffect && entry.defaults.size === 0 && entry.namespaces.size === 0 && entry.named.size === 0) {
      dedupedImports.push(`import '${modPath}';`);
      continue;
    }

    const parts: string[] = [];

    if (entry.defaults.size > 0) {
      parts.push([...entry.defaults][0]);
    }

    if (entry.namespaces.size > 0) {
      parts.push([...entry.namespaces][0]);
    }

    if (entry.named.size > 0) {
      parts.push(`{ ${[...entry.named].join(', ')} }`);
    }

    if (parts.length > 0) {
      dedupedImports.push(`import ${parts.join(', ')} from '${modPath}';`);
    }
  }

  const cleanRest = rest
    .split('\n')
    .filter((line, i, arr) => line.trim() !== '' || (i > 0 && arr[i - 1].trim() !== ''))
    .join('\n')
    .trim();

  return [...dedupedImports, cleanRest].filter(Boolean).join('\n');
}
