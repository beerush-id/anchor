import { Head, Link, NotFoundError, type RouteError, Slot, setup } from '@airlib/react';
import type { ReactNode } from 'react';
import docsRoute from '../pages/(docs)/route.js';
import rootRoute from '../pages/route.js';

export type ErrorViewProps = {
  error?: RouteError;
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

export type ErrorViewSlots = {
  actions?: () => ReactNode;
};

export const ErrorView = setup<ErrorViewProps, ErrorViewSlots>((props, slots) => {
  const is404 = props.error instanceof NotFoundError;
  const statusCode = is404 ? '404' : '500';
  const defaultTitle = is404 ? 'Page Not Found' : 'Something Went Wrong';
  const defaultDesc = is404
    ? "The page you are looking for doesn't exist or has been moved."
    : props.error?.message || 'An unexpected error occurred while processing your request.';

  const title = props.title ?? defaultTitle;
  const description = props.description ?? defaultDesc;

  return (
    <section className={`air-error-view ${classes.root} ${props.className ?? ''}`}>
      <Head meta={{ title: `${statusCode} — ${title}` }} />
      <div className={`air-container ${classes.inner}`}>
        <p className={classes.badge}>
          <span aria-hidden="true" className={classes.badgeDot} />
          {statusCode} Error
        </p>

        <h1 className="air-display">{title}</h1>

        <p className={classes.description}>{description}</p>

        <div className={classes.actions}>
          <Slot for={slots.actions}>
            {() => (
              <>
                <Link to={rootRoute} className={classes.cta}>
                  Back to Home
                </Link>
                <Link to={docsRoute} className={classes.link}>
                  Documentation
                </Link>
              </>
            )}
          </Slot>
        </div>
      </div>
    </section>
  );
});

const dotGrid =
  'bg-[radial-gradient(color-mix(in_srgb,var(--color-on-surface)_14%,transparent)_1px,transparent_1px)] bg-size-[22px_22px]';

const classes = {
  root: `relative flex w-full min-h-[min(44rem,calc(100svh_-_var(--spacing-header)))] grow flex-col items-center justify-center overflow-hidden ${dotGrid} px-5 py-16`,
  inner: 'relative z-(--z-content) flex max-w-160 flex-col items-center text-center',
  badge:
    'inline-flex items-center gap-2 rounded-full border border-border bg-surface-variant px-3 py-1 text-xs font-semibold text-on-surface-variant',
  badgeDot: 'size-1.5 rounded-full bg-brand',
  description: 'mt-4 max-w-120 text-base text-on-surface-variant lg:text-lg',
  actions: 'mt-8 flex flex-wrap items-center justify-center gap-4',
  cta: 'air-cta',
  link: 'air-cta-dark',
};
