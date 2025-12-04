---
title: 'Anchor for React: A Guide to Built-in UI Components'
description: "Explore Anchor's built-in React components like Input, Checkbox, Radio, and Select. Learn how to bind them directly to reactive state for simplified form handling."
keywords:
  - anchor for react
  - react ui components
  - anchor components
  - input component
  - checkbox component
  - radio component
  - select component
  - toggle component
  - form handling react
  - reactive forms
---

# A Guide to Anchor's Built-in React Components

**Anchor** provides a set of UI components that integrate directly with reactive state, simplifying form handling and ensuring optimal performance. These components automatically bind to state properties, reducing boilerplate and ensuring that only the necessary parts of your UI re-render when state changes.

## How Components Work

Anchor's components directly bind to reactive state properties, eliminating the need for explicit state management hooks like `useState` and `onChange` handlers for each input. When a user interacts with an Anchor component, the bound state property is automatically updated, and any components observing that property will re-render accordingly.

This approach addresses common React pain points:

- **Boilerplate Reduction:** No need for `useState` and `onChange` handlers for every input
- **Prop Drilling Elimination:** Direct binding to state eliminates the need to pass values and setters down component trees
- **Optimized Re-renders:** Only the input and its direct consumers re-render when the bound value changes

## Input Components

These are UI input components that bind directly to reactive state properties.

### **`Input`**

A versatile React component for text and other input types, binding directly to a reactive state property.

**Props**

- **`bind`** - The Anchor reactive state object to which this input will be bound
- **`name`** - The key (property name) within the `bind` object that this input will control
- **All standard HTML input attributes** - All other standard HTML `<input>` attributes are supported

