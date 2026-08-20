import { $symbol, getScope, isBrowser, onCleanup, setScope } from '@airlib/core';
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Comprehensive SEO metadata configuration for web applications.
 */
export interface SEOMeta {
  /** The primary document title and fallback for social cards. */
  title?: string;
  /** A concise explanation of page content for search engines and preview cards. */
  description?: string;
  /** Comma-separated list of relevant keywords for document indexing. */
  keywords?: string | string[];
  /** Document author or publishing organization. */
  author?: string;
  /** The definitive canonical URL for this resource to prevent duplicate indexing. */
  canonical?: string;
  /** Crawling and indexing directives (e.g., 'index, follow', 'noindex'). */
  robots?: string;
  /** Primary brand color for browser toolbars and mobile chrome. */
  themeColor?: string;
  /** Viewport behavior and scale rules for responsive rendering. */
  viewport?: string;
  /** Open Graph metadata for social platform preview cards (Facebook, LinkedIn, Discord). */
  og?: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    image?: string;
    imageAlt?: string;
    siteName?: string;
    locale?: string;
  };
  /** X (formerly Twitter) card specifications. */
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
  };
  /** Cross-linked international language versions or feed alternates. */
  alternates?: {
    hreflang?: string;
    href: string;
    rel?: string;
    type?: string;
  }[];
  /** Structured data payloads (JSON-LD) for rich Google search snippets. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Any additional custom key-value meta tags. */
  custom?: Record<string, string>;
}

/**
 * Properties for the document Head component.
 */
export interface HeadProps {
  /** Comprehensive SEO metadata configuration. */
  meta?: SEOMeta;
  /** Additional manual head tags (e.g., links, custom scripts, font preloads). */
  children?: ReactNode;
}

/**
 * A comprehensive Document Head component optimized for SEO and social unfurling.
 * Automates rendering of title, meta description, Open Graph, X (Twitter) cards,
 * alternates, canonical links, and structured JSON-LD data payloads.
 */
export const Head: FC<HeadProps> = ({ meta, children }) => {
  if (!meta && !children) return null;

  const keywordsStr = Array.isArray(meta?.keywords) ? meta.keywords.join(', ') : meta?.keywords;

  // Derive fallbacks for Open Graph
  const ogTitle = meta?.og?.title ?? meta?.title;
  const ogDesc = meta?.og?.description ?? meta?.description;
  const ogUrl = meta?.og?.url ?? meta?.canonical;

  // Derive fallbacks for X (Twitter)
  const twitterTitle = meta?.twitter?.title ?? ogTitle;
  const twitterDesc = meta?.twitter?.description ?? ogDesc;
  const twitterImage = meta?.twitter?.image ?? meta?.og?.image;
  const twitterCard = meta?.twitter?.card ?? (twitterImage ? 'summary_large_image' : 'summary');

  return (
    <>
      {meta?.title && <Title>{meta.title}</Title>}
      {meta?.description && <Meta name="description" content={meta.description} />}
      {keywordsStr && <Meta name="keywords" content={keywordsStr} />}
      {meta?.author && <Meta name="author" content={meta.author} />}
      {meta?.canonical && <HeadLink rel="canonical" href={meta.canonical} />}
      {meta?.robots && <Meta name="robots" content={meta.robots} />}
      {meta?.themeColor && <Meta name="theme-color" content={meta.themeColor} />}
      {meta?.viewport && <Meta name="viewport" content={meta.viewport} />}

      {ogTitle && <Meta property="og:title" content={ogTitle} />}
      {ogDesc && <Meta property="og:description" content={ogDesc} />}
      {meta?.og?.type && <Meta property="og:type" content={meta.og.type} />}
      {ogUrl && <Meta property="og:url" content={ogUrl} />}
      {meta?.og?.image && <Meta property="og:image" content={meta.og.image} />}
      {meta?.og?.imageAlt && <Meta property="og:image:alt" content={meta.og.imageAlt} />}
      {meta?.og?.siteName && <Meta property="og:site_name" content={meta.og.siteName} />}
      {meta?.og?.locale && <Meta property="og:locale" content={meta.og.locale} />}

      {meta?.twitter && <Meta name="twitter:card" content={twitterCard} />}
      {meta?.twitter?.site && <Meta name="twitter:site" content={meta.twitter.site} />}
      {meta?.twitter?.creator && <Meta name="twitter:creator" content={meta.twitter.creator} />}
      {twitterTitle && (meta?.twitter || meta?.og) && <Meta name="twitter:title" content={twitterTitle} />}
      {twitterDesc && (meta?.twitter || meta?.og) && <Meta name="twitter:description" content={twitterDesc} />}
      {twitterImage && <Meta name="twitter:image" content={twitterImage} />}
      {meta?.twitter?.imageAlt && <Meta name="twitter:image:alt" content={meta.twitter.imageAlt} />}

      {meta?.alternates?.map((alt, index) => (
        <HeadLink
          key={`alternate-${index}`}
          rel={alt.rel ?? 'alternate'}
          href={alt.href}
          hreflang={alt.hreflang}
          type={alt.type}
        />
      ))}

      {meta?.jsonLd && <JsonLd data={meta.jsonLd} />}

      {meta?.custom &&
        Object.entries(meta.custom).map(([key, value]) => <Meta key={`custom-${key}`} name={key} content={value} />)}

      {children}
    </>
  );
};

