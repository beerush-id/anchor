import { Link, setup } from '@airlib/react';
import { routingIndexRoute } from '../../pages/(docs)/routing/route.js';
import RouterVisual from './RouterVisual.mdx';

export const Router = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className={classes.copy}>
            <span className={classes.eyebrow}>Router</span>
            <h2 className={classes.title}>Assisted Reactive Routing</h2>
            <p className={classes.body}>
              Routes are a typed tree of code that you own and edit like any other code. The framework's role is
              assistance, not ownership: it scaffolds the repetitive declarations from your file tree, and leaves the
              rest — guards, data providers, redirects — entirely in your hands.
            </p>
            <p className={classes.body}>
              Route logic is reactive too: guards and data providers track the state they read and re-evaluate
              automatically when it changes, so access rules and loaded data stay as live as the rest of your app.
            </p>
            <Link to={routingIndexRoute} className={classes.more}>
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

const classes = {
  root: 'border-t border-border',
  inner: 'py-12 lg:py-20',
  grid: 'grid items-center gap-10 lg:grid-cols-2 lg:gap-14',
  copy: 'flex flex-col items-center gap-4 text-center lg:items-start lg:text-left',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-brand',
  title: 'text-2xl font-bold text-on-surface lg:text-3xl',
  body: 'max-w-130 text-base leading-relaxed text-on-surface-variant lg:text-lg',
  more: 'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/20 hover:gap-2 active:scale-98',
};
