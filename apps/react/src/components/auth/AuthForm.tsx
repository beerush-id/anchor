import { type FC, useRef } from 'react';
import { Button } from '../Button.js';
import { Input } from '../Input.js';
import { reactive } from '@anchor/react/components';
import { Card } from '../Card.js';
import { debugRender } from '@anchor/react';
import { authForm, authState, schema } from '@lib/auth.js';
import { CodeBlock } from '../CodeBlock.js';
import { isMobile } from '@lib/nav.js';

export const AuthForm: FC<{ className?: string }> = ({ className }) => {
  const ref = useRef(null);

  const FormControl = reactive(() => {
    debugRender(ref);
    const disabled = !authState.password || !authState.email || !authState.name || !schema.safeParse(authState).success;

    return (
      <div ref={ref} className="flex items-center justify-end gap-4 pt-6">
        <Button className="btn-lg">Cancel</Button>
        <Button className="btn-lg btn-primary" disabled={disabled}>
          Submit
        </Button>
      </div>
    );
  });

  return (
    <Card className={className}>
      <form className="flex flex-col gap-4 p-10 rounded-xl">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-white">🔐 Welcome</h2>
          <p className="text-slate-400 mt-2">Sign in to your account</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Full Name</span>
          <Input className="w-full input-md" bindTo={authForm} name="name" placeholder="John Doe" autoComplete="name" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Email</span>
          <Input
            className="w-full input-md"
            bindTo={authForm}
            name="email"
            placeholder="john@domain.com"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Password</span>
          <Input
            className="w-full input-md"
            type="password"
            bindTo={authForm}
            name="password"
            placeholder="********"
            autoComplete="current-password"
          />
        </label>

        <FormControl />
      </form>
      {!isMobile() && (
        <CodeBlock
          code={`// Declarative binding
<Input
  bind={authForm}
  name="email"
  placeholder="john@domain.com"
  autoComplete="email"
  className="w-full input-md"
/>
      `}
          lang={'tsx'}
        />
      )}
    </Card>
  );
};
