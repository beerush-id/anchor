import { type Bindable, setup } from '@anchorlib/solid';

export const CheckboxField = setup<{
  id: string;
  label: string;
  checked: Bindable<boolean>;
}>((props) => {
  return (
    <label for={props.id} class="checkbox-field">
      <input id={props.id} type="checkbox" checked={props.checked} onChange={() => (props.checked = !props.checked)} />
      <span>{props.label}</span>
    </label>
  );
});

export default CheckboxField;
