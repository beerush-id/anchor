import { $symbol, getScope, isBrowser, onCleanup, setScope } from '@airlib/core';
import type { Component, JSX } from 'solid-js';

const HEADING_SET_CLOSURE = $symbol('head-map-closure');

/**
 * Defines a heading reference to be injected into the document head.
 */
export type HeadingRef = {
  name: string;
  props: Record<string, string>;
  Renderer: Component;
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
 * Attaches a heading element to the document head or collects it for SSR.
 *
 * @param name The tag name (e.g., 'title', 'meta').
 * @param props The attributes to apply to the tag.
 * @param Renderer The Solid component used to render the tag during SSR.
 */
export function attachHeading(name: string, props: Record<string, string>, Renderer: Component) {
  if (!isBrowser()) {
    if (name === 'meta') name = `${name}:${props.name || props.property}`;
    if (name === 'link') name = `${name}:${props.href}`;
    if (name === 'style') name = `${name}:${performance.now()}`;
    if (name === 'script') name = `jsonld:${props.children}`;

    headings().set(name, { name, props, Renderer });

    onCleanup(() => {
      headings().delete(name);
    });

    return;
  }

  if (name === 'title') {
    document.title = props.children;
    return;
  }

  const element = document.createElement(name);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  document.head.appendChild(element);

  onCleanup(() => {
    element.remove();
  });
}

/**
 * Sets the document title.
 */
export function Title(props: JSX.IntrinsicElements['title']) {
  const Renderer = () => <title {...props} />;
  attachHeading('title', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a meta tag in the document head.
 */
export function Meta(props: JSX.IntrinsicElements['meta']) {
  const Renderer = () => <meta {...props} />;
  attachHeading('meta', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a link tag in the document head.
 */
export function HeadLink(props: JSX.IntrinsicElements['link']) {
  const Renderer = () => <link {...props} />;
  attachHeading('link', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a style tag in the document head.
 */
export function Style(props: JSX.IntrinsicElements['style']) {
  const Renderer = () => <style {...props} />;
  attachHeading('style', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets structured JSON-LD data via a script tag in the document head.
 */
export function JsonLd(props: { data: Record<string, unknown> | Record<string, unknown>[] }): JSX.Element {
  const json = () => JSON.stringify(props.data);
  const Renderer = () => <script type="application/ld+json">{json()}</script>;
  attachHeading('script', { type: 'application/ld+json', children: json() }, Renderer);
  return null as unknown as JSX.Element;
}

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
  children?: JSX.Element;
}

/**
 * A comprehensive Document Head component optimized for SEO and social unfurling.
 *
 * Automatically coordinates document titles, descriptive meta tags, Open Graph preview cards,
 * X (Twitter) player/summary cards, canonical links, alternate languages, and JSON-LD data graphs.
 *
 * @param props - Configuration containing SEO parameters and children tag nodes
 * @returns The rendered Head elements
 */
export function Head(props: HeadProps): JSX.Element {
  const meta = props.meta;
  const children = props.children;

  if (!meta && !children) return null as unknown as JSX.Element;

  const keywordsStr = Array.isArray(meta?.keywords) ? meta.keywords.join(', ') : meta?.keywords;
  const ogTitle = meta?.og?.title ?? meta?.title;
  const ogDesc = meta?.og?.description ?? meta?.description;
  const ogUrl = meta?.og?.url ?? meta?.canonical;

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

      {meta?.alternates?.map((alt) => (
        <HeadLink rel={alt.rel ?? 'alternate'} href={alt.href} hreflang={alt.hreflang} type={alt.type} />
      ))}

      {meta?.jsonLd && <JsonLd data={meta.jsonLd} />}

      {meta?.custom && Object.entries(meta.custom).map(([key, value]) => <Meta name={key} content={value} />)}

      {children}
    </>
  );
}
