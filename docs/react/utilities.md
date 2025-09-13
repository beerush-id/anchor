# Utilities in Anchor for React

**Anchor** provides a collection of utility hooks and functions that enhance your development experience when working
with reactive state. These utilities help with common tasks such as creating snapshots, managing microtasks, generating
unique IDs, and debugging your reactive applications.

## Utility Hooks

These React hooks provide various utility functionalities for working with Anchor's reactive system.

### **`useSnapshot(state, transform?)`**

A React hook that creates a snapshot of a reactive state. The snapshot is a plain object that reflects the current state
at the time of creation. It does not update automatically when the state changes. It can optionally transform the
snapshot using a transform function.

**Params**

- **`state`** - The reactive state to create a snapshot from
- **`transform`** _(optional)_ - A function that transforms the snapshot before it is returned

[API Reference](../apis/react/utilities.md#usesnapshot)

#### Usage

::: details Basic Snapshot Usage

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useSnapshot } from '@anchorlib/react';

const StateViewer = () => {
  const [user] = useAnchor({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  });

  // Create a snapshot of the current state
  const userSnapshot = useSnapshot(user);

  const updateUser = () => {
    user.name = 'Jane Smith';
    user.age = 28;
  };

  return (
    <div>
      <h2>Current State:</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>

      <h2>Snapshot (captured at render time):</h2>
      <pre>{JSON.stringify(userSnapshot, null, 2)}</pre>

      <button onClick={updateUser}>Update User</button>
    </div>
  );
};

export default StateViewer;
```

:::

::: details Snapshot with Transformation

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { useSnapshot } from '@anchorlib/react';

const UserProfile = () => {
  const [user] = useAnchor({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    age: 30,
    role: 'admin',
  });

  // Create a transformed snapshot
  const userPublicProfile = useSnapshot(user, (userData) => ({
    name: `${userData.firstName} ${userData.lastName}`,
    role: userData.role,
  }));

  const updateUserInfo = () => {
    user.firstName = 'Jane';
    user.lastName = 'Smith';
    user.age = 28;
  };

  return (
    <div>
      <h2>Public Profile (from snapshot):</h2>
      <p>Name: {userPublicProfile.name}</p>
      <p>Role: {userPublicProfile.role}</p>

      <h2>Full User Data:</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>

      <button onClick={updateUserInfo}>Update User Info</button>
    </div>
  );
};

export default UserProfile;
```

:::

::: tip When to use it?

Use `useSnapshot` when you need to capture the state at a specific point in time, especially for debugging, logging, or
comparison purposes. Since snapshots don't automatically update, they're perfect for comparing "before" and "after"
states.

:::

### **`useMicrotask(timeout?)`**

A React hook that provides a microtask function with an optional timeout. This hook allows you to debounce rapid function calls - for example, when a user is rapidly typing, instead of executing a function for every keystroke, it will only execute the last function call either when the user stops typing or when the specified timeout is reached.

**Params**

- **`timeout`** _(optional)_ - Delay in milliseconds

**Returns**

A tuple containing:

- **`run`** - A function to schedule the microtask
- **`cancel`** - A function to cancel the scheduled microtask