[API Reference](../apis/react/components.md#input)

#### Usage

::: details Basic Text Input {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Input } from '@anchorlib/react/components';

const UserProfile = observer(() => {
  const [user] = useAnchor({
    name: '',
    email: '',
  });

  return (
    <div>
      <h2>User Profile</h2>
      <div>
        <label htmlFor="userName">Name:</label>
        <Input bind={user} name="name" id="userName" placeholder="Enter your name" />
      </div>
      <div>
        <label htmlFor="userEmail">Email:</label>
        <Input bind={user} name="email" id="userEmail" type="email" placeholder="Enter your email" />
      </div>
      <div>
        <h3>Current Values:</h3>
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
      </div>
    </div>
  );
});

export default UserProfile;
```

:::

::: details Number Input with Automatic Conversion {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Input } from '@anchorlib/react/components';

const ProductForm = observer(() => {
  const [product] = useAnchor({
    name: '',
    price: 0,
    quantity: 1,
  });

  return (
    <div>
      <h2>Product Form</h2>
      <div>
        <label htmlFor="productName">Product Name:</label>
        <Input bind={product} name="name" id="productName" placeholder="Enter product name" />
      </div>
      <div>
        <label htmlFor="productPrice">Price:</label>
        <Input bind={product} name="price" id="productPrice" type="number" step="0.01" placeholder="0.00" />
      </div>
      <div>
        <label htmlFor="productQuantity">Quantity:</label>
        <Input bind={product} name="quantity" id="productQuantity" type="number" placeholder="1" />
      </div>
      <div>
        <h3>Product Details:</h3>
        <p>Name: {product.name}</p>
        <p>Price: ${product.price.toFixed(2)}</p>
        <p>Quantity: {product.quantity}</p>
        <p>Total Value: ${(product.price * product.quantity).toFixed(2)}</p>
      </div>
    </div>
  );
});

export default ProductForm;
```

:::

::: tip When to use it?

Use the `Input` component whenever you need to bind text or numeric input values to reactive state properties. It automatically handles type conversion for number inputs and provides seamless integration with Anchor's reactivity system.

:::

### **`Checkbox`**

A React component for a checkbox input, binding directly to a reactive boolean state property.

**Props**

- **`bind`** - The Anchor reactive state object to which this checkbox will be bound
- **`name`** - The key (property name) within the `bind` object that this checkbox will control
- **`checked`** _(optional)_ - The initial checked state if the bound property is undefined
- **All standard HTML checkbox attributes** - All other standard HTML checkbox attributes are supported

[API Reference](../apis/react/components.md#checkbox)

#### Usage

::: details Basic Checkbox Binding {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Checkbox } from '@anchorlib/react/components';

const UserPreferences = observer(() => {
  const [preferences] = useAnchor({
    receiveNewsletter: true,
    acceptTerms: false,
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

:::

::: details Checkbox with Initial State {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Checkbox } from '@anchorlib/react/components';

const FeatureToggle = observer(() => {
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

:::

::: tip When to use it?

Use the `Checkbox` component when you need to bind boolean values to reactive state properties. It's perfect for toggles, feature flags, and preference settings.

:::

### **`Radio`**

A React component for a radio button input, binding directly to a reactive state property.

**Props**

- **`bind`** - The Anchor reactive state object to which this radio button will be bound
- **`name`** - The key (property name) within the `bind` object that this radio button will control
- **`value`** - The value that will be assigned to the bound property when this radio button is selected
- **`checked`** _(optional)_ - Whether this radio button should be initially checked
- **All standard HTML radio attributes** - All other standard HTML radio button attributes are supported

[API Reference](../apis/react/components.md#radio)

#### Usage

::: details Radio Group for Single Selection {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Radio } from '@anchorlib/react/components';

const ThemeSelector = observer(() => {
  const [settings] = useAnchor({
    theme: 'light', // Default theme
  });

  return (
    <div>
      <h2>Theme Settings</h2>
      <fieldset>
        <legend>Select Theme:</legend>
        <label>
          <Radio bind={settings} name="theme" value="light" />
          Light Theme
        </label>
        <label>
          <Radio bind={settings} name="theme" value="dark" />
          Dark Theme
        </label>
        <label>
          <Radio bind={settings} name="theme" value="auto" />
          Auto (System Default)
        </label>
      </fieldset>

      <p>Current Theme: {settings.theme}</p>
    </div>
  );
});

export default ThemeSelector;
```

:::

::: details Radio Buttons with Custom Values {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Radio } from '@anchorlib/react/components';

const PrioritySelector = observer(() => {
  const [task] = useAnchor({
    priority: 'medium',
  });

  return (
    <div>
      <h2>Task Priority</h2>
      <fieldset>
        <legend>Select Priority:</legend>
        <label>
          <Radio bind={task} name="priority" value="low" />
          Low
        </label>
        <label>
          <Radio bind={task} name="priority" value="medium" />
          Medium
        </label>
        <label>
          <Radio bind={task} name="priority" value="high" />
          High
        </label>
        <label>
          <Radio bind={task} name="priority" value="critical" />
          Critical
        </label>
      </fieldset>

      <p>Selected Priority: {task.priority}</p>
    </div>
  );
});

export default PrioritySelector;
```

:::

::: tip When to use it?

Use the `Radio` component when you need users to make a single selection from a group of options. Each radio button in a group should have the same `name` prop but different `value` props.

:::

### **`Select`**

A React component for a select dropdown, binding directly to a reactive state property.

**Props**

- **`bind`** - The Anchor reactive state object to which this select will be bound
- **`name`** - The key (property name) within the `bind` object that this select will control
- **`value`** _(optional)_ - The initial selected value if the bound property is undefined
- **All standard HTML select attributes** - All other standard HTML `<select>` attributes are supported

[API Reference](../apis/react/components.md#select)

#### Usage

::: details Basic Select Dropdown {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Select } from '@anchorlib/react/components';

const CountrySelector = observer(() => {
  const [user] = useAnchor({
    country: '',
  });

  return (
    <div>
      <h2>Country Selection</h2>
      <div>
        <label htmlFor="countrySelect">Select your country:</label>
        <Select bind={user} name="country" id="countrySelect">
          <option value="">-- Please select --</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
          <option value="au">Australia</option>
          <option value="de">Germany</option>
        </Select>
      </div>

      <p>Selected Country: {user.country ? user.country.toUpperCase() : 'None'}</p>
    </div>
  );
});

export default CountrySelector;
```

:::

::: details Select with Initial Value {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Select } from '@anchorlib/react/components';

const RoleSelector = observer(() => {
  const [employee] = useAnchor({
    role: undefined, // No initial role
  });

  return (
    <div>
      <h2>Employee Role</h2>
      <div>
        <label htmlFor="roleSelect">Select role:</label>
        <Select
          bind={employee}
          name="role"
          id="roleSelect"
          value="employee" // Default value if role is undefined
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
          <option value="vp">Vice President</option>
          <option value="ceo">CEO</option>
        </Select>
      </div>

      <p>Current Role: {employee.role || 'Not set'}</p>
    </div>
  );
});

export default RoleSelector;
```

:::

::: tip When to use it?

Use the `Select` component when you need users to choose from a dropdown list of options. It's ideal for categorical data like countries, roles, or status values.

:::

### **`ColorPicker`**

A React component for a color input, binding directly to a reactive string state property representing a color value.

**Props**

- **`bind`** - The Anchor reactive state object to which this color picker will be bound
- **`name`** - The key (property name) within the `bind` object that this color picker will control
- **`value`** _(optional)_ - The initial color value if the bound property is undefined
- **All standard HTML color input attributes** - All other standard HTML `<input type="color">` attributes are supported

[API Reference](../apis/react/components.md#colorpicker)

#### Usage

::: details Basic Color Picker {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { ColorPicker } from '@anchorlib/react/components';

const ThemeCustomizer = observer(() => {
  const [theme] = useAnchor({
    primaryColor: '#3498db',
    secondaryColor: '#2ecc71',
  });

  return (
    <div>
      <h2>Theme Customizer</h2>
      <div>
        <label htmlFor="primaryColor">Primary Color:</label>
        <ColorPicker bind={theme} name="primaryColor" id="primaryColor" />
        <span
          style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            backgroundColor: theme.primaryColor,
            border: '1px solid #ccc',
            marginLeft: '10px',
          }}></span>
      </div>
      <div>
        <label htmlFor="secondaryColor">Secondary Color:</label>
        <ColorPicker bind={theme} name="secondaryColor" id="secondaryColor" />
        <span
          style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            backgroundColor: theme.secondaryColor,
            border: '1px solid #ccc',
            marginLeft: '10px',
          }}></span>
      </div>

      <div
        style={{
          padding: '20px',
          marginTop: '20px',
          backgroundColor: theme.primaryColor,
          color: theme.secondaryColor,
        }}>
        <h3>Preview</h3>
        <p>This is a preview of your color scheme</p>
      </div>
    </div>
  );
});

export default ThemeCustomizer;
```

:::

::: tip When to use it?

Use the `ColorPicker` component when you need users to select colors. It's perfect for theme customization, design tools, or any application where color selection is important.

:::

## Interactive Components

These components provide interactive UI elements that bind to reactive state.

### **`Toggle`**

A React component for a toggle button, binding directly to a reactive state property.

**Props**

- **`bind`** - The Anchor reactive state object to which this toggle will be bound
- **`name`** - The key (property name) within the `bind` object that this toggle will control
- **`value`** _(optional)_ - The value that will be assigned to the bound property when toggled
- **All standard HTML button attributes** - All other standard HTML button attributes are supported

[API Reference](../apis/react/components.md#toggle)

#### Usage

::: details Basic Toggle Button {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Toggle } from '@anchorlib/react/components';

const NotificationToggle = observer(() => {
  const [settings] = useAnchor({
    notifications: false,
  });

  return (
    <div>
      <h2>Notification Settings</h2>
      <div>
        <Toggle bind={settings} name="notifications" value={true}>
          {settings.notifications ? 'Notifications ON' : 'Notifications OFF'}
        </Toggle>
      </div>

      <p>Status: {settings.notifications ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
});

export default NotificationToggle;
```

:::

::: details Toggle with Multiple Values {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Toggle } from '@anchorlib/react/components';

const ViewModeToggle = observer(() => {
  const [ui] = useAnchor({
    viewMode: 'grid', // Default view mode
  });

  return (
    <div>
      <h2>View Mode</h2>
      <div>
        <Toggle bind={ui} name="viewMode" value={ui.viewMode === 'grid' ? 'list' : 'grid'}>
          Switch to {ui.viewMode === 'grid' ? 'List' : 'Grid'} View
        </Toggle>
      </div>

      <div style={{ marginTop: '20px' }}>
        {ui.viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ padding: '20px', border: '1px solid #ccc' }}>
                Grid Item {i}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
                List Item {i}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default ViewModeToggle;
```

:::

::: tip When to use it?

Use the `Toggle` component when you need a button that toggles between states or values. It's great for feature toggles, view modes, or any binary state control.

:::

### **`ToggleGroup`**

A React component for grouping toggle buttons.

**Props**

- **All standard HTML div attributes** - All other standard HTML div attributes are supported

[API Reference](../apis/react/components.md#togglegroup)

#### Usage

::: details Toggle Button Group {open}

```tsx
import React from 'react';
import { useAnchor, observer } from '@anchorlib/react';
import { Toggle, ToggleGroup } from '@anchorlib/react/components';

const FilterControls = observer(() => {
  const [filters] = useAnchor({
    category: 'all',
  });

  return (
    <div>
      <h2>Product Filters</h2>
      <ToggleGroup style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Toggle
          bind={filters}
          name="category"
          value="all"
          style={{
            padding: '8px 16px',
            backgroundColor: filters.category === 'all' ? '#007bff' : '#f8f9fa',
            color: filters.category === 'all' ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
          All Products
        </Toggle>
        <Toggle
          bind={filters}
          name="category"
          value="electronics"
          style={{
            padding: '8px 16px',
            backgroundColor: filters.category === 'electronics' ? '#007bff' : '#f8f9fa',
            color: filters.category === 'electronics' ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
          Electronics
        </Toggle>
        <Toggle
          bind={filters}
          name="category"
          value="clothing"
          style={{
            padding: '8px 16px',
            backgroundColor: filters.category === 'clothing' ? '#007bff' : '#f8f9fa',
            color: filters.category === 'clothing' ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
          Clothing
        </Toggle>
      </ToggleGroup>

      <p>Selected Category: {filters.category}</p>
    </div>
  );
});

export default FilterControls;
```

:::

::: tip When to use it?

Use the `ToggleGroup` component to group related toggle buttons together. It provides a semantic wrapper that helps with styling and accessibility.

:::

## Best Practices

When working with Anchor's components, keep these best practices in mind:

1. **Use Appropriate Components**: Choose the right component for your use case:
   - `Input` for text and numeric inputs
   - `Checkbox` for boolean toggles
   - `Radio` for single selection from a group
   - `Select` for dropdown selections
   - `ColorPicker` for color selection
   - `Toggle` for toggle buttons
   - `ToggleGroup` for grouping toggles
2. **Leverage Direct Binding**: Take advantage of direct state binding to reduce boilerplate code and simplify your components.
3. **Combine with Other APIs**: Use Anchor's components in conjunction with other APIs like `useDerived`, `useValue`, and observation patterns for more complex UI logic.
4. **Handle Edge Cases**: Use the `value` and `checked` props to handle initial states when the bound property might be undefined.
5. **Style Consistently**: Since these components accept all standard HTML attributes, you can style them just like regular HTML elements.
