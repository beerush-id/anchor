# **Architecture**

The Anchor architecture is the engine that powers the DSV model and its superior performance. This section provides an
in-depth look at the core principles and powerful built-in utilities that make Anchor a revolutionary solution.

## **The Anchor Mental Model**

The core of Anchor's philosophy is built on three pillars that ensure your application is robust, performant, and
reliable from the ground up.

### **Lazy Initialization & Performance**

Anchor's state is a single entity with no direct, in-memory references to nested states. These nested states are
initialized **on-demand**, only when a component needs to read from them. This provides a crucial balance between speed
and resource usage, ensuring a minimal memory footprint. It’s similar to a relational database, but for a state, where
references are built on demand. This approach is what allows Anchor to handle vast, complex datasets efficiently, as the
cost of a state is not proportional to its size.

### **Observation & Derivation**

While they may seem similar, **Observation** and **Derivation** serve different purposes within Anchor's reactivity
model. Observation focuses on direct, small units. It maintains a single, efficient connection between a specific piece
of state and a single observer (a component, for instance). This is the foundation of Anchor's fine-grained reactivity.
In contrast, Derivation provides a deep, full connection to the state tree. When a state changes at a deeper level, the
root state gets a notification, ensuring a unified view of the entire application.

### **True Immutability & Data Integrity**

Anchor champions a **true immutable model** that cleverly sidesteps the typical performance overhead associated with
deep copying large state trees. It allows you to write intuitive **"direct mutation"** code within strictly controlled
**"write contracts"**, without sacrificing state integrity. This is a massive win for both performance and developer
experience. It is also **strongly typed**, so if you declare a state, you'll be warned or prevented from making a
mutation in the IDE. For an additional layer of data integrity, Anchor integrates
**Zod schemas as a first-citizen class**, ensuring your data always conforms to its defined structure and types at both
development and runtime.

## **Framework Agnosticism**

Anchor's mental model is heavily influenced by the difficulties of sharing state between frameworks and platforms. This
is why the core state engine is built to be completely agnostic. The Anchor state is the **what**, and then you choose
the **how** by using the specific bindings for your chosen **UI framework**, such as **React** or **Vue**. This same principle
extends to **cross-platform applications**, allowing you to share the same state logic between web, mobile, and desktop.
This allows you to choose the best **UI framework** for the job without compromising your core architectural design.

## **Integrated Built-ins**

Anchor's rich suite of built-in utilities covers common application needs, providing powerful, ready-to-use solutions
with elegant APIs.

### **Optimistic Model**

The **Optimistic Model** makes UI updates instantly in response to user actions, even before a server response is
received. This creates a highly responsive feel, eliminating perceived latency and enhancing user satisfaction.

### **History Utility**

Anchor provides an **out-of-the-box History utility** that automatically tracks state changes. This gives you built-in
undo/redo functionality with virtually no additional development effort.

### **Reactive Storage**

Work with `localStorage`, `sessionStorage`, and `IndexedDB` just like plain objects. Anchor provides a true two-way
storage binding that automatically syncs data, ensuring your application state is always up-to-date.

### **Reactive Request**

Handle asynchronous requests and server-sent events (SSE) incredibly simply and reactively. Received data chunks
automatically update the UI, providing real-time experiences with ease.

## **Limitless, Beyond Built-ins**

While Anchor's built-in utilities provide a quick way to work with common data types and services, they are not a hard
limit. The core state engine's agnostic nature is a powerful foundation that allows you to build your own custom
bindings.

Think of Anchor's built-ins as a starting point. With a clear understanding of the DSV model and how Anchor's core state
emits events on every change, you can extend its functionality to bind to virtually any data source or system.

- **State-to-DOM Binding:** You could create a binding that connects a specific part of your `appState` to a `canvas`
  element, allowing you to reactively render visualizations or animations without a UI framework.
- **State-to-Media Binding:** Imagine building a binding that connects a specific property in your state (e.g.,
  `appState.media.volume`) to an HTML5 audio or video element, providing seamless two-way control.
- **State-to-Hardware Binding:** Your state could be connected to an IoT device or a USB peripheral, allowing you to use
  the DSV model to manage and display data from the physical world.

This is the ultimate promise of Anchor's architecture. It is built to be a foundational layer for any application,
regardless of its complexity or platform. The Anchor state is the **what**, and then you choose the **how** by creating
your own bindings to connect it to anything and everything.
