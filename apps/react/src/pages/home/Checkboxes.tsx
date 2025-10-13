import { Checkbox, CheckboxLabel } from '@anchorkit/react/components';
import { useImmutable, useVariable, useWriter, view } from '@anchorlib/react';
import { CodeBlock } from '@anchorlib/react-kit/components';

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

  const Output = view(() => <CodeBlock code={JSON.stringify(user, null, 2)} />);

  return (
    <div className="mb-8 flex flex-col gap-2">
      <h2 className="text-xl font-semibold flex-1">Checkbox</h2>
      <div className="ark-card">
        <div className="ark-card-content">
          <Output />
        </div>
      </div>
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
          <Checkbox bind={[notification]} />
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
