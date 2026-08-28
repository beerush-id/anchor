import { Link, setup } from '@airlib/react';
import { remoteFunctionTransportRoute } from '../../pages/(docs)/remote-function/route.js';
import BeyondUiDemo from './BeyondUiDemo.mdx';

export const BeyondUi = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.header}>
          <span className={classes.eyebrow}>Beyond UI State</span>
          <h2 className={classes.title}>Real-Time Data from the Edge</h2>
          <p className={classes.body}>
            Reactivity doesn't stop at the UI layer. Mutate state on the server, and fine-grained deltas flow seamlessly
            over HTTP or WebSocket to update only the specific elements subscribed to those keys.
          </p>
          <Link to={remoteFunctionTransportRoute} className={classes.more}>
            Learn real-time streaming &rarr;
          </Link>
        </div>

        <div className="air-mdx w-full">
          <BeyondUiDemo />
          <p className="mt-8 text-center text-sm font-medium text-on-surface">
            Open your Network tab to inspect streaming Fetch chunks in HTTP mode or live frames in WebSocket mode.
          </p>
          <p className="mt-1 text-center text-xs text-on-surface-variant/70 italic">
            * Note: All stock tickers, prices, and charts in this demo are simulated data generated to illustrate real-time streaming deltas.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="air-card">
              <div className="air-card-content">
                <span className="air-card-eyebrow">Developer Experience</span>
                <h3 className="air-card-title">Zero Wire Protocols</h3>
                <p className="air-card-body">
                  Mutate server state directly in place. IRPC tracks object and array mutations automatically and turns them into fine-grained delta packets with zero manual serialization.
                </p>
              </div>
            </div>

            <div className="air-card">
              <div className="air-card-content">
                <span className="air-card-eyebrow">User Experience</span>
                <h3 className="air-card-title">Surgical In-Place Updates</h3>
                <p className="air-card-body">
                  Zero whole-table re-renders. Only the exact SVG coordinates, price digits, and change badges update in place without touching the rest of the page.
                </p>
              </div>
            </div>

            <div className="air-card">
              <div className="air-card-content">
                <span className="air-card-eyebrow">Business Impact</span>
                <h3 className="air-card-title">~94% Egress Reduction</h3>
                <p className="air-card-body">
                  Streaming ~120B deltas instead of ~2KB full snapshots reduces 10k-user bandwidth from 40 MB/s to just 2.4 MB/s, slashing cloud egress and server CPU.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

const classes = {
  root: 'border-t border-border',
  inner: 'flex flex-col items-center gap-10 py-12 lg:py-20',
  header: 'flex max-w-2xl flex-col items-center gap-3 text-center',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-brand',
  title: 'text-2xl font-bold text-on-surface lg:text-4xl',
  body: 'text-base leading-relaxed text-on-surface-variant lg:text-lg',
  more: 'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/20 hover:gap-2 active:scale-98',
};
