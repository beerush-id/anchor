type FxRenderer = (head: string, body: string, route?: string) => string;

export const mdxOut: { [key: string]: FxRenderer } = {
  react: (head, body, route) => {
    return reactJsxSnippet.replace('/*/-_AIR_CODE_HEAD_-/*/', head).replace('/*/-_AIR_CODE_BODY_-/*/', body);
  },
  solid: (head, body, route) => {
    return solidSnippet.replace('/*/-_AIR_CODE_HEAD_-/*/', head).replace('/*/-_AIR_CODE_BODY_-/*/', body);
  },
};

const reactSnippet = `
import { render as __airRender, Head as __airHeadTag, getContext as __airGetCtx } from '@anchorlib/react';
import { Fragment as __airFragment, jsx as __airJsx, jsxs as __airJsxs } from 'react/jsx-runtime';

/*/-_AIR_CODE_HEAD_-/*/

export function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context.url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
  }

  /*/-_AIR_CODE_BODY_-/*/

  return __airRender(() => __airJsxs(__airFragment, {
    children: [
      __airJsx(__airHeadTag, { meta: airMdxMeta }),
      __airJsx(AirMdxContent, {}),
    ],
  }), 'AirMdxPage');
}
`;

const reactJsxSnippet = `
import { render as __airRender, Head as AirHead, getContext as __airGetCtx } from '@anchorlib/react';

/*/-_AIR_CODE_HEAD_-/*/

export function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context.url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
  }

  /*/-_AIR_CODE_BODY_-/*/

  return __airRender(() => (
    <>
      <AirHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  ), 'AirMdxPage');
}
`;

const solidSnippet = `
import { AirHead, getContext as __airGetCtx } from '@anchorlib/solid';

/*/-_AIR_CODE_HEAD_-/*/

export function AirMdxPage({ state: $state, context: $context, children: $children }) {
  const __airMdxCtx = __airGetCtx('mdx-context');
  if (__airMdxCtx) {
    Object.assign(__airMdxCtx, {
      url: $context.url,
      meta: airMdxMeta,
      headings: airMdxHeadings,
    });
  }

  /*/-_AIR_CODE_BODY_-/*/

  return (
    <>
      <AirHead meta={airMdxMeta} />
      <AirMdxContent />
    </>
  );
}
`;
