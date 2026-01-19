---
title: "Immutable State"
description: "Safe state sharing with Read-Only Contracts."
keywords:
  - immutable
  - read-only
  - contracts
  - shared state
---

# Immutable State

When sharing state across multiple components or modules (like a global Store), it is critical to control **who** can modify that state. Unrestricted access leads to unpredictable bugs where data is changed from unknown locations.

The architecture pattern to solve this is **Read/Write Segregation**:
- **Public Interface**: Read-Only. Safe to share anywhere.
- **Private Interface**: Writable. Kept internal to the store logic.

## Defining Read-Only Access

To share state safely, you define a read-only view. This ensures that any consumer can read the data to render the UI, but attempting to modify it will fail. This enforces the **One-Way Data Flow**.

```ts
import { immutable } from '@anchorlib/react';

export const userState = immutable({
  name: 'John',
  role: 'Admin'
});

// Reading is allowed
console.log(userState.name);

// Mutation is blocked
userState.name = 'Jane'; // Error!
```

## Defining Write Permissions

Since the public state is read-only, you need a way to grant write permissions to specific parts of your application. This is done using the **Write Contract** (`writable`).

A Write Contract is a proxy that points to the same data but allows mutation.

```ts
import { immutable, writable } from '@anchorlib/react';

// 1. Public Read-Only View
export const state = immutable({ count: 0 });

// 2. Write Contract
export const stateControl = writable(state);

// 3. Direct Usage
stateControl.count++; // Works!
```

### Shared Write Contracts

You can export a Write Contract to allow specific modules or components to update the state directly. This is often simpler than defining dedicated action functions for every possible change.

```ts
const settings = immutable({
  theme: 'dark',
  notifications: true
});

// Create a contract that guarantees ONLY 'theme' can be changed
export const themeControl = writable(settings, ['theme']);

// Consumers can simply assign values
themeControl.theme = 'light';
```

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, immutable, writable, snippet } from '@anchorlib/react';

export const SettingsDemo = setup(() => {
  // 1. Public Read-Only View
  const settings = immutable({
    theme: 'dark' as 'dark' | 'light',
    notifications: true,
    language: 'en',
    volume: 50
  });

  // 2. Create restricted write contracts
  const themeControl = writable(settings, ['theme']);
  const notificationsControl = writable(settings, ['notifications']);
  const fullControl = writable(settings); // Full access

  const logs = immutable<string[]>([]);
  const logsControl = writable(logs);

  const addLog = (message: string, success: boolean) => {
    logsControl.push(`${success ? '✅' : '❌'} ${message}`);
    if (logsControl.length > 5) logsControl.shift();
  };

  const tryDirectMutation = () => {
    // Attempt direct mutation (will be ignored with console warning)
    const currentTheme = settings.theme;
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    (settings as any).theme = targetTheme;
    
    if (settings.theme === targetTheme) {
      addLog('Direct mutation succeeded (unexpected!)', false);
    } else {
      addLog('Direct mutation blocked (expected)', true);
    }
  };

  const tryRestrictedWrite = () => {
    // Attempt restricted write (will be ignored with console warning)
    const currentNotif = settings.notifications;
    const targetNotif = !currentNotif;
    
    (themeControl as any).notifications = targetNotif;
    
    if (settings.notifications === targetNotif) {
      addLog('Restricted write succeeded (unexpected!)', false);
    } else {
      addLog('Restricted write blocked (expected)', true);
    }
  };

  // Snippet for settings display (updates when settings change)
  const SettingsDisplay = snippet(() => (
    <div style={{ 
      marginBottom: '16px',
      padding: '16px',
      background: '#f5f5f5',
      borderRadius: '8px'
    }}>
      <h4 style={{ margin: '0 0 12px 0' }}>Current Settings</h4>
      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
        <div><strong>Theme:</strong> {settings.theme}</div>
        <div><strong>Notifications:</strong> {settings.notifications ? 'On' : 'Off'}</div>
        <div><strong>Language:</strong> {settings.language}</div>
        <div><strong>Volume:</strong> {settings.volume}%</div>
      </div>
    </div>
  ), 'SettingsDisplay');

  // Snippet for allowed operations
  const AllowedOperations = snippet(() => (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 12px 0' }}>Allowed Operations</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => {
            themeControl.theme = themeControl.theme === 'dark' ? 'light' : 'dark';
            addLog(`Theme changed to ${themeControl.theme}`, true);
          }}
          style={{ padding: '12px', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Toggle Theme (via themeControl)
        </button>
        
        <button 
          onClick={() => {
            notificationsControl.notifications = !notificationsControl.notifications;
            addLog(`Notifications ${notificationsControl.notifications ? 'enabled' : 'disabled'}`, true);
          }}
          style={{ padding: '12px', cursor: 'pointer', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Toggle Notifications (via notificationsControl)
        </button>

        <button 
          onClick={() => {
            fullControl.volume = Math.min(100, fullControl.volume + 10);
            addLog(`Volume increased to ${fullControl.volume}%`, true);
          }}
          style={{ padding: '12px', cursor: 'pointer', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Increase Volume (via fullControl)
        </button>
      </div>
    </div>
  ), 'AllowedOperations');

  // Snippet for blocked operations
  const BlockedOperations = snippet(() => (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 12px 0' }}>Blocked Operations</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={tryDirectMutation}
          style={{ padding: '12px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Try Direct Mutation (will fail)
        </button>
        
        <button 
          onClick={tryRestrictedWrite}
          style={{ padding: '12px', cursor: 'pointer', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Try Restricted Write (will fail)
        </button>
      </div>
    </div>
  ), 'BlockedOperations');

  // Snippet for operation log
  const OperationLog = snippet(() => {
    if (logs.length === 0) return null;
    return (
      <div style={{ 
        padding: '12px',
        background: '#e3f2fd',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <strong>Operation Log:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          {logs.map((log, i) => (
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>
    );
  }, 'OperationLog');

  // Snippet for explanation text
  const Explanation = snippet(() => (
    <div style={{ 
      marginTop: '16px',
      padding: '12px',
      background: '#fff3cd',
      borderRadius: '4px',
      fontSize: '14px'
    }}>
      <strong>How it works:</strong>
      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
        <li><code>settings</code> is immutable (read-only)</li>
        <li><code>themeControl</code> can only modify <code>theme</code></li>
        <li><code>notificationsControl</code> can only modify <code>notifications</code></li>
        <li><code>fullControl</code> can modify any property</li>
      </ul>
    </div>
  ), 'Explanation');

  // Static layout
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>Immutable State with Write Contracts</h3>
      <SettingsDisplay />
      <AllowedOperations />
      <BlockedOperations />
      <OperationLog />
      <Explanation />
    </div>
  );
}, 'SettingsDemo');

export default SettingsDemo;
```

:::


## Best Practices

### Prefer Restricted Access
For shared state, **always prefer `immutable` over `mutable`**. Exposing mutable state globally invites "spaghetti code" where any component can change the state in unpredictable ways.

- **Public**: `immutable` (Read-Only)
- **Private/Protected**: `writable` (Restricted Write)

This enforces a clear contract: "You can look, but you can't touch—unless you use the provided contract."

### Use Restricted Writers
When sharing a writer, **always provide the list of allowed keys** if possible. This creates a **Least Privilege** contract.

You can safely pass a restricted writer to a sub-component, knowing it cannot accidentally modify unrelated state.

```ts
// ✅ Prefer: Only allows changing 'theme'
const themeWriter = writable(settings, ['theme']);

// ❌ Avoid: Gives full write access to everything (unless intended)
const fullWriter = writable(settings);
```
