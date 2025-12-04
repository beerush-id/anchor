import '@tailwindcss/browser';
import React, { createContext, useContext } from 'react';
import { getContext, setContext } from '@anchorlib/core';
import { observer, useAnchor } from '@anchorlib/react';

// Define our state interfaces
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

// React context for UI state
const UIContext = createContext<UIState>({
  theme: 'light',
  sidebarOpen: false,
});

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
  return useContext(UIContext);
};

// Component using React context
const Header = observer(() => {
  const { theme } = useUIContext();

  return (
    <header
      className="w-full p-4 border-b"
      style={{
        background: theme === 'dark' ? '#333' : '#f5f5f5',
        borderColor: theme === 'dark' ? '#555' : '#ddd',
      }}>
      <h1 className="text-xl font-bold">My App</h1>
    </header>
  );
});

// Component using Anchor context
const UserProfile = observer(() => {
  // Get user service from Anchor context
  const userService = getContext<UserService>(UserService.name);
  const user = userService?.getCurrentUser();

  if (!user) return <div>No user found</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Welcome, {user.name}!</h2>
      <p className="text-gray-600">Email: {user.email}</p>
    </div>
  );
});

// Main app component
const App = () => {
  const [uiState] = useAnchor<UIState>({
    theme: 'light',
    sidebarOpen: false,
  });

  const toggleTheme = () => {
    uiState.theme = uiState.theme === 'dark' ? 'light' : 'dark';
  };

  // Provide user service through Anchor context
  const userService = new UserService();
  setContext(UserService.name, userService);

  const ThemeToggle = observer(() => {
    return (
      <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded border"
        style={{
          background: uiState.theme === 'dark' ? '#444' : '#fff',
          color: uiState.theme === 'dark' ? '#fff' : '#000',
          borderColor: uiState.theme === 'dark' ? '#666' : '#ccc',
        }}>
        Switch to {uiState.theme === 'dark' ? 'Light' : 'Dark'} Mode
      </button>
    );
  });

  return (
    <div className="flex flex-col min-h-screen">
      <UIContext value={uiState}>
        <Header />
        <main className="flex-grow p-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Combined Context Example</h1>
            <p className="mb-6">This example shows how to combine React's Context API with Anchor's Global Context.</p>
            <UserProfile />
            <div className="mt-6">
              <ThemeToggle />
            </div>
          </div>
        </main>
      </UIContext>
    </div>
  );
};

export default App;
