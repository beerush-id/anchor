import { getContext, mutable, setContext } from '@anchorlib/core';
import type { TocHeading } from './TableOfContent.js';

export type MdxContext = {
  url: string;
  meta: Record<string, unknown>;
  headings: TocHeading[];
};

export const mdxCtx = {
  get() {
    return getContext<MdxContext>('mdx-context');
  },
  set(ctx?: MdxContext) {
    setContext('mdx-context', mutable({ ...ctx }));
  },
};
