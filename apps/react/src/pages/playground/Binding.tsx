import { bindable, view } from '@anchorlib/react/view';
import { useAnchor, useVariable } from '@anchorlib/react';
import type { InputHTMLAttributes } from 'react';
import { Card } from '@components/Card.js';

const Input = bindable<InputHTMLAttributes<HTMLInputElement>>(function Input(props) {
  return <input {...props} />;
});

export default function BindingDemo() {
  const [user] = useAnchor({ name: '', firstName: '', lastName: '', verified: false, age: 30 });
  const [name] = useVariable('');
  const [age] = useVariable(30);
  const [verified] = useVariable(false);

  const Display = view(() => (
    <div className="flex flex-col p-4 pb-0">
      <div className="flex flex-col">
        <h3>Name: {user.name || 'N/A'}</h3>
        <p>Age: {user.age}</p>
        <p>Verified: {user.verified ? 'Yes' : 'No'}</p>
      </div>
    </div>
  ));

  const VarDisplay = view(() => (
    <div className="flex flex-col p-4 pb-0">
      <div className="flex flex-col">
        <h3>Name: {name.value || 'N/A'}</h3>
        <p>Age: {age.value}</p>
        <p>Verified: {verified.value ? 'Yes' : 'No'}</p>
      </div>
    </div>
  ));

  return (
    <>
      <Card className="w-full max-w-md">
        <Display />

        <form className="flex flex-col gap-2 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold">Name</span>
            <Input className="anchor-input" bind={user} name={'name'} placeholder="Enter your name..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold">Age</span>
            <Input className="anchor-input" bind={user} name={'age'} type="number" placeholder="Enter your age..." />
          </label>
          <label className="flex gap-2">
            <span>Verified</span>
            <Input className="anchor-input" bind={user} name={'verified'} type="checkbox" />
          </label>
        </form>
      </Card>
      <Card className="w-full max-w-md">
        <VarDisplay />
        <form className="flex flex-col gap-2 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold">Name</span>
            <Input className="anchor-input" bind={name} placeholder="Enter your name..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-semibold">Age</span>
            <Input className="anchor-input" bind={age} type="number" placeholder="Enter your age..." />
          </label>
          <label className="flex gap-2">
            <span>Verified</span>
            <Input className="anchor-input" bind={verified} type="checkbox" />
          </label>
        </form>
      </Card>
    </>
  );
}
