import { Link, setup } from '@airlib/react';
import { docsUniversalSsrRoute } from '../../pages/(docs)/route.js';
import RuntimeVisual from './RuntimeVisual.mdx';

export const Runtime = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-mdx air-feature-demo">
            <RuntimeVisual />
          </div>

          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Runtime</span>
            <h2 className="air-feature-title">One Build, Any Runtime</h2>
            <p className="air-feature-body">
              The whole server — SSR pipeline, IRPC routing, static assets — compiles to a single standard fetch
              handler. Every runtime entry in this codebase imports that same built worker and serves it.
            </p>
            <p className="air-feature-body">
              Bun, Node, Deno, or Cloudflare Workers becomes a deployment choice made after the fact: swap the entry
              file, keep the build.
            </p>
            <Link to={docsUniversalSsrRoute} className="air-feature-more">
              Learn multi-runtime deployment &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});
