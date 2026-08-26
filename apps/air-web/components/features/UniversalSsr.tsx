import { Link, setup } from '@airlib/react';
import { docsUniversalSsrRoute } from '../../pages/(docs)/route.js';
import UniversalSsrVisual from './UniversalSsrVisual.mdx';

export const UniversalSsr = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className="air-mdx air-feature-demo">
            <UniversalSsrVisual />
          </div>

          <div className={classes.copy}>
            <span className={classes.eyebrow}>Vite Plugin</span>
            <h2 className={classes.title}>Universal SSR</h2>
            <p className={classes.body}>
              The same component renders on the server — request-isolated, with live reactive state — and hydrates on
              the client as one continuous code path. It arrives as a Vite plugin that drops into your existing Vite
              config.
            </p>
            <p className={classes.body}>
              And it reaches further than rendering: extended Markdown content pages, build-time static generation
              and on-demand regeneration for dynamic pages, and sitemaps generated straight from your route tree —
              all out of the box.
            </p>
            <Link to={docsUniversalSsrRoute} className={classes.more}>
              Learn universal SSR &rarr;
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
  more: 'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/20 hover:gap-2 active:scale-98',
};
