import { derived, form, Meta, mutable, page, Title } from '@anchorlib/solid';
import type { JSX } from 'solid-js';
import { z } from 'zod';
import { CheckboxField } from '../../../components/CheckboxField.js';
import { InputField } from '../../../components/InputField.js';
import { signIn } from './function.js';
import { signInRoute } from './route.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function SignInForm() {
  const [credentials, errors] = form(schema, { email: '', password: '' });
  const auth = mutable({ submitted: false, remember: false, error: undefined });

  const signin: JSX.EventHandlerUnion<HTMLFormElement, SubmitEvent> = async (e) => {
    e.preventDefault();
    if (errors.email || errors.password) return;
    try {
      await signIn({ email: credentials.email, password: credentials.password });
      auth.submitted = true;
    } catch (err) {
      auth.error = err;
      console.error(err);
    }
  };

  const isDisabled = derived(() => !!(errors.email || errors.password));
  const submitMessage = derived(() => (auth.submitted ? `Welcome back, ${credentials.email}!` : ''));
  const errorMessage = derived(() => auth.error?.message);

  return (
    <form class="auth-form" onSubmit={signin}>
      <InputField
        id="signin-email"
        type="email"
        label="Email"
        value={credentials.email}
        onInput={(v) => (credentials.email = v)}
        error={errors.email}
      />
      <InputField
        id="signin-password"
        type="password"
        label="Password"
        value={credentials.password}
        onInput={(v) => (credentials.password = v)}
        error={errors.password}
      />
      <CheckboxField
        id="signin-remember"
        label="Remember me"
        checked={auth.remember}
        onChange={(v) => (auth.remember = v)}
      />
      <button type="submit" class="btn-counter" disabled={isDisabled.value}>
        Sign In
      </button>
      {submitMessage.value ? <p class="submit-message">{submitMessage.value}</p> : null}
      {errorMessage.value ? <p class="error-message">{errorMessage.value}</p> : null}
    </form>
  );
}

export const SignInPage = page(signInRoute).render(() => (
  <>
    <Title>Sign In — AIR Stack</Title>
    <Meta name="description" content="Sign in to your account." />
    <SignInForm />
  </>
));
export default SignInPage;
