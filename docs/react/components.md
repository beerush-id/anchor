# Components in Anchor for React

Anchor for React provides a set of pre-built UI components that seamlessly integrate with Anchor's reactive state system. These components simplify common form and display patterns, automatically handling data binding and reactivity, making it easier to build interactive forms and displays.

## `Input` Component

The `Input` component is a powerful and flexible form input field designed to work effortlessly with your Anchor reactive states. It provides a familiar HTML `<input>` interface while automatically handling the synchronization between the input's value and your Anchor state. This means you write less boilerplate and ensure your UI always reflects your application's true state.

### Why use Anchor's `Input` component?

- **Automatic Data Binding:** Connects directly to your Anchor state properties, eliminating the need for manual `onChange` handlers to update state.
- **Fine-Grained Reactivity:** Ensures that only the necessary parts of your component re-render when the bound state property changes.
- **Type Safety:** Leverages TypeScript to provide strong typing for your bound state properties.
- **Extensible:** Supports all standard HTML `<input>` attributes, allowing for full customization.
- **Piping Capabilities:** Easily synchronize the input's value with other reactive states for complex data flows.

### Props

The `Input` component accepts the following Anchor-specific props in addition to standard HTML `<input>` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { InputHTMLAttributes, RefObject } from 'react';

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = {
  /**
   * The Anchor reactive state object to which this input will be bound.
   * Changes in the input will automatically update the corresponding property in this state.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this input will control.
   * This property must be writable in the bound state.
   */
  name: K;
  /**
   * An optional Anchor reactive state object. If provided, the value of `bind[name]`
   * will also be automatically copied (piped) to `pipe[name]` whenever the input's value changes.
   * This is useful for creating unidirectional data flow to another state, e.g., for display purposes.
   */
  pipe?: T;
  /**
   * A React RefObject to access the underlying HTMLInputElement DOM element.
   * Useful for imperative DOM manipulations or integrating with third-party libraries.
   */
  ref?: RefObject<HTMLInputElement | null>;
  /**
   * An array of objects from which to inherit a `placeholder` value.
   * If a property matching `name` is found in any of these objects and has a value,
   * its value will be used as the `placeholder` for the input.
   * This is useful for providing default or contextual placeholder text.
   */
  inherits?: Record<string, string | number | undefined>[];
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>; // All standard HTML input attributes are supported.
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Text Input Binding

This is the most common use case: binding an input field directly to a string property in your Anchor state.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Input } from '@anchor/react/components';

const UserProfileEditor = observable(() => {
  const [userProfile] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  });

  return (
    <div>
      <h2>Edit Your Profile</h2>
      <div>
        <label htmlFor="firstName">First Name:</label>
        <Input bind={userProfile} name="firstName" id="firstName" type="text" placeholder="Enter first name" />
      </div>
      <div>
        <label htmlFor="lastName">Last Name:</label>
        <Input bind={userProfile} name="lastName" id="lastName" type="text" placeholder="Enter last name" />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <Input bind={userProfile} name="email" id="email" type="email" placeholder="Enter email" />
      </div>

      <h3>Current Profile Data:</h3>
      <p>
        Name: {userProfile.firstName} {userProfile.lastName}
      </p>
      <p>Email: {userProfile.email}</p>
    </div>
  );
});

export default UserProfileEditor;
```

#### Number Input Binding

The `Input` component also handles number types. When `type="number"` is specified, it automatically parses the input value to a float.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Input } from '@anchor/react/components';

const ProductQuantity = observable(() => {
  const [product] = useAnchor({
    name: 'Awesome Widget',
    price: 29.99,
    quantity: 1,
  });

  const totalCost = product.price * product.quantity;

  return (
    <div>
      <h2>{product.name}</h2>
      <p>Price: ${product.price.toFixed(2)}</p>
      <div>
        <label htmlFor="quantity">Quantity:</label>
        <Input bind={product} name="quantity" id="quantity" type="number" min="1" />
      </div>
      <h3>Total: ${totalCost.toFixed(2)}</h3>
    </div>
  );
});

export default ProductQuantity;
```

