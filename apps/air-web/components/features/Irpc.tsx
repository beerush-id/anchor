import { Link, setup } from '@airlib/react';
import { remoteFunctionIndexRoute } from '../../pages/(docs)/remote-function/route.js';
import IrpcDemo from './IrpcDemo.mdx';

export const Irpc = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-mdx air-feature-demo">
            <IrpcDemo />
          </div>

          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">IRPC</span>
            <h2 className="air-feature-title">APIs as Functions</h2>
            <p className="air-feature-body">
              IRPC (Isomorphic RPC) — makes your API a set of typed functions. Declare the function, bind the
              implementation, and using it from client or server really is just calling a function.
            </p>
            <p className="air-feature-body">
              Calls made in the same microtask fold into a single request, each result delivered as it's ready. And
              because calls bind to reactive state, a changed dependency refetches them automatically — batched again.
            </p>
            <Link to={remoteFunctionIndexRoute} className="air-feature-more">
              Learn APIs as functions &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});
