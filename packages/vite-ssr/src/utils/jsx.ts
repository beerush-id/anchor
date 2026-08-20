import type { Framework } from '../modules/env.js';

export function wrapJsx(framework: Framework, head: string, body: string): string {
  if (framework === 'react') {
    return `
import { getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink } from '@airlib/react';

${head}

export default function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context?.url,
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

  if (framework === 'solid') {
    return `
import { getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink } from '@airlib/solid';

${head}

export default function AirMdxPage({ state: $state, context: $context, children: $children }) {
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
