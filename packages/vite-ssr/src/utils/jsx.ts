import type { Framework } from '../modules/env.js';

export function wrapJsx(framework: Framework, head: string, body: string): string {
  if (framework === 'react') {
    return `
import { render as __airRender, Head as AirHead, getContext as __airGetCtx } from '@anchorlib/react';

${head}

export function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context.url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
  }

${body}

  return __airRender(() => (
    <>
      <AirHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  ), 'AirMdxPage');
}
    `;
  }

  if (framework === 'solid') {
    return `
import { AirHead, getContext as __airGetCtx } from '@anchorlib/solid';

${head}

export function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context.url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
  }

${body}

  return (
    <>
      <AirHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  );
}
    `;
  }

  return '';
}
