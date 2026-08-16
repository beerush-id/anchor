import type { Framework } from '../modules/env.js';

export function wrapJsx(framework: Framework, head: string, body: string): string {
  if (framework === 'react') {
    return `
import { getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink, render as __airRender } from '@anchorlib/react';

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
      <AirHtmlHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  ), 'AirMdxPage');
}
    `;
  }

  if (framework === 'solid') {
    return `
import { getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink } from '@anchorlib/solid';

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
      <AirHtmlHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  );
}
    `;
  }

  return '';
}
