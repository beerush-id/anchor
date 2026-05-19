import { render, setup, type Bindable } from '@anchorlib/react';

export const CheckboxField = setup<{
  id: string;
  label: string;
  checked: Bindable<boolean>;
}>((props) => {
  return render(() => (
    <label htmlFor={props.id} className="checkbox-field">
      <input id={props.id} type="checkbox" checked={props.checked} onChange={() => { props.checked = !props.checked; }} />
      <span>{props.label}</span>
    </label>
  ));
}, 'CheckboxField');

export default CheckboxField;
