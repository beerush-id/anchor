import fs from 'node:fs';
import type { Node } from 'mdast';
import type { MdxModule } from './markdown.js';

export type PipeResolve = <T = unknown>(key: string) => T;

export type PipeNodeDef = {
  /** Volatile nodes recompute on every `get` (cheap, externally-mutable inputs). */
  volatile?: boolean;
  compute: (file: string, resolve: PipeResolve) => unknown;
};

/**
 * Content-addressed artifact graph, independent of Vite.
 *
 * Bridges single-domain pipes: each registered node computes one artifact from
 * a file's `source` (or from other nodes via `resolve`), and results are cached
 * per file until the source text changes. Nodes declaring the same inputs never
 * recompute — e.g. two pipes deriving data from one parse share one artifact.
 *
 * Cache invalidation is driven by content: re-seeding `source(file, text)` with
 * different text drops every derived value for that file. Watchers can force a
 * fresh read with `invalidate(file)`.
 */
export class PipeGraph {
  private nodes = new Map<string, PipeNodeDef>();
  private sources = new Map<string, string>();
  private values = new Map<string, Map<string, unknown>>();

  /** Registers a pipe node. Returns `this` for chaining. */
  public register(key: string, node: PipeNodeDef): this {
    this.nodes.set(key, node);
    return this;
  }

  /** Whether a pipe node is registered under `key`. */
  public has(key: string): boolean {
    return this.nodes.has(key);
  }

  /**
   * Seeds or reads the source text for a file. When `text` is provided and
   * differs from the cached source, all derived artifacts for the file are
   * dropped. Without `text`, lazily reads the file from disk (cached).
   */
  public source(file: string, text?: string): string {
    if (text === undefined) {
      const cached = this.sources.get(file);
      if (cached !== undefined) return cached;
      const read = fs.readFileSync(file, 'utf-8');
      this.sources.set(file, read);
      return read;
    }

    if (this.sources.get(file) !== text) {
      this.sources.set(file, text);
      this.values.delete(file);
    }
    return text;
  }

  /** Resolves the artifact `key` for `file`, computing it on first access. */
  public get<T>(file: string, key: string): T {
    if (key === 'source') return this.source(file) as T;

    const node = this.nodes.get(key);
    if (!node) throw new Error(`[PipeGraph] Unknown pipe node: "${key}".`);

    if (!node.volatile) {
      const fileValues = this.values.get(file);
      if (fileValues?.has(key)) return fileValues.get(key) as T;
    }

    const value = node.compute(file, (k) => this.get(file, k));

    if (!node.volatile) {
      let fileValues = this.values.get(file);
      if (!fileValues) {
        fileValues = new Map();
        this.values.set(file, fileValues);
      }
      fileValues.set(key, value);
    }

    return value as T;
  }

  /** Drops the cached source and every derived artifact for a file. */
  public invalidate(file: string): void {
    this.sources.delete(file);
    this.values.delete(file);
  }
}

export type MdxHeading = {
  id: string;
  text: string;
  depth: number;
};

export type MdxContext = {
  tree: Node;
  body: string;
  module: string;
  content: string;
  headings: MdxHeading[];
  frontmatter: Record<string, unknown>;
};

export class MdxGraph extends Map<string, MdxModule> {}
export const mdxGraph = new MdxGraph();
