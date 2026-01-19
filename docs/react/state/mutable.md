---
title: "Mutable State"
description: "Learn how to use standard JavaScript objects as reactive state."
keywords:
  - mutable
  - reactivity
  - state management
---

# Mutable State

State in Anchor behaves like standard JavaScript objects. You read properties to get data, and you assign specific values to update them. This relies on the concept of **Direct Mutation**.

To enable this reactive behavior on a plain object, you wrap it to create a reactive proxy.

## Defining State

You can define a reactive state object by wrapping any plain JavaScript object or array. This wrapper intercepts operations to trigger UI updates automatically.

```ts
import { mutable } from '@anchorlib/react';

// Define the state shape
const user = mutable({
  name: 'John',
  age: 30
});
```

### Primitives

For primitive values (string, number, boolean) which are passed by value in JavaScript, the state is wrapped in a reference object with a `.value` property.

```ts
const count = mutable(0);
console.log(count.value); // 0
```

## Updating State

Because the state is mutable, you update it using standard JavaScript assignment operators. There is no need for special setter functions.

```ts
// Standard assignment triggers reactivity
user.name = 'Jane';
user.age++;

// Array methods work as expected
const todos = mutable([]);
todos.push('New Item');
```

## Computed Logic

You can include derived data logic directly within your state object using standard **JavaScript Getters**. These properties automatically track the data they depend on and re-evaluate when that data changes.

```ts
const cart = mutable({
  price: 10,
  quantity: 2,
  
  // This property is automatically reactive
  get total() {
    return this.price * this.quantity;
  }
});

console.log(cart.total); // 20
cart.price = 20;
console.log(cart.total); // 40
```

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

```tsx
import '@anchorlib/react/client';
import { setup, mutable, snippet } from '@anchorlib/react';

export const ShoppingCart = setup(() => {
  const cart = mutable({
    items: [
      { id: 1, name: 'Widget', price: 10, quantity: 2 },
      { id: 2, name: 'Gadget', price: 25, quantity: 1 }
    ],
    taxRate: 0.1,
    
    // Computed properties
    get subtotal() {
      return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    get tax() {
      return this.subtotal * this.taxRate;
    },
    get total() {
      return this.subtotal + this.tax;
    },
    
    // Methods
    updateQuantity(id: number, quantity: number) {
      const item = this.items.find(i => i.id === id);
      if (item && quantity > 0) {
        item.quantity = quantity;
      }
    },
    removeItem(id: number) {
      const index = this.items.findIndex(i => i.id === id);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    }
  });

  // Snippet for individual cart item (granular updates)
  const CartItem = snippet<{ item: typeof cart.items[0] }>(({ item }) => (
    <div style={{ 
      padding: '12px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{ flex: 1 }}>
        <strong>{item.name}</strong><br />
        <span style={{ color: '#666', fontSize: '14px' }}>${item.price} each</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>-</button>
        <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
        <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}>+</button>
      </div>
      <div style={{ fontWeight: 'bold', minWidth: '60px', textAlign: 'right' }}>
        ${(item.price * item.quantity).toFixed(2)}
      </div>
      <button onClick={() => cart.removeItem(item.id)} style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px' }}>
        ×
      </button>
    </div>
  ), 'CartItem');

  // Snippet for cart items list (updates when items array changes)
  const CartItems = snippet(() => (
    <>
      {cart.items.map(item => <CartItem key={item.id} item={item} />)}
    </>
  ), 'CartItems');

  // Snippet for cart summary (only updates when totals change)
  const CartSummary = snippet(() => (
    <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px', fontSize: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>Subtotal:</span>
        <strong>${cart.subtotal.toFixed(2)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>Tax ({(cart.taxRate * 100)}%):</span>
        <strong>${cart.tax.toFixed(2)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #ddd', fontSize: '18px' }}>
        <span>Total:</span>
        <strong style={{ color: '#4CAF50' }}>${cart.total.toFixed(2)}</strong>
      </div>
    </div>
  ), 'CartSummary');

  // Static layout
  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Shopping Cart</h3>
      <div style={{ marginBottom: '16px' }}>
        <CartItems />
      </div>
      <CartSummary />
      <p style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        💡 Subtotal, tax, and total are computed properties. Each item updates independently.
      </p>
    </div>
  );
}, 'ShoppingCart');

export default ShoppingCart;
```

:::


## Encapsulation

You can group related state and the methods that modify it into a single object. This encapsulates your business logic, making it easier to test and reuse.

```ts
const counter = mutable({
  count: 0,
  
  // Methods modify the state directly via 'this'
  increment() {
    this.count++;
  },
  decrement() {
    this.count--;
  }
});

counter.increment();
```

## Configuration

You can configure the behavior of the reactive wrapper by passing an options object.

```ts
const state = mutable({ ... }, options);
```

### Schema Validation

You can enforce data integrity by providing a validation schema (like Zod). Use this to ensure that your mutable state always adheres to a specific shape or type rules.

```ts
import { z } from 'zod';

const user = mutable({ name: 'John' }, {
  schema: z.object({ name: z.string() })
});
```

### Reactivity Depth

By default, the state is **Deeply Reactive** (recursive). Accessing nested objects automatically wraps them. You can opt-out of this for performance with large datasets using the `recursive` option.

- `true` (Default): Deeply reactive.
- `false`: Shallow reactivity.
- `'flat'`: Array structure tracking only (good for large lists where items don't change).

## Best Practices

### Use Object-Oriented State
Group related data and behavior. Instead of scattering separate variables (`name`, `age`), use a single `user` object. This keeps your application logic organized and portable.

### Separation of Concerns
For complex logic, define your state objects in dedicated files ("Stores") rather than inside UI components. This allows you to test your state logic independently of the view layer.
