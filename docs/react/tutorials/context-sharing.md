# Context Sharing

Learn how to share data throughout your application using both Anchor's Global Context and React's Context API.

## What You'll Learn

In this tutorial, you'll learn:

1. How to use Anchor's Global Context for dependency injection
2. How to integrate React's Context API with Anchor
3. When to use each approach for optimal state management

## Understanding Context Systems

Context systems allow you to share data throughout your application without prop drilling. Both Anchor and React provide
powerful context mechanisms, and they can be used together to create flexible and scalable applications.

### Anchor's Global Context

Anchor's Global Context is a reactive dependency injection system that allows you to store and retrieve values by key.
It's particularly useful for sharing services, configurations, or global state throughout your application.

### React's Context API

React's Context API is a built-in feature that allows you to share values between components without explicitly passing
a prop through every level of the tree.

## Using Anchor's Global Context

Anchor's Global Context provides a reactive `Map` that can be used to store and retrieve values by key. Let's see how to
use it in a React application.

::: code-group

<<< @/react/tutorials/context-sharing/GlobalContext.tsx

:::

::: details Try it Yourself {open}

::: anchor-react-sandbox

<<< @/react/tutorials/context-sharing/GlobalContext.tsx [active]

:::

::: tip In This Example

1. We create an Anchor context using `createContext()`
2. We use `withinContext()` to establish the context scope
3. We set values in the context using `setContext()`
4. We retrieve values using `getContext()`
5. The context values are reactive and will update when the Anchor state changes

:::

## Using React's Context API

React's Context API is perfect for sharing values that don't change frequently or when you want to leverage React's
built-in context system.

::: code-group

```tsx [AppWithReactContext.tsx]
import React, { createContext, useContext } from 'react';
import { useAnchor } from '@anchorlib/react';

// Create React context
const AppContext = createContext();

// Custom hook to use our context
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Components that consume the context
const UserDisplay = () => {
  const { user } = useAppContext();

  return (
    <div>
      <h2>User: {user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useAppContext();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
      Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </button>
  );
};

// Provider component
const AppProvider = ({ children }) => {
  const [state] = useAnchor({
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    theme: 'light',
  });

  const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  };

  return (
    <AppContext.Provider
      value={{
        user: state.user,
        theme: state.theme,
        toggleTheme,
      }}>
      {children}
    </AppContext.Provider>
  );
};

// Main app component
const App = () => {
  return (
    <AppProvider>
      <div>
        <h1>React Context Example</h1>
        <UserDisplay />
        <ThemeToggle />
      </div>
    </AppProvider>
  );
};

export default App;
```

:::

::: details Try it Yourself

::: anchor-react-sandbox

```tsx /App.tsx [active]
import React, { createContext, useContext } from 'react';
import { useAnchor } from '@anchorlib/react';

// Create React context
const AppContext = createContext();

// Custom hook to use our context
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Components that consume the context
const UserDisplay = () => {
  const { user } = useAppContext();

  return (
    <div>
      <h2>User: {user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useAppContext();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
        padding: '10px 20px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}>
      Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </button>
  );
};

// Provider component
const AppProvider = ({ children }) => {
  const [state] = useAnchor({
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    theme: 'light',
  });

  const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  };

  return (
    <AppContext.Provider
      value={{
        user: state.user,
        theme: state.theme,
        toggleTheme,
      }}>
      {children}
    </AppContext.Provider>
  );
};

// Main app component
const App = () => {
  return (
    <AppProvider>
      <div>
        <h1>React Context Example</h1>
        <UserDisplay />
        <ThemeToggle />
      </div>
    </AppProvider>
  );
};

export default App;
```

:::

::: tip In This Example

1. We create a React context using `createContext()`
2. We build a custom hook `useAppContext()` for easier consumption
3. We create a provider component that wraps our application
4. We use `useAnchor` to manage the reactive state within the provider
5. Child components consume the context using `useContext()` or our custom hook

:::

## Combining Both Context Systems

You can combine both context systems to leverage the strengths of each. Use React's Context API for UI-related values and
Anchor's Global Context for services and cross-cutting concerns.

::: code-group

