import { getContext, mutable, setContext } from '@airlib/core';

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

export interface MdxContext {
  url?: string;
  meta?: Record<string, unknown>;
  headings?: TocHeading[];
}

export const mdxCtx = {
  get() {
    return getContext<MdxContext>('mdx-context');
  },
  set(ctx?: MdxContext) {
    setContext('mdx-context', mutable({ ...ctx }));
  },
};
