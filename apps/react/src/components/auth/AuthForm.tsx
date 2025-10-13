import { type FC, type FormEventHandler, useRef } from 'react';
import { Button } from '../Button.js';
import { Input } from '@anchorlib/react/components';
import { debugRender, useFormWriter, view } from '@anchorlib/react';
import { Card } from '../Card.js';
import { profileWriter } from '@lib/auth.js';
import { CodeBlock } from '../CodeBlock.js';
import { isMobile } from '@lib/nav.js';
import { anchor } from '@anchorlib/core';

export const AuthForm: FC<{ className?: string }> = ({ className }) => {
  const formRef = useRef(null);
  const controlRef = useRef(null);
  debugRender(formRef);

  const formWriter = useFormWriter(profileWriter, ['name', 'email']);

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log(anchor.get(profileWriter));
  };

  const handleReset = () => {
    formWriter.reset();
  };

  const NameError = view(() => {
    return formWriter.errors.name && <p className="text-sm text-red-400">{formWriter.errors.name.message}</p>;
  });

  const EmailError = view(() => {
    return formWriter.errors.email && <p className="text-sm text-red-400">{formWriter.errors.email.message}</p>;
  });

  const FormControl = view(() => {
    debugRender(controlRef);
    const disabled = !formWriter.isValid || !formWriter.isDirty;

    return (
      <div ref={controlRef} className="flex items-center justify-end gap-4 pt-6">
        <Button type="button" disabled={!formWriter.isDirty} onClick={handleReset} className="btn-lg">
          Reset
        </Button>
        <Button type={'submit'} className="btn-lg btn-primary" disabled={disabled}>
          Submit
        </Button>
      </div>
    );
  });

  return (
    <Card className={className}>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 p-10 rounded-xl flex-1">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-white">🧑‍💻 Edit Profile</h2>
          <p className="text-slate-400 mt-2">Fill the form below to update your profile</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Full Name</span>
          <Input
            bind={formWriter.data}
            name="name"
            placeholder="John Doe"
            autoComplete="name"
            className="w-full anchor-input input-md"
          />
          <NameError />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-slate-300 font-medium">Email</span>
          <Input
            bind={formWriter.data}
            name="email"
            placeholder="john@domain.com"
            autoComplete="email"
            className="w-full anchor-input input-md"
          />
          <EmailError />
        </label>

        <FormControl />
      </form>
      {!isMobile() && (
        <CodeBlock
          code={`// Declarative binding
<Input
  bind={form.data}
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
