import '@tailwindcss/browser';
import { activateContext, activateGlobalContext, anchor, getContext, setContext } from '@anchorlib/core';
import { useAnchor } from '@anchorlib/react';
import { observer } from '@anchorlib/react/view';

interface Settings {
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
}

activateGlobalContext();
const globalContext = anchor(new Map());
activateContext(globalContext);

// A component that consumes the Anchor context.
const ThemedButton = observer(() => {
  // Get the current settings from Anchor context.
  const settings = getContext<Settings>('settings') ?? { theme: '', language: '' };

  return (
    <button
      style={{
        background: settings.theme === 'dark' ? '#333' : '#fff',
        color: settings.theme === 'dark' ? '#fff' : '#000',
        padding: '10px 20px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}>
      Themed Button ({settings.theme})
    </button>
  );
});

// Main app component
const App = () => {
  const [settings] = useAnchor<Settings>({
    theme: 'light',
    language: 'en',
  });
  setContext('settings', settings);

  const toggleTheme = () => {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-screen h-screen">
      <h1>Anchor Context Example</h1>
      <ThemedButton />
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

export default App;
