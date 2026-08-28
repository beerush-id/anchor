import { Link, setup } from '@airlib/react';
import { stateManagementIndexRoute } from '../../pages/(docs)/state-management/route.js';
import FineGrainedDemo from './FineGrainedDemo.mdx';

export const FineGrained = setup(() => {
  return (
    <section>
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Anchor</span>
            <h2 className="air-feature-title">Fine-Grained Reactivity</h2>
            <p className="air-feature-body">
              Anchor tracks state at the property level. Mutate a single property — in a click handler, an effect, or a
              server stream — and only the exact listeners and DOM nodes subscribed to it update. Nothing else
              re-renders, nothing else crosses the wire.
            </p>
            <p className="air-feature-body">
              The state itself is just a reactive object, decoupled from any UI framework. The same object runs in
              React, SolidJS, and server code, so a mutation on the server reaches the one DOM node reading it — with
              only that property in transit.
            </p>
            <Link to={stateManagementIndexRoute} className="air-feature-more">
              Learn fine-grained reactivity &rarr;
            </Link>
          </div>

          <div className="air-mdx air-feature-demo">
            <FineGrainedDemo />
          </div>
        </div>
      </div>
    </section>
  );
});
