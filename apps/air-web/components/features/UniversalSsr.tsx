import { Link, setup } from '@airlib/react';
import { docsUniversalSsrRoute } from '../../pages/(docs)/route.js';
import UniversalSsrVisual from './UniversalSsrVisual.mdx';

export const UniversalSsr = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-mdx air-feature-demo">
            <UniversalSsrVisual />
          </div>

          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Vite Plugin</span>
            <h2 className="air-feature-title">Universal SSR</h2>
            <p className="air-feature-body">
              The same component renders on the server — request-isolated, with live reactive state — and hydrates on
              the client as one continuous code path. It arrives as a Vite plugin that drops into your existing Vite
              config.
            </p>
            <p className="air-feature-body">
              And it reaches further than rendering: extended Markdown content pages, build-time static generation and
              on-demand regeneration for dynamic pages, and sitemaps generated straight from your route tree — all out
              of the box.
            </p>
            <Link to={docsUniversalSsrRoute} className="air-feature-more">
              Learn universal SSR &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});