```tsx [CombinedContextExample.tsx]
import React, { createContext, useContext } from 'react';
import { createContext as createAnchorContext, withinContext, setContext, getContext } from '@anchorlib/core/context';
import { useAnchor } from '@anchorlib/react';

// React context for UI state
const UIContext = createContext();

// Service that might be shared across the app
class UserService {
  getCurrentUser() {
    return {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }
}

// Custom hook for UI context
const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider');
  }
  return context;
};

// Component using React context
const Header = () => {
  const { theme } = useUIContext();

  return (
    <header
      style={{
        background: theme === 'dark' ? '#333' : '#f5f5f5',
        padding: '1rem',
        borderBottom: '1px solid #ccc',
      }}>
      <h1>My App</h1>
    </header>
  );
};

// Component using Anchor context
const UserProfile = () => {
  // Get user service from Anchor context
  const userService = getContext(UserService.name);
  const user = userService?.getCurrentUser();

  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>Welcome, {user.name}!</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

// Providers component
const AppProviders = ({ children }) => {
  const [uiState] = useAnchor({
    theme: 'light',
    sidebarOpen: false,
  });

  const toggleTheme = () => {
    uiState.theme = uiState.theme === 'dark' ? 'light' : 'dark';
  };

  // Create and provide user service through Anchor context
  const userService = new UserService();

  // Create Anchor context
  const serviceContext = createAnchorContext();

  return (
    <UIContext.Provider
      value={{
        theme: uiState.theme,
        sidebarOpen: uiState.sidebarOpen,
        toggleTheme,
      }}>
      {withinContext(serviceContext, () => {
        setContext(UserService.name, userService);
        return children;
      })}
    </UIContext.Provider>
  );
};

// Main app
const App = () => {
  return (
    <AppProviders>
      <div>
        <Header />
        <main style={{ padding: '1rem' }}>
          <UserProfile />
        </main>
      </div>
    </AppProviders>
  );
};

export default App;
```

:::

::: details Try it Yourself

::: anchor-react-sandbox

```tsx /App.tsx [active]
import React, { createContext, useContext } from 'react';
import { createContext as createAnchorContext, withinContext, setContext, getContext } from '@anchorlib/core/context';
import { useAnchor } from '@anchorlib/react';

// React context for UI state
const UIContext = createContext();

// Service that might be shared across the app
class UserService {
  getCurrentUser() {
    return {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }
}

// Custom hook for UI context
const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider');
  }
  return context;
};

// Component using React context
const Header = () => {
  const { theme } = useUIContext();

  return (
    <header
      style={{
        background: theme === 'dark' ? '#333' : '#f5f5f5',
        padding: '1rem',
        borderBottom: '1px solid #ccc',
      }}>
      <h1>My App</h1>
    </header>
  );
};

// Component using Anchor context
const UserProfile = () => {
  // Get user service from Anchor context
  const userService = getContext(UserService.name);
  const user = userService?.getCurrentUser();

  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>Welcome, {user.name}!</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

// Providers component
const AppProviders = ({ children }) => {
  const [uiState] = useAnchor({
    theme: 'light',
    sidebarOpen: false,
  });

  const toggleTheme = () => {
    uiState.theme = uiState.theme === 'dark' ? 'light' : 'dark';
  };

  // Create and provide user service through Anchor context
  const userService = new UserService();

  // Create Anchor context
  const serviceContext = createAnchorContext();

  return (
    <UIContext.Provider
      value={{
        theme: uiState.theme,
        sidebarOpen: uiState.sidebarOpen,
        toggleTheme,
      }}>
      {withinContext(serviceContext, () => {
        setContext(UserService.name, userService);
        return children;
      })}
    </UIContext.Provider>
  );
};

// Main app
const App = () => {
  return (
    <AppProviders>
      <div>
        <Header />
        <main style={{ padding: '1rem' }}>
          <UserProfile />
        </main>
      </div>
    </AppProviders>
  );
};

export default App;
```

:::

::: tip In This Example

1. We use React's Context API for UI-related state (theme, sidebar state)
2. We use Anchor's Global Context for services (UserService)
3. The `AppProviders` component sets up both context systems
4. Different components consume the appropriate context based on their needs

:::

## Key Points for Context Sharing

1. **Use React Context for UI state**: Theme, user preferences, and other UI-related values
2. **Use Anchor Context for services**: API clients, utilities, and cross-cutting concerns
3. **Combine both when needed**: Leverage the strengths of each system
4. **Keep context values stable**: Avoid creating new objects on every render
5. **Use custom hooks**: Encapsulate context consumption logic in custom hooks for better reusability
