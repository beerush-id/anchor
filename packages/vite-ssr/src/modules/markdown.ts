import { compile, type CompileOptions as MdxOptions } from '@mdx-js/mdx';
import type { Node } from 'mdast';
import type { Options as RehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import remarkFrontmatter from 'remark-frontmatter';
import type { Options as RemarkGfmOptions } from 'remark-gfm';
import type { PluggableList } from 'unified';
import { visit } from 'unist-util-visit';
import { parse } from 'yaml';
import { mdxOut } from '../utils/jsx.js';
import { createMatcher } from '../utils/matcher.js';

export type MdxHeading = {
  id: string;
  text: string;
  depth: number;
};

export type MdxExtendedOptions = {
  search?: boolean | { include?: string[]; exclude?: string[] };
  remarkGfm?: RemarkGfmOptions;
  rehypeAutolinkHeadings?: RehypeAutolinkHeadingsOptions;
  rehypePrettyCode?: RehypePrettyCodeOptions;
};

export type MdxModuleOptions = Omit<MdxOptions, 'remarkPlugins' | 'rehypePlugins' | 'mdxExtensions'> & {
  include: string[];
  extended: boolean | MdxExtendedOptions;
  framework?: string;
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
  framework: 'react',
  headingDepth: 3,
  remarkPlugins: [],
  rehypePlugins: [],
};

export class MdxModule {
  public options: MdxModuleOptions;
  public headings: MdxHeading[] = [];
  public metadata: Record<string, unknown> = {};
  public initialized = false;

  public output: string = '';
  public locals: string[] = [];
  public globals: string[] = [];

  public tree?: HTMLNode;

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
    if (!this.initialized) await this.loadPlugins();

    this.locals = [];
    this.globals = [];

    const { id, options } = this;
    const { include, remarkPlugins, rehypePlugins, postProcesses = [] } = options;

    try {
      const file = await compile(
        { path: id, value: code },
        { ...options, jsx: true, mdxExtensions: include, remarkPlugins, rehypePlugins }
      );

      const postProcessors = [...postProcesses];

      const [source] = file.toString().split('export default function MDXContent');
      let [module, content] = source.split('function _createMdxContent');

      // Content post-processes.
      content = `function AirMdxContent${content}`;

      this.locals.push(content);
      this.globals.push(module);
      this.globals.push(`const airMdxMeta = ${JSON.stringify(this.metadata)};\n`);
      this.globals.push(`const airMdxHeadings = ${JSON.stringify(this.headings)};\n`);

      for (const handler of postProcessors) {
        try {
          await handler(this);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  public toString(route?: string) {
    const { framework } = this.options;
    const head = this.globals.join('\n');
    const body = this.locals.join('\n');

    const key = framework as keyof typeof mdxOut;
    if (typeof mdxOut[key] === 'function') {
      this.output = mdxOut[key](head, body, route)!;
    }

    return this.output;
  }

  private async loadPlugins() {
    this.initialized = true;

    const { extended, remarkPlugins, rehypePlugins } = this.options as MdxModuleOptions;

    const remarkPrePlugins = [remarkFrontmatter] as PluggableList;
    const rehypePrePlugins = [] as PluggableList;

    if (extended !== false) {
      const { remarkPlugins: remark, rehypePlugins: rehype } = await loadExtendedPlugins(this);
      remarkPrePlugins.push(...remark);
      rehypePrePlugins.push(...rehype);
    }

    remarkPlugins.unshift(...remarkPrePlugins);
    rehypePlugins.unshift(...rehypePrePlugins);
  }
}

export async function mdxFile(id: string, code: string, options: Partial<MdxModuleOptions> = {}) {
  const file = new MdxModule(id, options);
  await file.compile(code);
  return { id, file, code: file.toString() };
}

export async function loadExtendedPlugins(module: MdxModule) {
  const { extended } = module.options;
  const options = (typeof extended === 'boolean' ? extended : {}) as MdxExtendedOptions;
  const remarkPlugins = [] as PluggableList;
  const rehypePlugins = [] as PluggableList;

  try {
    const [
      { default: remarkGfm },
      { default: remarkDirective },
      { default: rehypeSlug },
      { default: rehypeAutolinkHeadings },
      { default: rehypePrettyCode },
    ] = await Promise.all([
      import('remark-gfm'),
      import('remark-directive'),
      import('rehype-slug'),
      import('rehype-autolink-headings'),
      import('rehype-pretty-code'),
    ]);

    // Remark Plugins.
    remarkPlugins.push([remarkGfm, { ...options.remarkGfm }]);
    remarkPlugins.push([remarkDirective, {}]);
    remarkPlugins.push([airMdxRemark, module]);

    // Rehype plugins.
    rehypePlugins.push([rehypeSlug, {}]);
    rehypePlugins.push([rehypeAutolinkHeadings, { ...options.rehypeAutolinkHeadings, behavior: 'wrap' }]);
    rehypePlugins.push([airMdxRehype, module]);

    const shikiTheme = { light: 'catppuccin-latte', dark: 'catppuccin-mocha' };
    const shikiOptions = { theme: shikiTheme, ...options.rehypePrettyCode };
    rehypePlugins.push([rehypePrettyCode, shikiOptions]);
  } catch {
    throw new Error(
      `\n\n[AIR Stack] Docs mode is enabled, but required plugins are missing.\n` +
        `Please ensure the following plugins are in your plugin catalog and installed:\n\n` +
        `  - remark-gfm\n` +
        `  - remark-directive\n` +
        `  - rehype-slug\n` +
        `  - rehype-autolink-headings\n` +
        `  - rehype-pretty-code\n\n`
    );
  }

  return { remarkPlugins, rehypePlugins };
}

export function airMdxRemark(module?: MdxModule) {
  return (tree: MarkdownNode) => {
    visit(tree, (node) => {
      const data = node.data || (node.data = {});

      if (module && node.type === 'yaml' && node.value) {
        try {
          module.metadata = parse(node.value);
        } catch (e) {
          console.error(e);
        }
      }

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
            // Remove unsupported lang.
            if (code.lang !== 'js' && code.lang !== 'ts') {
              code.type = 'paragraph';
              code.value = '';
              continue;
            }

            // Register scripts in the correct places.
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
    });
  };
}

export function airMdxRehype(module?: MdxModule) {
  return (tree: HTMLNode) => {
    const headings = [] as MdxHeading[];

    visit(tree, (node) => {
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
        const props = node.properties || (node.properties = {});
        props.id = (props.id ?? '').replace(/[\-]+/g, '-');

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

export function mdxMatcher(include: string[] = MDX_DEFAULT_OPTIONS.include) {
  return createMatcher(include);
}

export function getLeafNode(node: MarkdownNode, type = 'text'): MarkdownNode | undefined {
  if (node.type === type) return node;

  if (node.children) {
    for (const child of node.children) {
      const result = getLeafNode(child, type);
      if (result) return result;
    }
  }
}
