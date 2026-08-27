import { type AnyRoute, Link, setup } from '@airlib/react';
import {
  DnsIcon,
  RemoteFunctionIcon,
  RouteIcon,
  SsrIcon,
  StateManagementIcon,
  WorkflowIcon,
} from '../pages/(docs)/icons.js';
import { remoteFunctionIndexRoute } from '../pages/(docs)/remote-function/route.js';
import { docsUniversalSsrRoute } from '../pages/(docs)/route.js';
import { routingIndexRoute } from '../pages/(docs)/routing/route.js';
import { stateManagementIndexRoute } from '../pages/(docs)/state-management/route.js';
import { workflowIndexRoute } from '../pages/(docs)/workflow/route.js';

export const Features = setup(() => {
  return (
    <section className={classes.root} aria-labelledby="features-heading">
      <div className={`air-section-inner ${classes.inner}`}>
        <div className="sr-only">
          <h2 id="features-heading">Core Features & Architecture</h2>
          <p>
            Explore AirLib core architectural pillars: fine-grained reactive state, isomorphic RPC APIs, assisted
            routing, universal SSR, promise-like workflows, and multi-runtime deployment.
          </p>
        </div>

        <div className={classes.grid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className="air-card flex gap-5">
              <feature.icon className="size-9 shrink-0 text-brand" />
              <div className="air-card-content">
                <span className="air-card-eyebrow">{feature.eyebrow}</span>
                <h3 className="air-card-title">{feature.title}</h3>
                <p className="air-card-body">{feature.body}</p>
                <Link to={feature.to as AnyRoute} className="air-card-more">
                  {feature.learn} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

const FEATURES = [
  {
    eyebrow: 'Anchor',
    title: 'Fine-Grained Reactivity',
    body: 'State exists independently of any component or framework — the same reactive object runs in UI code and server code. Mutate one property and only the exact listeners and DOM nodes subscribed to it update.',
    learn: 'Learn fine-grained reactivity',
    to: stateManagementIndexRoute,
    icon: StateManagementIcon,
  },
  {
    eyebrow: 'IRPC',
    title: 'APIs as Functions',
    body: 'Isomorphic RPC: declare a function, bind the implementation, and using it from client or server really is just calling a function. Streaming, batching, caching, and retries come with the protocol.',
    learn: 'Learn APIs as functions',
    to: remoteFunctionIndexRoute,
    icon: RemoteFunctionIcon,
  },
  {
    eyebrow: 'Router',
    title: 'Assisted Reactive Routing',
    body: 'File-based routes are scaffolded by the framework, but the code stays yours. Guards and data providers re-evaluate automatically as their reactive dependencies change.',
    learn: 'Learn assisted routing',
    to: routingIndexRoute,
    icon: RouteIcon,
  },
  {
    eyebrow: 'Vite Plugin',
    title: 'Universal SSR',
    body: 'The same components render on the server and hydrate on the client — no server/client split. Extended Markdown pages, static generation, on-demand revalidation, and automatic sitemaps ship out of the box.',
    learn: 'Learn universal SSR',
    to: docsUniversalSsrRoute,
    icon: SsrIcon,
  },
  {
    eyebrow: 'Workflow',
    title: 'Reactive, Promise-like Pipelines',
    body: 'Compose multi-step async logic — AI pipelines, checkouts, background jobs — with typed branching, centralized error recovery, and live step-by-step progress in the UI. Await the result like a Promise anywhere.',
    learn: 'Learn workflows',
    to: workflowIndexRoute,
    icon: WorkflowIcon,
  },
  {
    eyebrow: 'Runtime',
    title: 'One Build, Any Runtime',
    body: 'The build output is a Web Standard worker.js artifact. The same file serves Bun, Node, Deno, and Cloudflare Workers — no adapters.',
    learn: 'Learn multi-runtime deployment',
    to: docsUniversalSsrRoute,
    icon: DnsIcon,
  },
];

const classes = {
  root: 'relative z-2 -mt-6 lg:-mt-10',
  inner: 'pb-12 lg:pb-16',
  grid: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
};