## `Radio` Component

The `Radio` component is a specialized input field designed for selecting a single option from a set of choices. It integrates seamlessly with Anchor's reactive state, allowing you to bind its checked state directly to a boolean property in your state.

### Why use Anchor's `Radio` component?

- **Direct State Binding:** Easily connect the radio button's checked status to a boolean property in your Anchor state.
- **Automatic Reactivity:** The component automatically re-renders when the bound state property changes, and updates the state when the radio button is toggled.
- **Familiar API:** Extends standard HTML `<input type="radio">` attributes, making it intuitive to use.

### Props

The `Radio` component accepts the following Anchor-specific props in addition to standard HTML `<input type="radio">` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { InputHTMLAttributes, RefObject } from 'react';

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = {
  /**
   * The Anchor reactive state object to which this radio button will be bound.
   * The property specified by `name` in this object will reflect the checked status.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this radio button will control.
   * This property should typically be a boolean and must be writable in the bound state.
   */
  name: K;
  /**
   * A React RefObject to access the underlying HTMLInputElement DOM element.
   */
  ref?: RefObject<HTMLInputElement | null>;
  /**
   * The initial checked state for the radio button.
   * If `bind[name]` is undefined, this `checked` value will be used.
   * Note that the bound state's value will always take precedence if it exists.
   */
  checked?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'checked'>;
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Radio Button Binding

Bind a `Radio` component to a boolean property in your reactive state. This is useful for simple on/off toggles or single-choice selections within a group.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Radio } from '@anchor/react/components';

