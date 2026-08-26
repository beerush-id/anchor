import { Link, setup } from '@airlib/react';
import { stateManagementIndexRoute } from '../../pages/(docs)/state-management/route.js';
import FineGrainedDemo from './FineGrainedDemo.mdx';

export const FineGrained = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className={classes.copy}>
            <span className={classes.eyebrow}>Anchor</span>
            <h2 className={classes.title}>Fine-Grained Reactivity</h2>
            <p className={classes.body}>
              Anchor tracks state at the property level. Mutate a single property — in a click handler, an effect, or a
              server stream — and only the exact listeners and DOM nodes subscribed to it update. Nothing else
              re-renders, nothing else crosses the wire.
            </p>
            <p className={classes.body}>
              The state itself is just a reactive object, decoupled from any UI framework. The same object runs in
              React, SolidJS, and server code, so a mutation on the server reaches the one DOM node reading it — with
              only that property in transit.
            </p>
            <Link to={stateManagementIndexRoute} className={classes.more}>
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

const classes = {
  root: '',
  inner: 'py-12 lg:py-20',
  grid: 'grid items-center gap-10 lg:grid-cols-2 lg:gap-14',
  copy: 'flex flex-col items-center gap-4 text-center lg:items-start lg:text-left',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-brand',
  title: 'text-2xl font-bold text-on-surface lg:text-3xl',
  body: 'max-w-130 text-base leading-relaxed text-on-surface-variant lg:text-lg',
  more: 'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/20 hover:gap-2 active:scale-98',
};
