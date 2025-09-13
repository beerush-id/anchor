# **Session Storage**

The Session Storage functionality is provided through the **`session`** function, which creates reactive objects that
automatically synchronize with `sessionStorage`. This is ideal for temporary data that should persist during navigation
within the same tab but not across different sessions.

## **API**

### **`session()`**

Creates a reactive session object that automatically syncs with sessionStorage.

```typescript
session = <T, S>(name: string, init: T, options?: StateOptions<S>, storageClass?: typeof SessionStorage) => T;
```

**Parameters:**

- `name` - Unique identifier for the session storage instance
- `init` - Initial data to populate the session storage
- `options` - Optional anchor configuration options
- `storageClass` - Custom storage class to use (defaults to SessionStorage)

**Returns:** A reactive proxy object that syncs with sessionStorage

#### **Naming Convention**

The `name` parameter supports versioning through a special syntax:

```typescript
// Simple name
const sessionData = session('user-session', { userId: null });

// With version
const sessionData = session('user-session@1.0.0', { userId: null });

// With version and previous version for cleanup
const sessionData = session('user-session@2.0.0:1.0.0', { userId: null });
```

When a previous version is specified, the storage system will automatically clean up the old version data.

### **`session.leave()`**

Disconnects a reactive session object from sessionStorage synchronization.

```typescript
type leave = <T>(state: T) => void;
```

**Parameters:**

- `state` - The reactive session object to disconnect

## **Usage Examples**

### **Basic Usage**

```typescript
import { session } from '@anchorlib/storage';

// Create a session storage for temporary data
const sessionData = session('session-data', {
  currentPage: 1,
  searchQuery: '',
  filters: {},
});

// Access and modify data as regular object properties
console.log(sessionData.currentPage); // 1
sessionData.currentPage = 2;
sessionData.searchQuery = 'Anchor';

// Changes are automatically persisted to sessionStorage
// Data will persist through page navigation but not browser restart
```

### **Form State Persistence**

```typescript
import { session } from '@anchorlib/storage';

// Persist form state during a session
const formState = session('contact-form', {
  name: '',
  email: '',
  message: '',
});

// In your form component
function handleInputChange(field, value) {
  formState[field] = value;
}

// If the user navigates away and comes back, form data is preserved
// But if they close the browser and come back, form starts fresh
```

### **Shopping Cart Example**

```typescript
import { session } from '@anchorlib/storage';

// Temporary shopping cart that persists during the session
const cart = session('shopping-cart', {
  items: [],
  coupon: null,
  lastUpdated: null,
});

// Add items to cart
function addToCart(product) {
  cart.items.push({
    ...product,
    addedAt: new Date(),
  });
  cart.lastUpdated = new Date();
}

// Apply coupon
function applyCoupon(code) {
  cart.coupon = code;
}

// Cart data persists through navigation but is cleared when
// the browser/tab is closed
```

### **Using with Anchor Options**

```typescript
import { session } from '@anchorlib/storage';

// Create session storage with Anchor options
const uiState = session(
  'ui-state',
  {
    sidebarOpen: true,
    modalVisible: false,
    activeTab: 'home',
  },
  {
    // Enable immutability
    immutable: false,
    // Enable observation
    observable: true,
  }
);

// Work with the data
uiState.sidebarOpen = false;
uiState.activeTab = 'profile';
```

### **Managing Storage Lifecycle**

```typescript
import { session } from '@anchorlib/storage';

// Create session storage
const appState = session('app-session', {
  tempData: null,
  sessionStart: new Date(),
});

// ... use the storage in your application ...

// When no longer needed, disconnect from sessionStorage synchronization
session.leave(appState);
```

## **Best Practices**

### **1. Use Cases**

Session Storage is ideal for:

- Temporary form data
- UI state that should persist during navigation
- Shopping cart contents
- Wizard progress
- Recently viewed items

```typescript
// Good use cases
const formDraft = session('form-draft', { title: '', content: '' });
const uiState = session('ui-state', { sidebarOpen: true });
const cart = session('shopping-cart', { items: [] });

// For data that should persist longer, use persistent storage instead
const userPrefs = persistent('user-preferences', { theme: 'light' });
```

### **2. Naming Conventions**

Use descriptive and unique names for your session storage instances:

```typescript
// Good
const formState = session('contact-form-state@1.0.0', {});
const wizardProgress = session('checkout-wizard@2.1.0', {});

// Avoid
const temp = session('temp', {});
const data = session('data', {});
```

### **3. Data Size Considerations**

While sessionStorage typically has similar limits to localStorage (5-10MB), be mindful of what you store:

```typescript
// Good - Store temporary UI state
const uiState = session('ui-state', {
  modalVisible: false,
  activeTab: 'home',
});

// Avoid - Don't store large temporary datasets
const largeTempData = session('temp-data', {
  // ... thousands of items ...
});
```

### **4. Sensitive Data**

Avoid storing sensitive information in sessionStorage as it's persisted to disk in some browsers:

```typescript
// Bad
const auth = session('auth-session', {
  token: 'secret123', // Avoid this
});

// Good
const uiPreferences = session('ui-preferences', {
  theme: 'dark',
  sidebarCollapsed: false,
});
```

### **5. Memory Management**

Disconnect from storage when components are unmounted or no longer needed:

```typescript
import { session } from '@anchorlib/storage';

class FormComponent {
  constructor() {
    this.formData = session('form-data', {
      name: '',
      email: '',
    });
  }

  destroy() {
    // Clean up storage connection
    session.leave(this.formData);
  }
}
```

### **6. Cross-Tab Considerations**

Unlike localStorage, sessionStorage is isolated to each tab. However, Anchor's reactive system still provides benefits:

```typescript
import { session } from '@anchorlib/storage';

// Each tab will have its own independent session storage
const tabState = session('tab-state', {
  lastActive: new Date(),
});

// Changes in one tab won't affect another tab
```

## **Browser Compatibility**

Session Storage is supported in all modern browsers:

- Chrome 5+
- Firefox 2+
- Safari 4+
- Edge 12+
- Internet Explorer 8+

In environments where sessionStorage is not available, the session storage will gracefully fall back to in-memory
storage.

## **Storage Limits**

Most browsers limit sessionStorage to 5-10 MB per origin, similar to localStorage. Be mindful of this limit when
designing your storage strategy.