const NotificationSettings = observable(() => {
  const [settings] = useAnchor({
    receiveEmails: true,
    receiveSms: false,
  });

  return (
    <div>
      <h2>Notification Preferences</h2>
      <div>
        <label>
          <Radio bind={settings} name="receiveEmails" id="emailNotifications" />
          Receive Email Notifications
        </label>
      </div>
      <div>
        <label>
          <Radio bind={settings} name="receiveSms" id="smsNotifications" />
          Receive SMS Notifications
        </label>
      </div>

      <h3>Current Settings:</h3>
      <p>Email Notifications: {settings.receiveEmails ? 'Enabled' : 'Disabled'}</p>
      <p>SMS Notifications: {settings.receiveSms ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
});

export default NotificationSettings;
```

#### Grouping Radio Buttons for Single Selection

To create a group of radio buttons where only one can be selected at a time, ensure they share the same `name` attribute (which corresponds to the `name` prop in Anchor's `Radio` component) and bind them to the same state property. The `value` prop of the HTML input (passed via `...props`) will determine which option is selected when the bound state property matches that value.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Radio } from '@anchor/react/components';

const ThemeSelector = observable(() => {
  const [appSettings] = useAnchor({
    theme: 'light', // 'light', 'dark', or 'system'
  });

  return (
    <div>
      <h2>Select Theme</h2>
      <div>
        <label>
          <Radio
            bind={appSettings}
            name="theme"
            value="light" // HTML value for this radio button
            id="themeLight"
          />
          Light
        </label>
      </div>
      <div>
        <label>
          <Radio
            bind={appSettings}
            name="theme"
            value="dark" // HTML value for this radio button
            id="themeDark"
          />
          Dark
        </label>
      </div>
      <div>
        <label>
          <Radio
            bind={appSettings}
            name="theme"
            value="system" // HTML value for this radio button
            id="themeSystem"
          />
          System Default
        </label>
      </div>

      <h3>Current Theme: {appSettings.theme}</h3>
    </div>
  );
});

export default ThemeSelector;
```

## `Select` Component

The `Select` component provides a robust and reactive way to manage dropdown selections in your React applications. It seamlessly integrates with Anchor's state management, allowing you to bind the selected value directly to a property in your reactive state.

### Why use Anchor's `Select` component?

- **Direct State Binding:** Connects the dropdown's selected value directly to a property in your Anchor state, simplifying form handling.
- **Automatic Reactivity:** The component automatically updates the bound state property when a new option is selected and re-renders when the bound state property changes programmatically.
- **Familiar HTML API:** Supports all standard HTML `<select>` and `<option>` attributes, making it easy to transition from traditional HTML forms.
- **Type Safety:** Benefits from TypeScript, ensuring that the bound value matches the expected type of your state property.

### Props

The `Select` component accepts the following Anchor-specific props in addition to standard HTML `<select>` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { SelectHTMLAttributes, RefObject } from 'react';

export type SelectProps<T extends Bindable, K extends WritableKeys<T>> = {
  /**
   * The Anchor reactive state object to which this select input will be bound.
   * Changes in the select input will automatically update the corresponding property in this state.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this select input will control.
   * This property must be writable in the bound state.
   */
  name: K;
  /**
   * A React RefObject to access the underlying HTMLSelectElement DOM element.
   * Useful for imperative DOM manipulations or integrating with third-party libraries.
   */
  ref?: RefObject<HTMLSelectElement | null>;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'>; // All standard HTML select attributes are supported.
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Dropdown Binding

Bind a `Select` component to a property in your reactive state to manage a single selection.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Select } from '@anchor/react/components';

const LanguageSelector = observable(() => {
  const [settings] = useAnchor({
    language: 'en', // Default language
  });

  return (
    <div>
      <h2>Select Language</h2>
      <label htmlFor="language-select">Choose a language:</label>
      <Select bind={settings} name="language" id="language-select">
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </Select>

      <h3>Current Language: {settings.language.toUpperCase()}</h3>
    </div>
  );
});

export default LanguageSelector;
```

When a user selects an option from the dropdown, the `settings.language` property will automatically update to the `value` of the selected `<option>`.

#### Pre-selecting a Value

The `Select` component will automatically pre-select the option whose `value` matches the initial value of the bound state property.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Select } from '@anchor/react/components';

const ThemePicker = observable(() => {
  const [preferences] = useAnchor({
    theme: 'dark', // Initial theme is 'dark'
  });

  return (
    <div>
      <h2>Choose Your Theme</h2>
      <label htmlFor="theme-select">Select Theme:</label>
      <Select bind={preferences} name="theme" id="theme-select">
        <option value="light">Light Theme</option>
        <option value="dark">Dark Theme</option>
        <option value="system">System Default</option>
      </Select>

      <h3>Selected Theme: {preferences.theme}</h3>
    </div>
  );
});

export default ThemePicker;
```

In this example, the "Dark Theme" option will be pre-selected when the component first renders because `preferences.theme` is initialized to `'dark'`.

#### Handling `onChange` Event

You can still use the standard `onChange` prop to perform additional actions when the select value changes, without interfering with Anchor's binding.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Select } from '@anchor/react/components';

const StatusUpdater = observable(() => {
  const [task] = useAnchor({
    id: 1,
    description: 'Write documentation',
    status: 'pending', // 'pending', 'in-progress', 'completed'
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(`Task status changed to: ${e.target.value}`);
    // You can perform other side effects here, like dispatching an analytics event
  };

  return (
    <div>
      <h2>Task Status</h2>
      <p>Task: {task.description}</p>
      <label htmlFor="task-status">Update Status:</label>
      <Select bind={task} name="status" id="task-status" onChange={handleStatusChange}>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </Select>

      <h3>Current Status: {task.status}</h3>
    </div>
  );
});

export default StatusUpdater;
```

When the status is changed, `task.status` will update, and the `handleStatusChange` function will also be called, logging the new status to the console.

## `Toggle` Component

The `Toggle` component provides a flexible and accessible way to implement toggle buttons, switches, or segmented controls that interact directly with your Anchor reactive state. It's designed to manage boolean states or to select a specific value within a group, offering a rich alternative to standard checkboxes or radio buttons for interactive UI elements.

### Why use Anchor's `Toggle` component?

- **Direct State Binding:** Connects the toggle's checked state or value directly to a property in your Anchor state, simplifying state management for interactive controls.
- **Automatic Reactivity:** The component automatically updates the bound state property when the toggle is activated and re-renders when the bound state property changes programmatically.
- **Flexible Value Handling:** Can be used for simple boolean toggles (on/off) or to set a specific value when part of a group of toggles.
- **Accessibility:** Built on a native `<button>` element, providing inherent accessibility features.
- **Visual State Indicators:** Supports `data-checked` and `data-partial` attributes for easy styling based on the toggle's state.

### Props

The `Toggle` component accepts the following Anchor-specific props in addition to standard HTML `<button>` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { ButtonHTMLAttributes, RefObject } from 'react';

export type ToggleProps<T, K extends WritableKeys<T>> = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * A React RefObject to access the underlying HTMLButtonElement DOM element.
   */
  ref?: RefObject<HTMLButtonElement | null>;
  /**
   * The Anchor reactive state object to which this toggle will be bound.
   * The property specified by `name` in this object will reflect the toggle's state.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this toggle will control.
   * This property must be writable in the bound state.
   */
  name: K;
  /**
   * The value that this toggle represents.
   * - If omitted, the toggle manages a boolean state (true/false).
   * - If provided, when this toggle is active, `bind[name]` will be set to this `value`.
   *   When inactive, `bind[name]` will be set to `undefined` (if `value` is provided) or `false` (if `value` is omitted).
   */
  value?: T[K];
  /**
   * An array of objects from which to inherit a 'partial' state.
   * If a property matching `name` in any of these objects has a value that matches
   * this toggle's `value` (or `true` if `value` is omitted), the toggle will be
   * marked as `data-partial="true"`. Useful for indeterminate states.
   */
  inherits?: Record<string, string | number | undefined>[];
  /**
   * A callback function that is invoked when the toggle's state changes.
   * It receives the new value of `bind[name]` after the toggle operation.
   */
  onChange?: (current: T[K] | undefined) => void;
};
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Boolean Toggle

Use `Toggle` to manage a simple boolean state, like an on/off switch.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Toggle } from '@anchor/react/components';

const NotificationToggle = observable(() => {
  const [settings] = useAnchor({
    notificationsEnabled: true,
  });

  return (
    <div>
      <h2>App Settings</h2>
      <label>
        <Toggle
          bind={settings}
          name="notificationsEnabled"
          className="toggle-switch" // Apply custom styling for a switch look
        >
          {settings.notificationsEnabled ? 'On' : 'Off'}
        </Toggle>
        Enable Notifications
      </label>
      <p>Notifications are currently: {settings.notificationsEnabled ? 'Active' : 'Inactive'}</p>
    </div>
  );
});

export default NotificationToggle;
```

Clicking the toggle button will flip the boolean value of `settings.notificationsEnabled`, and the component will re-render to reflect the change.

#### Segmented Control / Grouped Toggles

When `Toggle` components share the same `bind` and `name` props, but have different `value` props, they act as a segmented control, where only one can be "checked" at a time.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Toggle, ToggleGroup } from '@anchor/react/components'; // Import ToggleGroup

const ViewModeSelector = observable(() => {
  const [uiSettings] = useAnchor({
    viewMode: 'list', // 'list', 'grid', or 'card'
  });

  return (
    <div>
      <h2>Select View Mode</h2>
      <ToggleGroup className="segmented-control">
        {' '}
        {/* Use ToggleGroup for styling */}
        <Toggle bind={uiSettings} name="viewMode" value="list" className="toggle-button">
          List View
        </Toggle>
        <Toggle bind={uiSettings} name="viewMode" value="grid" className="toggle-button">
          Grid View
        </Toggle>
        <Toggle bind={uiSettings} name="viewMode" value="card" className="toggle-button">
          Card View
        </Toggle>
      </ToggleGroup>
      <p>Current View Mode: {uiSettings.viewMode}</p>
    </div>
  );
});

export default ViewModeSelector;
```

Clicking any `Toggle` button in the `ToggleGroup` will set `uiSettings.viewMode` to the `value` of the clicked button. The `ToggleGroup` component is a simple `div` that can be used for styling purposes.

#### Indeterminate State with `inherits`

The `inherits` prop can be used to indicate a "partial" or "indeterminate" state, often seen in tree-like selections where a parent might be partially checked if some, but not all, of its children are selected.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Toggle } from '@anchor/react/components';

const FeaturePermissions = observable(() => {
  const [userPermissions] = useAnchor({
    canEdit: false,
    canDelete: true,
    canView: true,
  });

  // A "parent" state that is partially true if some permissions are enabled
  const [groupStatus] = useAnchor({
    allFeatures: false, // This will be used to determine partial state
  });

  // Simulate a "parent" toggle that is partially checked if any child is true
  // In a real app, groupStatus.allFeatures would be derived from userPermissions
  // For this example, we'll manually set it for demonstration
  React.useEffect(() => {
    if (userPermissions.canEdit || userPermissions.canDelete || userPermissions.canView) {
      groupStatus.allFeatures = true;
    } else {
      groupStatus.allFeatures = false;
    }
  }, [userPermissions.canEdit, userPermissions.canDelete, userPermissions.canView]);

  return (
    <div>
      <h2>Feature Permissions</h2>
      <div>
        <label>
          <Toggle
            bind={groupStatus}
            name="allFeatures"
            value={true} // This toggle represents the "all features" state
            inherits={[userPermissions]} // Check if any individual permission is true
            className="toggle-button">
            All Features
          </Toggle>
        </label>
      </div>
      <div style={{ marginLeft: '20px' }}>
        <label>
          <Toggle bind={userPermissions} name="canView" className="toggle-button">
            Can View
          </Toggle>
        </label>
        <label>
          <Toggle bind={userPermissions} name="canEdit" className="toggle-button">
            Can Edit
          </Toggle>
        </label>
        <label>
          <Toggle bind={userPermissions} name="canDelete" className="toggle-button">
            Can Delete
          </Toggle>
        </label>
      </div>
      <p>Group Status: {groupStatus.allFeatures ? 'Some/All Enabled' : 'None Enabled'}</p>
    </div>
  );
});

export default FeaturePermissions;
```

## `Checkbox` Component

The `Checkbox` component provides a straightforward and reactive way to manage boolean states, typically used for toggling features or options. It integrates seamlessly with Anchor's reactive state, allowing you to bind its checked state directly to a boolean property in your state.

### Why use Anchor's `Checkbox` component?

- **Direct State Binding:** Easily connects the checkbox's checked status to a boolean property in your Anchor state, simplifying form handling.
- **Automatic Reactivity:** The component automatically updates the bound state property when the checkbox is toggled and re-renders when the bound state property changes programmatically.
- **Familiar API:** Extends standard HTML `<input type="checkbox">` attributes, making it intuitive to use.
- **Type Safety:** Benefits from TypeScript, ensuring that the bound value matches the expected boolean type of your state property.

### Props

The `Checkbox` component accepts the following Anchor-specific props in addition to standard HTML `<input type="checkbox">` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { InputHTMLAttributes, RefObject } from 'react';

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = {
  /**
   * The Anchor reactive state object to which this checkbox will be bound.
   * The property specified by `name` in this object will reflect the checked status.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this checkbox will control.
   * This property should typically be a boolean and must be writable in the bound state.
   */
  name: K;
  /**
   * A React RefObject to access the underlying HTMLInputElement DOM element.
   */
  ref?: RefObject<HTMLInputElement | null>;
  /**
   * The initial checked state for the checkbox.
   * If `bind[name]` is undefined, this `checked` value will be used.
   * Note that the bound state's value will always take precedence if it exists.
   */
  checked?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'checked'>;
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Checkbox Binding

Bind a `Checkbox` component to a boolean property in your reactive state.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Checkbox } from '@anchor/react/components';

const UserPreferences = observable(() => {
  const [preferences] = useAnchor({
    receiveNewsletter: true,
    receiveSms: false,
  });

  return (
    <div>
      <h2>User Preferences</h2>
      <div>
        <label>
          <Checkbox bind={preferences} name="receiveNewsletter" id="newsletterCheckbox" />
          Receive Newsletter
        </label>
      </div>
      <div>
        <label>
          <Checkbox bind={preferences} name="acceptTerms" id="termsCheckbox" />I accept the terms and conditions
        </label>
      </div>

      <h3>Current Preferences:</h3>
      <p>Newsletter: {preferences.receiveNewsletter ? 'Subscribed' : 'Not Subscribed'}</p>
      <p>Terms Accepted: {preferences.acceptTerms ? 'Yes' : 'No'}</p>
    </div>
  );
});

export default UserPreferences;
```

In this example, toggling the checkboxes will directly update the `receiveNewsletter` and `acceptTerms` properties in your `preferences` state.

#### Checkbox with Initial State

The `checked` prop can be used to set an initial state for the checkbox if the bound state property is `undefined`.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { Checkbox } from '@anchor/react/components';

const FeatureToggle = observable(() => {
  const [featureFlags] = useAnchor({
    betaFeatures: undefined, // Initially undefined
  });

  return (
    <div>
      <h2>Feature Flags</h2>
      <div>
        <label>
          <Checkbox
            bind={featureFlags}
            name="betaFeatures"
            id="betaFeaturesCheckbox"
            checked={false} // Default to unchecked if betaFeatures is undefined
          />
          Enable Beta Features
        </label>
      </div>
      <p>Beta Features Status: {featureFlags.betaFeatures ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
});

export default FeatureToggle;
```

Here, if `featureFlags.betaFeatures` is `undefined`, the checkbox will initially be unchecked due to `checked={false}`. Once toggled, `featureFlags.betaFeatures` will become `true` or `false`.

## `ColorPicker` Component

The `ColorPicker` component provides a reactive and visually intuitive way to select colors within your React application. It binds directly to a string property in your Anchor state, representing the color value (e.g., hexadecimal).

### Why use Anchor's `ColorPicker` component?

- **Direct State Binding:** Connects the selected color value directly to a string property in your Anchor state, simplifying color management.
- **Automatic Reactivity:** The component automatically updates the bound state property when a new color is chosen and re-renders when the bound state property changes programmatically.
- **Visual Feedback:** The component's background color can be set to reflect the currently selected color, providing immediate visual feedback.
- **Familiar HTML API:** Utilizes the native HTML `<input type="color">` element, ensuring broad browser compatibility and accessibility.
- **Extensible:** Supports all standard HTML `<input type="color">` attributes, allowing for full customization.

### Props

The `ColorPicker` component accepts the following Anchor-specific props in addition to standard HTML `<input type="color">` attributes:

```typescript
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { InputHTMLAttributes, RefObject } from 'react';

export type InputProps<T extends Bindable, K extends WritableKeys<T>> = {
  /**
   * The Anchor reactive state object to which this color picker will be bound.
   * Changes in the color picker will automatically update the corresponding property in this state.
   */
  bind: T;
  /**
   * The key (property name) within the `bind` object that this color picker will control.
   * This property must be writable in the bound state and should store a string representing the color (e.g., hex code).
   */
  name: K;
  /**
   * The initial color value for the color picker.
   * If `bind[name]` is undefined, this `value` will be used.
   * Note that the bound state's value will always take precedence if it exists.
   */
  value?: string;
  /**
   * An array of objects from which to inherit a default color value.
   * If a property matching `name` is found in any of these objects and has a value,
   * its value will be used as the initial color if `bind[name]` and `value` are undefined.
   */
  inherits?: Record<string, string | number | undefined>[];
  /**
   * A React RefObject to access the underlying HTMLInputElement DOM element (the color input itself).
   */
  ref?: RefObject<HTMLInputElement | null>;
  /**
   * The content to be rendered inside the color picker's label.
   * This allows you to place text or other elements next to the color input.
   */
  children?: React.ReactNode;
  /**
   * A CSS class name to apply to the outer `label` element of the color picker.
   * Useful for custom styling.
   */
  className?: string;
  /**
   * A standard React `onChange` event handler for the color input.
   * This will be called in addition to Anchor's internal state update.
   */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /**
   * A placeholder value for the color picker. This will be used as the initial color
   * if `bind[name]`, `value`, and `inherits` do not provide a color. Defaults to '#000000'.
   */
  placeholder?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'type'>;
```

### Usage Examples

Remember to wrap your components with `observable` to ensure they react to state changes.

#### Basic Color Selection

Bind a `ColorPicker` component to a string property in your reactive state.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { ColorPicker } from '@anchor/react/components';

const ThemeCustomizer = observable(() => {
  const [themeSettings] = useAnchor({
    primaryColor: '#FF0000', // Initial color: Red
    backgroundColor: '#FFFFFF', // Initial color: White
  });

  return (
    <div>
      <h2>Customize Theme</h2>
      <div>
        <label>
          Primary Color:
          <ColorPicker bind={themeSettings} name="primaryColor" />
        </label>
        <p style={{ color: themeSettings.primaryColor }}>This text uses the primary color.</p>
      </div>
      <div>
        <label>
          Background Color:
          <ColorPicker bind={themeSettings} name="backgroundColor" />
        </label>
        <div
          style={{
            width: '100px',
            height: '50px',
            backgroundColor: themeSettings.backgroundColor,
            border: '1px solid #ccc',
          }}></div>
      </div>
      <p>Primary Color (Hex): {themeSettings.primaryColor}</p>
      <p>Background Color (Hex): {themeSettings.backgroundColor}</p>
    </div>
  );
});

export default ThemeCustomizer;
```

As you select colors from the pickers, the `primaryColor` and `backgroundColor` properties in `themeSettings` will update, and the component will re-render to reflect the new colors.

#### Customizing Appearance with `children` and `className`

You can place custom content inside the `ColorPicker` component, which will be rendered within its `label` element. Use `className` for custom styling.

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';
import { ColorPicker } from '@anchor/react/components';

const CustomColorPicker = observable(() => {
  const [appColors] = useAnchor({
    accentColor: '#008000', // Initial color: Green
  });

  return (
    <div>
      <h2>Custom Color Selector</h2>
      <ColorPicker
        bind={appColors}
        name="accentColor"
        className="my-custom-color-picker" // Apply custom class
      >
        {/* Custom content inside the label */}
        <span style={{ marginRight: '10px' }}>Choose Accent:</span>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: appColors.accentColor,
            border: '2px solid #333',
            display: 'inline-block',
            verticalAlign: 'middle',
          }}></div>
      </ColorPicker>
      <p>Selected Accent Color: {appColors.accentColor}</p>
    </div>
  );
});

export default CustomColorPicker;
```

This example demonstrates how to create a more visually integrated color picker by using the `children` prop to display a colored circle next to the input.

## `Observable` HOC and `observe` Utility

Anchor for React provides powerful mechanisms to make your components reactive to state changes. The `observable` Higher-Order Component (HOC) and the `observe` utility function are your primary tools for achieving this, ensuring your UI stays synchronized with your application's state with minimal re-renders.

### `observable` HOC

The `observable` HOC is the simplest and most common way to make any React functional component reactive. When you wrap a component with `observable`, any Anchor reactive state accessed within that component's render function will automatically trigger a re-render of the component when the accessed state changes.

#### Why use Anchor's `observable` HOC?

- **Effortless Reactivity:** Automatically tracks dependencies and re-renders components only when necessary, without manual `useMemo` or `useCallback` optimizations.
- **Clean Code:** Keeps your component logic clean by abstracting away the underlying observation mechanism.
- **Seamless Integration:** Works with any functional React component.
- **Performance:** Leverages Anchor's fine-grained reactivity to minimize unnecessary re-renders, leading to highly performant applications.

#### Type Signature

```typescript
import { ComponentType } from 'react';
import type { AnchoredProps } from '../types.js';

export function observable<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string): ComponentType<T>;
```

- `Component`: The React functional component you want to make reactive.
- `displayName` (optional): A string to be used as the display name for the wrapped component in React DevTools, useful for debugging.

#### Usage Example

```tsx
import React from 'react';
import { useAnchor, observable } from '@anchor/react';

// Wrap your component with the `observable` HOC
const UserDisplay = observable(() => {
  const [user] = useAnchor({
    firstName: 'Alice',
    lastName: 'Wonderland',
    age: 30,
  });

  const updateAge = () => {
    user.age++;
  };

  const changeName = () => {
    user.firstName = 'Bob';
    user.lastName = 'The Builder';
  };

  return (
    <div>
      <h2>User Profile</h2>
      <p>
        Name: {user.firstName} {user.lastName}
      </p>
      <p>Age: {user.age}</p>
      <button onClick={updateAge}>Happy Birthday!</button>
      <button onClick={changeName}>Change Name</button>
    </div>
  );
});

export default UserDisplay;
```

In this example, any changes to `user.firstName`, `user.lastName`, or `user.age` will automatically cause the `UserDisplay` component to re-render, keeping the UI up-to-date.

### `observe` Utility Function

The `observe` utility function provides an alternative way to create a reactive React component. It's particularly useful when you need to create an inline reactive component or when you need to pass a `ref` to the rendered content.

#### Why use Anchor's `observe` utility?

- **Inline Reactivity:** Create reactive components directly within your render method.
- **Ref Support:** Provides a `ref` to the rendered content, useful for integrating with imperative APIs or third-party libraries.
- **Fine-Grained Control:** Similar to `observable`, it ensures efficient re-renders based on observed state changes.

#### Type Signature

```typescript
import { ComponentType, ReactNode, Ref } from 'react';

export function observe<R>(factory: (ref: Ref<R>) => ReactNode, displayName?: string): ComponentType;
```

- `factory`: A callback function that returns a `ReactNode`. This function will be executed within an observing context, and any reactive state accessed inside it will trigger re-renders. It receives a `ref` object that you can attach to your rendered element.
- `displayName` (optional): A string to be used as the display name for the returned component in React DevTools.

#### Usage Example

```tsx
import React from 'react';
import { useAnchor, observe } from '@anchor/react';

// Create a reactive component using the observe utility
const LiveClock = observe(() => {
  const [time] = useAnchor({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    second: new Date().getSeconds(),
  });

  // Update time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      time.hour = now.getHours();
      time.minute = now.getMinutes();
      time.second = now.getSeconds();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Current Time:</h2>
      <p>
        {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}:
        {String(time.second).padStart(2, '0')}
      </p>
    </div>
  );
});

function App() {
  return (
    <div>
      <h1>Anchor React Demo</h1>
      <LiveClock />
    </div>
  );
}

export default App;
```

In this example, `LiveClock` is a reactive component created using `observe`. It updates every second, and only the `LiveClock` component re-renders, not its parent `App` component.
