# Utilities

## Utility Hooks

### **`useRefTrap(init, trap)`**

In a fine-grained reactive system, a core principle is a smooth UI. However, relying solely on a framework's effect
lifecycle (like `useEffect` in React) can lead to a **blinking UI** or perceptible lag, as updates to the DOM happen
_after_ the browser's paint cycle.

`useRefTrap` is a utility hook designed to solve this problem. It provides a way to trap a reference to a value and
perform **synchronous updates** to the DOM, ensuring a fluid and instant user experience.

**Parameters:**

- `init` - The initial value of the reference, as normally passed to `useRef`.
- `trap` - A function that takes the reference value and returns a new value. This function runs synchronously, giving
  you a chance to update the reference before the browser's next paint.

**Example:**

```tsx
import { useRefTrap } from '@anchor/react';

const Header = () => {
  const ref = useRefTrap(null, (element) => {
    if (element && window.scrollY > element.offsetHeight) {
      element.classList.add('scrolled');
    }

    return element;
  });

  return <header ref={ref}>...</header>;
};
```

In this example, we're using `useRefTrap` to trap the element ref to style the header element right after the element
is available, not after the element is rendered and mounted. This eliminates the visual flicker and provides a smooth,
instant experience for the user.
