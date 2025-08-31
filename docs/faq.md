# **Frequently Asked Questions (FAQ)**

### **Q: What is Anchor and how is it different from other state management libraries?**

**A:** Anchor is a state management framework built on the **DSV (Data-State-View)** model. Unlike traditional libraries
that rely on a "copy-on-mutation" approach, Anchor introduces a stable, single application state that is immutable,
strongly typed, and highly performant. It solves the scalability problem without introducing new complexity.

### **Q: What is the "DSV Model"?**

**A:** DSV stands for **Data-State-View**. It's a clear architectural philosophy where data from external sources (
`Data`) is bound to a central, stable `appState` (`State`), which then drives the UI (`View`). This model eliminates
prop drilling and scattered logic by making the `State` the single source of truth.

### **Q: What is "True Immutability" and why is it better?**

**A:** "True Immutability" is a core concept in Anchor that allows you to write intuitive "direct mutation" code (e.g.,
`state.user.name = 'John'`) while maintaining an immutable state behind the scenes. This is achieved through a
proxy-based system that avoids the expensive deep cloning of objects and arrays, which is a common performance
bottleneck in other libraries.

### **Q: Can Anchor be used with my favorite framework?**

**A:** Yes. Anchor is built to be **framework-agnostic**. While the core engine is separate, we provide official
packages for popular frameworks like **React**, **Vue**, and **Svelte**. This allows you to use the same state model and
logic across different parts of your application or even across different projects.

### **Q: Is Anchor only for large-scale or "Enterprise" applications?**

**A:** No. Anchor's core philosophy is that an architecture that scales well for large applications is also perfect for
small ones. Its efficient, fine-grained reactivity ensures that the overhead is minimal, so a simple app remains just as
fast and easy to build. Anchor provides **sustainable performance** for any size project.

### **Q: What are the key performance benefits?**

**A:** Anchor's benchmark tests show a massive performance advantage over traditional methods. When handling large
datasets, Anchor delivers:

- **Up to ~430x faster peak render times**.
- **Up to ~32x faster completion times**.
- **Up to ~231x fewer wasted renders**.

These metrics are a direct result of Anchor's fine-grained reactivity, which ensures the UI is only updated where and
when it's absolutely necessary.

### **Q: How does Anchor handle data fetching and real-time updates?**

**A:** Anchor includes powerful built-in utilities like **Reactive Request** and **Reactive Storage**. These tools allow
you to seamlessly bind external data sources (like `fetch`, `SSE`, or `IndexedDB`) to your `appState`, automating
two-way synchronization and handling optimistic updates out of the box.

### **Q: I'm worried about the learning curve. Is it hard to learn?**

**A:** The learning curve for Anchor is virtually nonexistent. While the underlying **DSV model** is a revolutionary
architectural philosophy, the developer's interaction with it is designed to be as intuitive as possible.

You read data as you normally would, and you write data as you normally would. Anchor’s unique system frees you from the
manual complexity of other libraries, such as context providers, `set` functions, or immutability boilerplate. You get
all the performance and scalability benefits of a sophisticated, modern architecture without the cognitive overhead.
