import { render, setup, type Bindable } from '@anchorlib/react';

type FieldError = { message: string } | undefined;

export const InputField = setup<{
  id: string;
  type?: string;
  label: string;
  value?: Bindable<string>;
  error?: FieldError;
}>((props) => {
  return render(() => (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <input id={props.id} type={props.type ?? 'text'} className="field-input" value={props.value} onChange={(e) => { props.value = e.currentTarget.value; }} />
      {props.error ? <span className="field-error">{props.error.message}</span> : null}
    </div>
  ));
}, 'InputField');

export default InputField;
