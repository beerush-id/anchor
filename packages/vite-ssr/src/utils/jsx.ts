import type { Framework } from '../modules/env.js';

export function wrapJsx(framework: Framework, head: string, body: string, template = ''): string {
  const content = template.replace('<!-- air-mdx-outlet -->', '<AirMdxContent />');

  if (framework === 'react') {
    return `
import { $static, anchor as __airAnchor, getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink, onCleanup as __airOnCleanup, uIndex as __airUIndex } from '@airlib/react';

${head}

const AIR_CG_INDEX_KEY = Symbol.for('air.mdx.codegroup');

export default function AirMdxPage(props) {
  const $state = $static(() => props.state);
  const $context = $static(() => props.context);
  const $children = $static(() => props.children);
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    const url = $static(() => $context?.url);
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

__airUIndex(AIR_CG_INDEX_KEY, true);

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
import { $static, anchor as __airAnchor, getContext as __airGetCtx, Head as AirHtmlHead, Link as AirLink, onCleanup as __airOnCleanup, uIndex as __airUIndex } from '@airlib/solid';

${head}

const AIR_CG_INDEX_KEY = Symbol.for('air.mdx.codegroup');

export default function AirMdxPage(props) {
  const $state = $static(() => props.state);
  const $context = $static(() => props.context);
  const $children = $static(() => props.children);
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    const url = $static(() => $context?.url);
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

__airUIndex(AIR_CG_INDEX_KEY, true);

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
