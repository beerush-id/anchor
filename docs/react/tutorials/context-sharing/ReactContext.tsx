import '@tailwindcss/browser';
import React, { createContext, useContext } from 'react';
import { useAnchor } from '@anchorlib/react';
import { observer } from '@anchorlib/react/view';

interface Settings {
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
}

// Create React context
const AppSettings = createContext<Settings>({
  theme: 'light',
  language: 'en',
});

// Component that uses the context.
const ThemedButton = observer(() => {
  // Get the current theme from the context.
  const { theme } = useContext(AppSettings);

  return (
    <button
      style={{
        background: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
        padding: '10px 20px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}>
      Themed Button ({theme})
    </button>
  );
});

// Main app component
const App = () => {
  const [settings] = useAnchor<Settings>({
    theme: 'light',
    language: 'en',
  });

  const toggleTheme = () => {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-screen h-screen">
      <h1>React Context Example</h1>
      <p className="text-center px-10">
        This example demonstrates how to use Anchor with React context to share state between components.
      </p>
      <AppSettings value={settings}>
        <ThemedButton />
      </AppSettings>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

export default App;
