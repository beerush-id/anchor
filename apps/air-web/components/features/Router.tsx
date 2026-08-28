import { Link, setup } from '@airlib/react';
import { routingIndexRoute } from '../../pages/(docs)/routing/route.js';
import RouterVisual from './RouterVisual.mdx';

export const Router = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Router</span>
            <h2 className="air-feature-title">Assisted Reactive Routing</h2>
            <p className="air-feature-body">
              Routes are a typed tree of code that you own and edit like any other code. The framework's role is
              assistance, not ownership: it scaffolds the repetitive declarations from your file tree, and leaves the
              rest — guards, data providers, redirects — entirely in your hands.
            </p>
            <p className="air-feature-body">
              Route logic is reactive too: guards and data providers track the state they read and re-evaluate
              automatically when it changes, so access rules and loaded data stay as live as the rest of your app.
            </p>
            <Link to={routingIndexRoute} className="air-feature-more">
              Learn assisted routing &rarr;
            </Link>
          </div>

          <div className="air-mdx air-feature-demo">
            <RouterVisual />
          </div>
        </div>
      </div>
    </section>
  );
});
