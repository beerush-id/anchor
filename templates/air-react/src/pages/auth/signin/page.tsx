import { form, mutable } from '@anchorlib/core';
import { $bind, $use, Meta, page, setup, snippet, Title } from '@anchorlib/react';
import type { FormEventHandler } from 'react';
import { z } from 'zod';
import { CheckboxField } from '../../../components/CheckboxField.js';
import { InputField } from '../../../components/InputField.js';
import { signIn } from './function.js';
import { signInRoute } from './route.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SignInForm = setup(() => {
  const [credentials, errors] = form(schema, { email: '', password: '' });
  const auth = mutable({ submitted: false, remember: false, error: '' });

  const signin: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (errors.email || errors.password) return;
    auth.error = '';
    try {
      await signIn({ email: credentials.email, password: credentials.password });
      auth.submitted = true;
    } catch (err: any) {
      auth.error = err.message || 'An error occurred';
    }
  };

  const SubmitButton = snippet(
    () => (
      <button type="submit" className="btn-counter">
        Sign In
      </button>
    ),
    'SubmitButton'
  );

  const SubmitMessage = snippet(
    () => (auth.submitted ? <p className="submit-message">Welcome back, {credentials.email}!</p> : null),
    'SubmitMessage'
  );

  const ErrorMessage = snippet(
    () =>
      auth.error ? (
        <p className="error-message" style={{ color: 'red' }}>
          {auth.error}
        </p>
      ) : null,
    'ErrorMessage'
  );

  return (
    <form className="auth-form" onSubmit={signin}>
      <ErrorMessage />
      <InputField
        id="signin-email"
        type="email"
        label="Email"
        value={$bind(credentials, 'email')}
        error={$use(errors, 'email')}
      />
      <InputField
        id="signin-password"
        type="password"
        label="Password"
        value={$bind(credentials, 'password')}
        error={$use(errors, 'password')}
      />
      <CheckboxField id="signin-remember" label="Remember me" checked={$bind(auth, 'remember')} />
      <SubmitButton />
      <SubmitMessage />
    </form>
  );
}, 'SignInForm');

export const SignInPage = page(signInRoute).render(() => {
  return (
    <>
      <Title>Sign In — AIR Stack</Title>
      <Meta name="description" content="Sign in to your account." />
      <SignInForm />
    </>
  );
});
export default SignInPage;
