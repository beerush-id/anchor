import { Link, setup } from '@airlib/react';
import { workflowIndexRoute } from '../../pages/(docs)/workflow/route.js';
import WorkflowDemo from './WorkflowDemo.mdx';

export const Workflow = setup(() => {
  return (
    <section className="air-feature-section">
      <div className="air-feature-inner">
        <div className="air-feature-grid">
          <div className="air-feature-copy">
            <span className="air-feature-eyebrow">Workflow</span>
            <h2 className="air-feature-title">Reactive, Promise-like Pipelines</h2>
            <p className="air-feature-body">
              A workflow turns multi-step async logic into one typed pipeline: sequential steps, branching on your data,
              and recovery from failure — declared once, and the whole chain is a promise you can await anywhere
              JavaScript runs.
            </p>
            <p className="air-feature-body">
              Because pipelines plug into the reactive engine, they can wait on state before running and report progress
              step by step — the same workflow that powers a server handler can drive a live progress bar in the UI.
            </p>
            <Link to={workflowIndexRoute} className="air-feature-more">
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
