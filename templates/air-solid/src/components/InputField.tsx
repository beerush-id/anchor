import { type Bindable, setup } from '@anchorlib/solid';
import type { JSX } from 'solid-js';

type FieldError = { message: string } | undefined;

export const InputField = setup<{
  id: string;
  type?: string;
  label: string;
  value?: Bindable<string>;
  error?: FieldError;
}>((props) => {
  const handleInput: JSX.InputEventHandlerUnion<HTMLInputElement, InputEvent> = (e) => {
    props.value = e.currentTarget.value;
  };

  return (
    <div class="field">
      <label for={props.id}>{props.label}</label>
      <input id={props.id} type={props.type ?? 'text'} class="field-input" value={props.value} onInput={handleInput} />
      {props.error ? <span class="field-error">{props.error.message}</span> : null}
    </div>
  );
});

export default InputField;
