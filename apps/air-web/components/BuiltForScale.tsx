import { setup } from '@airlib/react';

export const BuiltForScale = setup(() => {
  return (
    <section className={classes.root} aria-labelledby="scale-heading">
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.content}>
          <p className={classes.badge}>
            <span aria-hidden="true" className={classes.badgeDot} />
            Built for Real-World Scale
          </p>

          <h2 id="scale-heading" className="air-display text-center leading-[1.15] text-3xl font-bold lg:text-5xl">
            Scale That Actually Matters
          </h2>

          <p className={classes.statement}>
            AirLib isn't engineered to win synthetic micro-benchmarks rendering a million counter nodes in a tight loop.
            It is designed to scale what matters in production: <strong>fine-grained re-renders</strong> that never
            thrash your UI,
            <strong> zero-waterfall RPCs</strong> that eliminate network latency, and <strong>low-overhead SSR</strong>{' '}
            that slashes cloud compute bills.
          </p>
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
  statement:
    'mt-6 max-w-180 text-lg leading-relaxed text-on-surface-variant lg:text-xl font-normal [&>strong]:font-semibold [&>strong]:text-on-surface',
};