[API Reference](../apis/react/utilities.md#usemicrotask)

#### Usage

::: details Handling Rapid User Input

```tsx
import React, { useState } from 'react';
import { useMicrotask } from '@anchorlib/react';

const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Get a microtask scheduler
  const [performSearch, cancelSearch] = useMicrotask(300);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Schedule search - if user keeps typing, previous searches are cancelled
    performSearch(() => {
      // This only runs for the last keystroke
      // or when 300ms has passed since the last keystroke
      console.log('Performing search for:', value);
      // Simulate API call
      // fetchSearchResults(value).then(setSearchResults);
    });
  };

  return (
    <div>
      <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search..." />
      <p>Search term: {searchTerm}</p>
      <p>Results would appear here</p>
    </div>
  );
};

export default SearchComponent;
```

:::

::: details Microtask with Immediate Execution

```tsx
import React, { useState } from 'react';
import { useMicrotask } from '@anchorlib/react';

const ResizeHandler = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Get a microtask scheduler without timeout (executes immediately)
  const [handleResize, cancelResize] = useMicrotask();

  // Imagine this is called on window resize events
  const onWindowResize = () => {
    // If many resize events happen rapidly, only the last one executes
    handleResize(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
  };

  return (
    <div>
      <p>
        Window dimensions: {dimensions.width} x {dimensions.height}
      </p>
      <button onClick={onWindowResize}>Simulate Resize</button>
    </div>
  );
};

export default ResizeHandler;
```

:::

::: tip When to use it?

Use `useMicrotask` when you need to debounce rapid function calls. If multiple microtasks are scheduled before the previous one executes, only the last one will run - previous ones are automatically cancelled. This is particularly useful for:

- Handling user input (search, filtering)
- Resize events
- Scroll events
- Any scenario where rapid successive calls should be debounced

:::

### **`useMicrobatch(delay?)`**

A React hook that provides a microbatch function with an optional delay. This hook allows you to batch multiple operations together and execute them after a short delay. Unlike microtasks, all scheduled operations are executed when the timeout occurs.

**Params**

- **`delay`** _(optional)_ - Delay in milliseconds

**Returns**

A tuple containing:

- **`schedule`** - A function to schedule work in the batch
- **`reset`** - A function to reset the batch

[API Reference](../apis/react/utilities.md#usemicrobatch)

#### Usage

::: details Batching Multiple Operations

```tsx
import React, { useState } from 'react';
import { useMicrobatch } from '@anchorlib/react';

const NotificationBatcher = () => {
  const [notifications, setNotifications] = useState([]);
  const [batchCount, setBatchCount] = useState(0);

  // Get a microbatch scheduler
  const [scheduleNotification, resetBatch] = useMicrobatch(1000);

  const addNotification = (message) => {
    // Schedule notification to be processed in batch
    scheduleNotification(() => {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setBatchCount((c) => c + 1);
    });
  };

  const handleReset = () => {
    resetBatch();
    setBatchCount(0);
  };

  return (
    <div>
      <p>Notifications in current batch: {batchCount}</p>
      <button onClick={() => addNotification(`Notification ${Date.now()}`)}>Add Notification</button>
      <button onClick={() => addNotification(`Another Notification ${Date.now()}`)}>Add Another Notification</button>
      <button onClick={handleReset}>Reset Batch</button>

      <ul>
        {notifications.map((notification) => (
          <li key={notification.id}>
            {notification.message} - {notification.timestamp}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationBatcher;
```

:::

::: tip When to use it?

Use `useMicrobatch` when you want to collect multiple operations and execute them all together after a delay. This is useful for:

- Batching API calls
- Collecting analytics events
- Grouping UI updates
- Any scenario where you want to process multiple operations together

All scheduled operations within the delay period will be executed when the timeout occurs, unlike microtasks which only execute the last one.

:::

### **`useStableRef(init, deps)`**

A React hook that provides a stable reference to a value, updating only when specified dependencies change. This hook
ensures that the returned reference object remains stable across re-renders, only updating its value and dependencies
when the provided dependencies change.

**Params**

- **`init`** - The initial value or a factory function that returns the initial value
- **`deps`** - An array of dependencies that, when changed, will trigger an update of the ref's value

[API Reference](../apis/react/utilities.md#usestableref)

#### Usage

::: details Stable Reference with Dependencies

```tsx
import React, { useState } from 'react';
import { useStableRef } from '@anchorlib/react';

const StableRefExample = () => {
  const [count, setCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  // Create a stable ref that updates only when multiplier changes
  const calculatedValue = useStableRef(() => {
    console.log('Recalculating stable value...');
    return count * multiplier;
  }, [multiplier]);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Multiplier: {multiplier}</p>
      <p>Calculated Value: {calculatedValue.value}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment Count</button>
      <button onClick={() => setMultiplier((m) => m * 2)}>Double Multiplier</button>
    </div>
  );
};

export default StableRefExample;
```

:::

::: tip When to use it?

Use `useStableRef` when you need a value that remains stable across re-renders but should update when specific
dependencies change. This is useful for expensive calculations that shouldn't recompute on every render.

:::

### **`useShortId()`**

A React hook that generates a short, unique identifier string. This hook uses the **shortId** function from the Anchor
core library to generate a unique ID that remains stable across re-renders.

[API Reference](../apis/react/utilities.md#useshortid)

#### Usage

::: details Generating Unique IDs

```tsx
import React, { useState } from 'react';
import { useShortId } from '@anchorlib/react';

const IdGenerator = () => {
  const [items, setItems] = useState([]);

  // Generate a short unique ID
  const id = useShortId();

  const addItem = () => {
    setItems((prev) => [...prev, { id: useShortId(), content: `Item ${prev.length + 1}` }]);
  };

  return (
    <div>
      <p>Component ID: {id}</p>
      <button onClick={addItem}>Add Item</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.content} (ID: {item.id})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IdGenerator;
```

:::

::: tip When to use it?

Use `useShortId` whenever you need to generate unique identifiers in your components. Since the ID is stable across
re-renders, you won't get new IDs on each render, making it safe to use in keys and references.

:::

### **`useRefTrap(init, handler)`**

A React hook that creates a ref with a custom setter handler. This hook returns a ref-like object that allows you to
intercept and modify the value being set through a handler function.

**Params**

- **`init`** - The initial value for the ref
- **`handler`** - A function that processes the value before it's set

[API Reference](../apis/react/utilities.md#usereftrap)

#### Usage

::: details Ref with Custom Setter

```tsx
import React, { useState } from 'react';
import { useRefTrap } from '@anchorlib/react';

const RefTrapExample = () => {
  const [messages, setMessages] = useState([]);

  // Create a ref trap that validates and formats input
  const validatedInput = useRefTrap('', (value) => {
    // Handler function processes the value before setting
    if (typeof value === 'string') {
      // Trim whitespace and capitalize first letter
      return value.trim().charAt(0).toUpperCase() + value.trim().slice(1);
    }
    return value;
  });

  const handleSubmit = () => {
    if (validatedInput.current) {
      setMessages((prev) => [...prev, validatedInput.current]);
      validatedInput.current = ''; // This will also go through the handler
    }
  };

  return (
    <div>
      <input
        type="text"
        value={validatedInput.current}
        onChange={(e) => (validatedInput.current = e.target.value)}
        placeholder="Enter text..."
      />
      <button onClick={handleSubmit}>Submit</button>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
    </div>
  );
};

export default RefTrapExample;
```

:::

::: tip When to use it?

Use `useRefTrap` when you need to intercept and process values before they're stored in a ref. This is useful for
validation, formatting, or transformation logic that should happen at the point of assignment.

:::

## Development Tools

These are development tools that help with debugging and development.

### **`setDevMode(enabled, strict?)`**

Sets the development mode and strict mode flags.

**Params**

- **`enabled`** - Whether to enable development mode
- **`strict`** _(optional)_ - Whether to enable strict mode

[API Reference](../apis/react/utilities.md#setdevmode)

#### Usage

::: details Enabling Development Mode

```tsx
import React from 'react';
import { setDevMode } from '@anchorlib/react';

// Enable development mode
setDevMode(true);

// Enable development mode with strict mode
setDevMode(true, true);

const App = () => {
  return (
    <div>
      <h1>My App</h1>
      {/* Your app components */}
    </div>
  );
};

export default App;
```

:::

::: tip When to use it?

Use `setDevMode` during development to enable additional debugging features and warnings. Strict mode adds even more
rigorous checks that can help identify potential issues in your code.

:::

### **`isDevMode()`**

Checks if development mode is enabled.

[API Reference](../apis/react/utilities.md#isdevmode)

#### Usage

::: details Conditional Development Logic

```tsx
import React from 'react';
import { isDevMode } from '@anchorlib/react';

const DebugInfo = () => {
  if (!isDevMode()) {
    return null; // Don't show in production
  }

  return (
    <div style={{ border: '1px solid red', padding: '10px' }}>
      <h3>Debug Information</h3>
      <p>This is only visible in development mode</p>
    </div>
  );
};

export default DebugInfo;
```

:::

::: tip When to use it?

Use `isDevMode` to conditionally render debugging information or enable development-only features that should not appear
in production builds.

:::

### **`isStrictMode()`**

Checks if strict mode is enabled.

[API Reference](../apis/react/utilities.md#isstrictmode)

#### Usage

::: details Strict Mode Specific Logic

```tsx
import React from 'react';
import { isStrictMode } from '@anchorlib/react';

const StrictModeWarning = () => {
  if (!isStrictMode()) {
    return null;
  }

  return (
    <div style={{ backgroundColor: 'yellow', padding: '10px' }}>
      <h3>Strict Mode Active</h3>
      <p>Extra checks and warnings are enabled</p>
    </div>
  );
};

export default StrictModeWarning;
```

:::

::: tip When to use it?

Use `isStrictMode` to implement logic that should only run when strict mode is enabled, such as additional validation or
logging.

:::

### **`setDebugRenderer(enabled, duration?)`**

Sets the debug renderer flags to visualize component renders.

**Params**

- **`enabled`** - Whether to enable debug rendering
- **`duration`** _(optional)_ - Duration in milliseconds to show the debug visualization

[API Reference](../apis/react/utilities.md#setdebugrenderer)

#### Usage

::: details Visualizing Component Renders

```tsx
import React from 'react';
import { setDebugRenderer } from '@anchorlib/react';

// Enable debug renderer with 2 second highlight duration
setDebugRenderer(true, 2000);

const VisualComponent = () => {
  return (
    <div>
      <h1>This component will flash when it renders</h1>
      <p>Helpful for identifying unnecessary re-renders</p>
    </div>
  );
};

export default VisualComponent;
```

:::

::: tip When to use it?

Use `setDebugRenderer` during development to visually identify when components are rendering. This can help you optimize
performance by identifying components that re-render unnecessarily.

:::

### **`isDebugRenderer()`**

Checks if debug renderer is enabled.

[API Reference](../apis/react/utilities.md#isdebugrenderer)

#### Usage

::: details Conditional Debug Rendering

```tsx
import React from 'react';
import { isDebugRenderer } from '@anchorlib/react';

const DebugRendererIndicator = () => {
  if (!isDebugRenderer()) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'red', color: 'white', padding: '5px' }}>
      Debug Renderer ON
    </div>
  );
};

export default DebugRendererIndicator;
```

:::

::: tip When to use it?

Use `isDebugRenderer` to conditionally show indicators or implement logic that should only be active when the debug
renderer is enabled.

:::

### **`debugRender(element)`**

Highlights an element to visualize when it's rendered or updated.

**Params**

- **`element`** - A ref to the element to highlight

[API Reference](../apis/react/utilities.md#debugrender)

#### Usage

::: details Highlighting Specific Elements

```tsx
import React, { useRef, useEffect } from 'react';
import { debugRender } from '@anchorlib/react';

const HighlightedComponent = () => {
  const elementRef = useRef(null);
  debugRender(elementRef);

  return (
    <div ref={elementRef} style={{ padding: '20px', border: '1px solid blue' }}>
      <h2>This element will be highlighted on render</h2>
      <p>Check the console for render information</p>
    </div>
  );
};

export default HighlightedComponent;
```

:::

::: tip When to use it?

Use `debugRender` to highlight specific DOM elements when they render or update. This is useful for debugging layout
issues or identifying when specific parts of your UI are being refreshed.

:::

## Utility Functions

These are utility functions that are not React hooks but are useful when working with Anchor's reactive system.

### **`cleanProps(props)`**

A utility function designed to remove the internal `_state_version` prop from a component's props object. When a
component is wrapped by the `observable` HOC, it receives an additional `_state_version` prop that should typically not
be passed down to native DOM elements or other components.

**Params**

- **`props`** - The props object that might contain `_state_version`

[API Reference](../apis/react/utilities.md#cleanprops)

#### Usage

::: details Cleaning Props for Child Components

```tsx
import React from 'react';
import { cleanProps } from '@anchorlib/react';

const ParentComponent = (props) => {
  // Clean props before passing to child components
  const childProps = cleanProps(props);

  return (
    <div>
      <h1>Parent Component</h1>
      {/* Pass cleaned props to children */}
      <ChildComponent {...childProps} />
    </div>
  );
};

const ChildComponent = ({ className, children, ...rest }) => {
  // rest will not contain _state_version
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
};

export default ParentComponent;
```

:::

::: tip When to use it?

Use `cleanProps` when you need to pass props from an observable component to child components or DOM elements. This
prevents the internal `_state_version` prop from being passed down where it's not needed or might cause issues.

:::

### **`pickValues(state, keys)`**

Helper function that extracts specific properties from a reactive state object. It returns a tuple containing an object
with the picked properties and their values, and an array of the values corresponding to the picked keys.

**Params**

- **`state`** - The reactive state object to pick values from
- **`keys`** - An array of keys to pick from the state object

[API Reference](../apis/react/utilities.md#pickvalues)

#### Usage

::: details Picking Specific Values

```tsx
import React from 'react';
import { useAnchor } from '@anchorlib/react';
import { pickValues } from '@anchorlib/react';

const UserProfile = () => {
  const [user] = useAnchor({
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    age: 30,
    role: 'admin',
    lastLogin: '2023-01-01',
  });

  // Pick only the values we need for display
  const [userDisplay, userDisplayValues] = pickValues(user, ['firstName', 'lastName', 'role']);

  return (
    <div>
      <h2>User Profile</h2>
      <p>
        Name: {userDisplay.firstName} {userDisplay.lastName}
      </p>
      <p>Role: {userDisplay.role}</p>
      <p>All display values: {userDisplayValues.join(', ')}</p>
    </div>
  );
};

export default UserProfile;
```

:::

::: tip When to use it?

Use `pickValues` when you need to extract a subset of properties from a state object. This is useful for creating
smaller objects for specific purposes or getting an array of values for processing.

:::

## Best Practices

When working with Anchor's utility APIs, keep these best practices in mind:

1. **Use `useSnapshot` for Debugging**: Snapshots are perfect for capturing state at specific moments for debugging or
   comparison purposes.
2. **Leverage Microtasks**: Use `useMicrotask` for scheduling work after React's state updates have been processed but
   before the browser repaints.
3. **Batch Operations**: Use `useMicrobatch` to group multiple operations together and execute them after a short delay
   for better performance.
4. **Stable References**: Use `useStableRef` for values that should remain stable across re-renders but update when
   specific dependencies change.
5. **Unique IDs**: Use `useShortId` for generating unique identifiers that remain stable across re-renders.
6. **Development Tools**: Enable development mode and debug rendering during development to catch issues early and
   optimize performance.
7. **Clean Props**: Always use `cleanProps` when passing props from observable components to children to prevent
   internal props from leaking.
8. **Selective Value Extraction**: Use `pickValues` when you only need a subset of properties from a state object.
