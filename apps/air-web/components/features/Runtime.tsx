import { Link, setup } from '@airlib/react';
import { docsUniversalSsrRoute } from '../../pages/(docs)/route.js';
import RuntimeVisual from './RuntimeVisual.mdx';

export const Runtime = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className="air-mdx air-feature-demo">
            <RuntimeVisual />
          </div>

          <div className={classes.copy}>
            <span className={classes.eyebrow}>Runtime</span>
            <h2 className={classes.title}>One Build, Any Runtime</h2>
            <p className={classes.body}>
              The whole server — SSR pipeline, IRPC routing, static assets — compiles to a single standard fetch
              handler. Every runtime entry in this codebase imports that same built worker and serves it.
            </p>
            <p className={classes.body}>
              Bun, Node, Deno, or Cloudflare Workers becomes a deployment choice made after the fact: swap the
              entry file, keep the build.
            </p>
            <Link to={docsUniversalSsrRoute} className={classes.more}>
              Learn multi-runtime deployment &rarr;
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
  more: 'mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline',
};
