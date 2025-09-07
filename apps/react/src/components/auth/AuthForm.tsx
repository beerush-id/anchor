import { type FC, type FormEventHandler, useRef } from 'react';
import { Button } from '../Button.js';
import { Input, observe } from '@anchor/react/components';
import { Card } from '../Card.js';
import { debugRender, useException, useInherit, useSnapshot } from '@anchor/react';
import { profileState, profileWriter } from '@lib/auth.js';
import { CodeBlock } from '../CodeBlock.js';
import { isMobile } from '@lib/nav.js';

export const AuthForm: FC<{ className?: string }> = ({ className }) => {
  const formRef = useRef(null);
  const controlRef = useRef(null);
  debugRender(formRef);

  const snapshot = useSnapshot(profileState);
  const formData = useInherit(profileWriter, ['name', 'email']);
  const formErrors = useException(profileWriter);

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    Object.assign(snapshot, formData);
  };

  const handleReset = () => {
    Object.assign(formData, snapshot);
    Object.assign(formErrors, { name: null, email: null });
  };

  const NameError = observe(() => {
    if (formErrors.name) {
      return <p className="text-sm text-red-400">{formErrors.name.message}</p>;
    }
  });

  const EmailError = observe(() => {
    if (formErrors.email) {
      return <p className="text-sm text-red-400">{formErrors.email.message}</p>;
    }
  });

  const FormControl = observe(() => {
    debugRender(controlRef);
    const disabled = !formData.email || !formData.name;

    return (
      <div ref={controlRef} className="flex items-center justify-end gap-4 pt-6">
        <Button type="button" onClick={handleReset} className="btn-lg">
          Reset
        </Button>
        <Button type={'submit'} className="btn-lg btn-primary" disabled={disabled}>
          Update
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
            bind={formData}
            pipe={profileWriter}
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
            bind={formData}
            pipe={profileWriter}
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
  bind={formData}
  pipe={profileWriter}
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
