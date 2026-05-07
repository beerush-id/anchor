import { derived, Link, page, redirect } from '@anchorlib/solid';
import { ThemeToggle } from '../../components/ThemeToggle.js';
import { createSettings } from '../../lib/settings.js';
import { RootPage } from '../page.js';
import { authRoute } from './route.js';
import { SignInPage } from './signin/index.js';
import { SignUpPage } from './signup/index.js';

authRoute.route('/').guard(() => {
  throw redirect(SignInPage);
});

export const AuthLayout = page(authRoute).render((_, ctx, children) => {
  createSettings();

  const title = derived(() => (ctx.url?.endsWith('/signin') ? 'In' : 'Up'));
  const isSignIn = derived(() => ctx.url?.endsWith('/signin'));

  return (
    <div class="auth-layout">
      <div class="auth-head">
        <Link to={RootPage} class="auth-back">
          ← Back to home
        </Link>
        <div class="flex-1"></div>
        <ThemeToggle />
      </div>
      <h1 class="hero-heading">
        <span class="brand-dim">Sign&nbsp;</span>
        <span class="brand-anchor">{title.value}</span>
      </h1>
      <p class="hero-subtitle">Anchor form() with Zod validation and two-way binding</p>
      <div class="card">{children}</div>
      {isSignIn.value ? (
        <p class="auth-switch">
          Don't have an account? <Link to={SignUpPage}>Sign Up</Link>
        </p>
      ) : (
        <p class="auth-switch">
          Already have an account? <Link to={SignInPage}>Sign In</Link>
        </p>
      )}
    </div>
  );
});
export default AuthLayout;
