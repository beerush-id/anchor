import { classx, cookies, render, Slot, Snippet, setup } from '@airlib/react';
import { type MdxContext, mdxCtx, TableOfContent } from '@airlib/react/mdx';
import type { HTMLAttributes, ReactNode } from 'react';

export interface ArticleLayoutProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export type ArticleLayoutSlots = {
  toc?: (ctx: MdxContext) => ReactNode;
};

/**
 * Centered article and release layout with TOC for air-web.
 */
export const ArticleLayout = setup<ArticleLayoutProps, ArticleLayoutSlots>((props, snippets) => {
  const $restProps = props.$omit(['children', 'className']);
  const store = cookies('mdx-store', { pm: 'bun', framework: 'react', runtime: 'bun' });
  const ctx = mdxCtx.set({ store });

  return render(() => (
    <div {...$restProps} className={classx('air-mdx air-airticle-layout', props.className)}>
      <div className="air-article-inner">
        <div className="air-article-content">
          <Snippet>{() => props.children}</Snippet>
        </div>

        <aside className="air-mdx-aside-right shrink-0" aria-label="Table of contents">
          <Slot for={() => snippets.toc?.(ctx)}>
            <TableOfContent />
          </Slot>
        </aside>
      </div>
    </div>
  ));
}, 'ArticleLayout');
