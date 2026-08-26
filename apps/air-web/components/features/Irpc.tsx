import { Link, setup } from '@airlib/react';
import { remoteFunctionIndexRoute } from '../../pages/(docs)/remote-function/route.js';
import IrpcDemo from './IrpcDemo.mdx';

export const Irpc = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className="air-mdx air-feature-demo">
            <IrpcDemo />
          </div>

          <div className={classes.copy}>
            <span className={classes.eyebrow}>IRPC</span>
            <h2 className={classes.title}>APIs as Functions</h2>
            <p className={classes.body}>
              IRPC (Isomorphic RPC) — makes your API a set of typed functions. Declare the function, bind the
              implementation, and using it from client or server really is just calling a function.
            </p>
            <p className={classes.body}>
              Calls made in the same microtask fold into a single request, each result delivered as it's ready. And
              because calls bind to reactive state, a changed dependency refetches them automatically — batched again.
            </p>
            <Link to={remoteFunctionIndexRoute} className={classes.more}>
              Learn APIs as functions &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

const classes = {
  root: 'border-t border-border',
  inner: 'py-12 lg:py-20',
  grid: 'grid items-center gap-10 lg:grid-cols-2 lg:gap-14',
  copy: 'flex flex-col items-center gap-4 text-center lg:items-start lg:text-left',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-brand',
  title: 'text-2xl font-bold text-on-surface lg:text-3xl',
  body: 'max-w-130 text-base leading-relaxed text-on-surface-variant lg:text-lg',
  code: 'rounded bg-surface-variant px-1.5 py-0.5 font-mono text-[0.9em] text-on-surface',
  more: 'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/20 hover:gap-2 active:scale-98',
};
