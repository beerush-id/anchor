export function CheckboxField(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label for={props.id} class="checkbox-field">
      <input id={props.id} type="checkbox" checked={props.checked} onChange={() => props.onChange?.(!props.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

export default CheckboxField;
