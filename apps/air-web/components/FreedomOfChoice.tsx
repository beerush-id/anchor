import { Link, setup } from '@airlib/react';
import { RemoteFunctionIcon, RocketLaunchIcon, SsrIcon } from '@/pages/(docs)/icons.js';
import docsRoute, { docsGettingStartedRoute } from '@/pages/(docs)/route.js';

export const FreedomOfChoice = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.content}>
          <p className={classes.badge}>
            <span aria-hidden="true" className={classes.badgeDot} />
            Freedom of Choice &middot; Zero Dogma
          </p>

          <h2 className="air-display text-center leading-[1.15] text-3xl font-bold lg:text-4xl">
            Build with Freedom and Confidence
          </h2>

          <p className={classes.subtitle}>
            Full dynamic SSR, edge pre-rendered SSG, or lightning-fast client-side SPA — configure your rendering
            strategy per-route or mix them seamlessly in a single project with near-zero workarounds.
          </p>

          <div className={classes.pillars}>
            <div className={classes.pillarCard}>
              <div className={classes.pillarIcon}>
                <SsrIcon className="size-6 text-brand" />
              </div>
              <h3 className={classes.pillarTitle}>Dynamic SSR</h3>
              <p className={classes.pillarDesc}>
                Request-isolated server rendering with zero client waterfalls across Bun, Node, Deno, and Workers.
              </p>
            </div>
            <div className={classes.pillarCard}>
              <div className={classes.pillarIcon}>
                <RocketLaunchIcon className="size-6 text-brand" />
              </div>
              <h3 className={classes.pillarTitle}>Pre-rendered SSG</h3>
              <p className={classes.pillarDesc}>
                Zero-compute global edge distribution for high-traffic content pages with automated sitemaps built-in.
              </p>
            </div>
            <div className={classes.pillarCard}>
              <div className={classes.pillarIcon}>
                <RemoteFunctionIcon className="size-6 text-brand" />
              </div>
              <h3 className={classes.pillarTitle}>Hybrid Architecture</h3>
              <p className={classes.pillarDesc}>
                Ship an SSR landing, static documentation, and dynamic SPA dashboard in a single project.
              </p>
            </div>
          </div>

          <div className={classes.actions}>
            <Link to={docsGettingStartedRoute} className={classes.cta}>
              Get Started
            </Link>
            <Link to={docsRoute} className={classes.link}>
              Learn AirLib
            </Link>
          </div>

          <code className={classes.install}>bun create airlib my-air-app</code>
        </div>
      </div>
    </section>
  );
});

const dotGrid =
  'bg-[radial-gradient(color-mix(in_srgb,var(--color-on-surface)_14%,transparent)_1px,transparent_1px)] bg-size-[22px_22px]';

const classes = {
  root: `relative overflow-hidden border-t border-border ${dotGrid}`,
  inner: 'relative z-(--z-content) py-16 lg:py-24',
  content: 'flex flex-col items-center text-center',
  badge:
    'inline-flex items-center gap-2 rounded-full border border-border bg-surface-variant px-3 py-1 text-xs font-semibold text-on-surface-variant',
  badgeDot: 'size-1.5 rounded-full bg-brand',
  subtitle: 'mt-4 max-w-160 text-base leading-relaxed text-on-surface-variant lg:text-lg',
  pillars: 'mt-10 grid w-full max-w-220 gap-4 sm:grid-cols-3',
  pillarCard:
    'flex flex-col items-center rounded-xl border border-border bg-surface-variant/80 p-5 text-center transition-all duration-200 hover:border-primary/40 hover:bg-surface-variant',
  pillarIcon: 'mb-3 inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface',
  pillarTitle: 'text-base font-bold text-on-surface',
  pillarDesc: 'mt-1.5 text-xs leading-relaxed text-on-surface-variant',
  actions: 'mt-10 flex flex-wrap items-center justify-center gap-4',
  install:
    'mt-5 inline-flex rounded-lg border border-border bg-surface-variant px-4 py-2 font-mono text-sm text-on-surface',
  cta: 'air-cta',
  link: 'inline-flex items-center gap-2 rounded-md border border-border bg-surface-variant px-5 py-2.5 text-base font-semibold text-on-surface no-underline transition-shadow duration-300 hover:shadow-pop',
};
