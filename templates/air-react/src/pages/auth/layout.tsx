import { Link, page, redirect, template } from '@anchorlib/react';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { createSettings } from '../../lib/settings.js';
import { RootPage } from '../page.js';
import { authRoute } from './route.js';
import { SignInPage } from './signin/index.js';
import { SignUpPage } from './signup/index.js';

authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});

export const AuthLayout = page(authRoute).render(({ context: ctx, children }) => {
  createSettings();

  const Title = template(
    () => <span className="brand-anchor">{ctx.url?.endsWith('/signin') ? 'In' : 'Up'}</span>,
    'AuthTitle'
  );

  const CrossLink = template(
    () =>
      ctx.url?.endsWith('/signin') ? (
        <p className="auth-switch">
          Don't have an account? Don't have an account? <Link to={SignUpPage}>Sign Up</Link>
        </p>
      ) : (
        <p className="auth-switch">
          Already have an account? <Link to={SignInPage}>Sign In</Link>
        </p>
      ),
    'CrossLink'
  );

  return (
    <div className="auth-layout">
      <div className="auth-head">
        <Link to={RootPage} className="auth-back">
          ← Back to home
        </Link>
        <div className="flex-1"></div>
        <ThemeToggle />
      </div>
      <h1 className="hero-heading">
        <span className="brand-dim">Sign&nbsp;</span>
        <Title />
      </h1>
      <p className="hero-subtitle">Anchor form() with Zod validation and two-way binding</p>
      <div className="card">{children}</div>
      <CrossLink />
    </div>
  );
});
export default AuthLayout;
