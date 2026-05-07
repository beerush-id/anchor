import { form, mutable } from '@anchorlib/core';
import { $bind, $use, Meta, page, setup, snippet, Title } from '@anchorlib/react';
import type { FormEventHandler } from 'react';
import { z } from 'zod';
import { CheckboxField } from '../../../components/CheckboxField.js';
import { InputField } from '../../../components/InputField.js';
import { signUpRoute } from './route.js';

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const SignUpForm = setup(() => {
  const [credentials, errors] = form(schema, { email: '', password: '', confirmPassword: '' });
  const auth = mutable({ submitted: false, remember: false, accepted: false });

  const signup: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!auth.accepted) return;
    if (errors.email || errors.password || errors.confirmPassword) return;
    auth.submitted = true;
  };

  const SubmitButton = snippet(
    () => (
      <button type="submit" className="btn-counter" disabled={!auth.accepted}>
        Sign Up
      </button>
    ),
    'SubmitButton'
  );

  const SubmitMessage = snippet(
    () => (auth.submitted ? <p className="submit-message">Welcome, {credentials.email}!</p> : null),
    'SubmitMessage'
  );

  return (
    <form className="auth-form" onSubmit={signup}>
      <InputField
        id="email"
        type="email"
        label="Email"
        value={$bind(credentials, 'email')}
        error={$use(errors, 'email')}
      />
      <InputField
        id="password"
        type="password"
        label="Password"
        value={$bind(credentials, 'password')}
        error={$use(errors, 'password')}
      />
      <InputField
        id="confirm-password"
        type="password"
        label="Confirm Password"
        value={$bind(credentials, 'confirmPassword')}
        error={$use(errors, 'confirmPassword')}
      />
      <CheckboxField id="remember" label="Remember me" checked={$bind(auth, 'remember')} />
      <CheckboxField id="accepted" label="I accept the terms and conditions" checked={$bind(auth, 'accepted')} />
      <SubmitButton />
      <SubmitMessage />
    </form>
  );
}, 'SignUpForm');

export const SignUpPage = page(signUpRoute).render(() => (
  <>
    <Title>Sign Up — AIR Stack</Title>
    <Meta name="description" content="Create your account." />
    <SignUpForm />
  </>
));
export default SignUpPage;
