import { type FC, useRef } from 'react';
import { flashNode } from '@lib/stats.js';
import { Button } from '../Button.js';
import { Input } from '../Input.js';
import { type AuthFormData, schema } from './auth-lib.js';
import { observed } from '@anchor/react/components';
import { Card } from '../Card.js';

export const AuthForm: FC<{ formData: AuthFormData; className?: string }> = ({ formData, className }) => {
  return (
    <Card className={className}>
      <form className="flex flex-col gap-4 p-10 rounded-xl">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-white">🔐 Welcome</h2>
          <p className="text-slate-400 mt-2">Sign in to your account</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Full Name</span>
          <Input className="w-full" bindTo={formData} name="name" placeholder="John Doe" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Email</span>
          <Input className="w-full" bindTo={formData} name="email" placeholder="john@domain.com" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Password</span>
          <Input className="w-full" type="password" bindTo={formData} name="password" placeholder="********" />
        </label>

        <FormControl payload={formData} />
      </form>
    </Card>
  );
};

export const FormControl: FC<{ payload: AuthFormData }> = observed(({ payload }) => {
  const ref = useRef(null);
  flashNode(ref.current);

  const disabled = !payload.password || !payload.email || !payload.name || !schema.safeParse(payload).success;

  return (
    <div ref={ref} className="flex items-center justify-end gap-4 pt-6">
      <Button>Cancel</Button>
      <Button disabled={disabled}>Submit</Button>
    </div>
  );
}, 'AuthControl');
