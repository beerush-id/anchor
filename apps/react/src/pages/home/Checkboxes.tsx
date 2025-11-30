import { Checkbox, CheckboxLabel } from '@anchorkit/react/components';
import { useImmutable, useVariable, useWriter } from '@anchorlib/react-classic';

export function Checkboxes() {
  const [notification] = useVariable(true);
  const [user] = useImmutable({
    email: 'john@domain.com',
    username: 'johnsmith',
    verified: true,
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      },
    },
    settings: {
      sound: false,
      notification: true,
    },
  });
  const settings = useWriter(user.settings);

  return (
    <div className="mb-8 flex flex-col gap-2">
      <h2 className="text-xl font-semibold flex-1">Checkbox</h2>
      <div className="flex gap-2">
        <CheckboxLabel>
          <Checkbox bind={[settings, 'notification']} />
          <span>Notification</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <Checkbox bind={[settings, 'sound']} />
          <span>Sound</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <Checkbox bind={[notification]} indeterminate />
          <span>Indeterminate</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <Checkbox bind={[notification]} disabled />
          <span>Checked Disabled</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <Checkbox disabled />
          <span>Unchecked Disabled</span>
        </CheckboxLabel>
        <CheckboxLabel>
          <Checkbox disabled indeterminate />
          <span>Indeterminate Disabled</span>
        </CheckboxLabel>
      </div>
    </div>
  );
}
