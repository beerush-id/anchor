import { ROUTE_TYPE } from './enum.js';
import type { RouteEntry, SitemapConfig, SitemapEntry, UnknownRoute } from './types.ts';

/**
 * Generates an XML sitemap from route entries.
 *
 * @param entries - The list of route entries
 * @param config - Optional sitemap configuration
 * @param defaultBaseUrl - Default base URL from router options
 * @returns The formatted XML sitemap string
 */
export async function generateSitemap(
  entries: RouteEntry[],
  config?: SitemapConfig,
  defaultBaseUrl?: string
): Promise<string> {
  const baseUrl = (config?.baseUrl ?? defaultBaseUrl ?? '').replace(/\/$/, '');
  const sitemapEntries: SitemapEntry[] = [];

  for (const [, val] of entries) {
    if (val.isIndex) continue;
    const route = val.route;

    if (config?.exclude?.length) {
      let current: UnknownRoute | undefined = route;
      let isExcluded = false;
      while (current) {
        if (config.exclude.includes(current)) {
          isExcluded = true;
          break;
        }
        current = current.parent;
      }
      if (isExcluded) continue;
    }

    const options = route.options ?? {};
    const sitemapOpt = options.sitemap;

    // Explicit exclusion
    if (sitemapOpt === false) {
      continue;
    }

    if (typeof sitemapOpt === 'function') {
      const generated = await sitemapOpt(route);
      const items = Array.isArray(generated) ? generated : [generated];

      const autoAlternates: { hreflang: string; href: string }[] = [];
      for (const item of items) {
        if (item && typeof item === 'object' && item.hreflang && item.loc) {
          autoAlternates.push({ hreflang: item.hreflang, href: item.loc });
        }
      }

      for (const item of items) {
        if (!item) continue;

        let loc = '';
        let nested = false;
        let attrs: SitemapEntry = {};

        if (typeof item === 'string') {
          loc = item;
        } else if (typeof item === 'object') {
          loc = item.loc ?? '';
          nested = !!item.nested;
          attrs = { ...item };
          delete attrs.nested;
          delete attrs.loc;

          if (autoAlternates.length > 1 && item.hreflang) {
            const existing = attrs.alternates ?? [];
            const merged = new Map(existing.map((a) => [a.hreflang, a.href]));
            for (const alt of autoAlternates) {
              if (!merged.has(alt.hreflang)) {
                merged.set(alt.hreflang, alt.href);
              }
            }
            attrs.alternates = Array.from(merged, ([hreflang, href]) => ({ hreflang, href }));
          }
        }

        if (nested) {
          // Traverse down and map all static child routes
          const parentPath = val.toString();
          const childEntries = route.entries();

          for (const [, childVal] of childEntries) {
            /* v8 ignore next 3 */
            if (childVal.isIndex) {
              continue;
            }
            const childRoute = childVal.route;
            const childSitemapOpt = childRoute.options?.sitemap;

            if (childSitemapOpt === false) continue;

            // We only map over static descendants or overrides
            if (childVal.type !== ROUTE_TYPE.STATIC && typeof childSitemapOpt !== 'object') continue;

            const childPath = childVal.toString();
            // Replace the parent unresolved segment with the concrete loc prefix
            const mappedLoc = childPath.replace(parentPath, loc);

            if (typeof childSitemapOpt === 'object' && childSitemapOpt !== null && childSitemapOpt.loc) {
              const childAlternates = childSitemapOpt.alternates?.map((a) => ({
                ...a,
                href: a.href.replace(parentPath, loc),
              }));

              sitemapEntries.push({
                ...childSitemapOpt,
                loc: childSitemapOpt.loc.replace(parentPath, loc),
                ...(childAlternates ? { alternates: childAlternates } : {}),
              });
            } else if (childVal.type === ROUTE_TYPE.STATIC) {
              const mergedAttrs =
                typeof childSitemapOpt === 'object' && childSitemapOpt !== null
                  ? { ...attrs, ...childSitemapOpt }
                  : { ...attrs };

              if (mergedAttrs.alternates) {
                mergedAttrs.alternates = mergedAttrs.alternates.map((a) => ({
                  ...a,
                  href: childPath.replace(parentPath, a.href),
                }));
              }

              sitemapEntries.push({ ...mergedAttrs, loc: mappedLoc });
            }
          }
        } else {
          sitemapEntries.push({ ...attrs, loc });
        }
      }
    } else if (typeof sitemapOpt === 'object' && sitemapOpt !== null && sitemapOpt.loc) {
      // Explicit location overriding anything else
      sitemapEntries.push(sitemapOpt);
    } else if (val.type === ROUTE_TYPE.STATIC) {
      // Normal static emission
      const pathStr = val.toString();

      // Skip static routes that contain unresolved parameters (they must be generated via nested parent)
      if (pathStr.includes('/:')) {
        continue;
      }

      if (typeof sitemapOpt === 'object' && sitemapOpt !== null) {
        sitemapEntries.push({
          ...sitemapOpt,
          loc: pathStr,
        });
      } else if (sitemapOpt === true || sitemapOpt === undefined) {
        sitemapEntries.push({ loc: pathStr });
      }
    }
  }

  const isIndex = config?.type === 'index' || config?.type === 'sitemapindex';
  const itemTag = isIndex ? 'sitemap' : 'url';
  const rootTag = isIndex ? 'sitemapindex' : 'urlset';

  const seenUrls = new Set<string>();

  const urlsXml = sitemapEntries
    .map((entry) => {
      if (!entry.loc) return '';
      let loc = entry.loc;
      if (!loc.startsWith('http://') && !loc.startsWith('https://')) {
        loc = `${baseUrl}${loc.startsWith('/') ? loc : `/${loc}`}`;
      }

      if (loc.endsWith('/') && loc.split('/').length > 4) {
        loc = loc.slice(0, -1);
      }

      if (seenUrls.has(loc)) return '';
      seenUrls.add(loc);

      const tags = [`<loc>${loc}</loc>`];

      if (entry.lastmod) {
        const lastmodStr = entry.lastmod instanceof Date ? entry.lastmod.toISOString() : String(entry.lastmod);
        tags.push(`<lastmod>${lastmodStr}</lastmod>`);
      }

      if (!isIndex) {
        if (entry.changefreq) {
          tags.push(`<changefreq>${entry.changefreq}</changefreq>`);
        }

        if (entry.priority !== undefined) {
          tags.push(`<priority>${entry.priority}</priority>`);
        }

        if (entry.alternates?.length) {
          for (const alt of entry.alternates) {
            let altHref = alt.href;
            if (!altHref.startsWith('http://') && !altHref.startsWith('https://')) {
              altHref = `${baseUrl}${altHref.startsWith('/') ? altHref : `/${altHref}`}`;
            }
            if (altHref.endsWith('/') && altHref.split('/').length > 4) {
              altHref = altHref.slice(0, -1);
            }
            tags.push(`<xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${altHref}" />`);
          }
        }
      }

      return `  <${itemTag}>\n    ${tags.join('\n    ')}\n  </${itemTag}>`;
    })
    .filter(Boolean)
    .join('\n');

  const xmlns = isIndex
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"';

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag} ${xmlns}>\n${urlsXml}\n</${rootTag}>`;
}
