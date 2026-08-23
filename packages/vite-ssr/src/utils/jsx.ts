import type { Framework } from '../modules/env.js';

export function wrapJsx(framework: Framework, head: string, body: string, template = ''): string {
  const content = template.replace('<!-- air-mdx-outlet -->', '<AirMdxContent />');

  if (framework === 'react') {
    return `
import { anchor as __airAnchor, getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink, onCleanup as __airOnCleanup } from '@airlib/react';

${head}

export default function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    const url = $context?.url;
    Object.assign(__airMdxCtx, {
      url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
    __airOnCleanup(() => {
      const rawCtx = __airAnchor.get(__airMdxCtx);
      if (rawCtx.url === url) {
        delete __airMdxCtx.url;
      }
      if (rawCtx.headings === airMdxHeadings) {
        delete __airMdxCtx.headings;
      }
      if (rawCtx.meta === airMdxMeta) {
        delete __airMdxCtx.meta;
      }
    });
  }

${body}

  return (
    <>
      <AirHtmlHead meta={airMdxMeta} />
      ${content}
    </>
  );
}
    `;
  }

  if (framework === 'solid') {
    return `
import { anchor as __airAnchor, getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink, onCleanup as __airOnCleanup } from '@airlib/solid';

${head}

export default function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    const url = $context?.url;
    Object.assign(__airMdxCtx, {
      url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
    __airOnCleanup(() => {
      const rawCtx = __airAnchor.get(__airMdxCtx);
      if (rawCtx.url === url) {
        delete __airMdxCtx.url;
      }
      if (rawCtx.headings === airMdxHeadings) {
        delete __airMdxCtx.headings;
      }
      if (rawCtx.meta === airMdxMeta) {
        delete __airMdxCtx.meta;
      }
    });
  }

${body}

  return (
    <>
      <AirHtmlHead meta={airMdxMeta} />
      ${content}
    </>
  );
}
    `;
  }

  return '';
}
