import { getContext, mutable, setContext } from '@airlib/core';

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

export interface MdxStore {
  [key: string]: unknown;
  pm: string;
  framework: string;
}

export interface MdxContext {
  store: MdxStore;
  url?: string;
  meta?: Record<string, unknown>;
  headings?: TocHeading[];
}

export const mdxCtx = {
  get() {
    return getContext<MdxContext>('mdx-context');
  },
  set(ctx?: MdxContext): MdxContext {
    setContext('mdx-context', mutable({ ...ctx }));
    return getContext('mdx-context')!;
  },
};
