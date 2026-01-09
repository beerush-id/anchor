import { $bind, type Bindable, bindable, type InputHTMLAttributes, mutable } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value?: Bindable<string>;
};

export const Input = bindable<InputProps>((props) => {
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    props.value = e.currentTarget.value;
    props.onInput?.(e);
    props.oninput?.(e);
  };

  return <input value={props.value ?? ''} oninput={handleInput} {...props.$omit(['value', 'oninput'])} />;
});

export const Form = () => {
  const name = mutable('');

  return (
    <div>
      <h1>Form</h1>
      <h2>Name: {name.value}</h2>
      <form class="flex flex-col gap-2">
        <Input placeholder="Name" value={$bind(name)} />
        <Input placeholder="Name" value={name.value} oninput={(e) => (name.value = e.currentTarget.value)} />
        <Input placeholder="Name" value={'test'} />
      </form>
    </div>
  );
};
