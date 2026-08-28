import { Link, setup } from '@airlib/react';
import { workflowIndexRoute } from '../../pages/(docs)/workflow/route.js';
import WorkflowDemo from './WorkflowDemo.mdx';

export const Workflow = setup(() => {
  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className={classes.copy}>
            <span className={classes.eyebrow}>Workflow</span>
            <h2 className={classes.title}>Reactive, Promise-like Pipelines</h2>
            <p className={classes.body}>
              A workflow turns multi-step async logic into one typed pipeline: sequential steps, branching on your data,
              and recovery from failure — declared once, and the whole chain is a promise you can await anywhere
              JavaScript runs.
            </p>
            <p className={classes.body}>
              Because pipelines plug into the reactive engine, they can wait on state before running and report progress
              step by step — the same workflow that powers a server handler can drive a live progress bar in the UI.
            </p>
            <Link to={workflowIndexRoute} className={classes.more}>
              Learn workflows &rarr;
            </Link>
          </div>

          <div className="air-mdx air-feature-demo">
            <WorkflowDemo />
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