/**
 * Sets the document title.
 */
export const Title: FC<HTMLAttributes<HTMLTitleElement> & { children: string }> = ({ children }) => {
  const Renderer = () => <title>{children}</title>;

  if (!isBrowser()) {
    ssrHeading('title', { children }, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a meta tag in the document head.
 */
export const Meta: FC<HTMLAttributes<HTMLMetaElement> & { name?: string; property?: string; content?: string }> = (
  props
) => {
  const Renderer = () => <meta {...props} />;

  if (!isBrowser()) {
    const key = `meta:${props.name || props.property}`;
    ssrHeading(key, props as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a link tag in the document head.
 */
export const HeadLink: FC<
  HTMLAttributes<HTMLLinkElement> & {
    href?: string;
    rel?: string;
    as?: string;
    hreflang?: string;
    hrefLang?: string;
    type?: string;
  }
> = (props) => {
  const { hreflang, hrefLang, ...rest } = props;
  const linkProps = { ...rest, ...((hreflang ?? hrefLang) ? { hrefLang: hreflang ?? hrefLang } : {}) };
  const Renderer = () => <link {...linkProps} />;

  if (!isBrowser()) {
    const key = `link:${props.href}`;
    ssrHeading(key, linkProps as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a style tag in the document head.
 */
export const Style: FC<HTMLAttributes<HTMLStyleElement> & { children?: string }> = (props) => {
  const Renderer = () => <style {...props} />;

  if (!isBrowser()) {
    const key = `style:${performance.now()}`;
    ssrHeading(key, props as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets structured JSON-LD data via a script tag in the document head.
 */
export const JsonLd: FC<{ data: Record<string, unknown> | Record<string, unknown>[] }> = ({ data }) => {
  const json = JSON.stringify(data);
  const Renderer = () => <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;

  if (!isBrowser()) {
    const key = `jsonld:${json}`;
    ssrHeading(key, { type: 'application/ld+json', children: json }, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

const HEADING_SET_CLOSURE = $symbol('head-map-closure');

/**
 * Defines a heading reference to be injected into the document head.
 */
export type HeadingRef = {
  name: string;
  props: Record<string, string>;
  Renderer: FC;
};

/**
 * A map of active heading references keyed by their identifier.
 */
export type HeadingMap = Map<string, HeadingRef>;

/**
 * Retrieves the request-isolated map of active heading references.
 *
 * @returns The heading map for the current execution context.
 */
export function headings() {
  let store = getScope<HeadingMap>(HEADING_SET_CLOSURE);

  if (!store) {
    store = new Map();
    setScope(HEADING_SET_CLOSURE, store);
  }

  return store as HeadingMap;
}

/**
 * Collects a heading element for SSR.
 */
function ssrHeading(name: string, props: Record<string, string>, Renderer: FC) {
  headings().set(name, { name, props, Renderer });
  onCleanup(() => headings().delete(name));
}
