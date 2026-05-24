import { $bind, derived, form, Meta, mutable, page, Title } from '@anchorlib/solid';
import type { JSX } from 'solid-js';
import { z } from 'zod';
import { CheckboxField } from '../../../components/CheckboxField.js';
import { InputField } from '../../../components/InputField.js';
import { signUp } from './function.js';
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

function SignUpForm() {
  const [credentials, errors] = form(schema, { email: '', password: '', confirmPassword: '' });
  const auth = mutable({ submitted: false, remember: false, accepted: false });

  const signup: JSX.EventHandlerUnion<HTMLFormElement, SubmitEvent> = async (e) => {
    e.preventDefault();
    if (!auth.accepted) return;
    if (errors.email || errors.password || errors.confirmPassword) return;
    try {
      await signUp({ email: credentials.email, password: credentials.password });
      auth.submitted = true;
    } catch (err: any) {
      console.error(err);
    }
  };

  const isAccepted = derived(() => auth.accepted);
  const submitMessage = derived(() => (auth.submitted ? `Welcome, ${credentials.email}!` : ''));

  return (
    <form class="auth-form" onSubmit={signup}>
      <InputField id="email" type="email" label="Email" value={$bind(credentials, 'email')} error={errors.email} />
      <InputField
        id="password"
        type="password"
        label="Password"
        value={$bind(credentials, 'password')}
        error={errors.password}
      />
      <InputField
        id="confirm-password"
        type="password"
        label="Confirm Password"
        value={$bind(credentials, 'confirmPassword')}
        error={errors.confirmPassword}
      />
      <CheckboxField id="remember" label="Remember me" checked={$bind(auth, 'remember')} />
      <CheckboxField id="accepted" label="I accept the terms and conditions" checked={$bind(auth, 'accepted')} />
      <button type="submit" class="btn-counter" disabled={!isAccepted.value}>
        Sign Up
      </button>
      {submitMessage.value ? <p class="submit-message">{submitMessage.value}</p> : null}
    </form>
  );
}

export const SignUpPage = page(signUpRoute).render(() => (
  <>
    <Title>Sign Up — AIR Stack</Title>
    <Meta name="description" content="Create your account." />
    <SignUpForm />
  </>
));
export default SignUpPage;
