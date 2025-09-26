---
title: 'Anchor vs. Redux, MobX, Jotai: A React State Management Comparison'
description: 'A detailed comparison of Anchor for React against other popular state management libraries like Redux, MobX, and Jotai, focusing on performance, complexity, and bundle size.'
keywords:
  - anchor vs redux
  - anchor vs mobx
  - anchor vs jotai
  - react state management comparison
  - state management benchmarks
  - react performance comparison
  - anchor performance
  - best react state management
---

# Anchor vs. Other State Management Libraries

When choosing a state management solution for your React application, it's important to consider both developer
experience (DX) and performance. This document provides a comprehensive comparison between Anchor and other popular
React state management libraries.

::: tip Implementation Note
All packages implement exactly the same functionality with the same UI and features across all benchmarks. The only
difference is the state management approach used in each implementation. Each package manages the same data structures
to ensure fair comparisons:

- Simple Counter: Basic `{ count: number }` state
- Todo App: Todo list with items containing text, completion status, and IDs
- Complex State Tree: Rich data structure with posts, categories, and tags as shown in the data structure section

All implementations follow each library's best practices and optimization efforts, which often require significant
optimization work and deep understanding of each library's patterns.
:::

## Complexity and Bundle Size

The complexity assessment is based on code verbosity, readability, and maintainability from
a Developer Experience (DX) perspective. It evaluates how straightforward it is to work with each state management
solution in terms of writing, understanding, and maintaining code.

| Package | Complexity | Bundle Size | Notes                                                                      |
| ------- | ---------- | ----------- | -------------------------------------------------------------------------- |
| Anchor  | Low        | 344.2 KB    | Direct mutations with simple assignments. Most readable and maintainable.  |
| Mobx    | Medium     | 375.3 KB    | Direct mutations but with class-based patterns, actions, and decorators.   |
| Native  | High       | 315.1 KB    | Immutable patterns with spread operations. Verbose and harder to maintain. |
| Jotai   | High       | 322.9 KB    | Immutable patterns with spread operations. Additional atom complexity.     |
| Redux   | High       | 338.3 KB    | Most verbose with actions, reducers, and immutable patterns.               |

## Performance Benchmarks

All benchmark results represent implementations that strictly follow each library's best practices and optimization
efforts. These implementations often require significant optimization work and deep understanding of each library's
patterns.

### Simple State Tree (Todo App)

| Package | Time Taken | Render Duration (Min) | Render Duration (Max) | Render Duration (Avg) | Memory Usage (Idle) | Memory Usage (Peak) |
| ------- | ---------- | --------------------- | --------------------- | --------------------- | ------------------- | ------------------- |
| Anchor  | 5,177.3ms  | 0.6ms                 | 9.70ms                | 5.177ms               | 40mb                | 222mb               |
| Jotai   | 5,242.2ms  | 0.5ms                 | 10.4ms                | 5.242ms               | 40mb                | 256mb               |
| Mobx    | 5,615.2ms  | 0.5ms                 | 11.8ms                | 5.615ms               | 40mb                | 251mb               |
| Native  | 24,310.8ms | 0.5ms                 | 65.0ms                | 24.311ms              | 40mb                | 372mb               |
| Redux   | 32,762.1ms | 0.9ms                 | 72.6ms                | 32.762ms              | 40mb                | 372mb               |

### Complex State Tree (Blog Post)

#### Adding 1,000 Categories

| Package | Time Taken | Render Duration (Min) | Render Duration (Max) | Render Duration (Avg) | Memory Usage (Idle) | Memory Usage (Peak) |
| ------- | ---------- | --------------------- | --------------------- | --------------------- | ------------------- | ------------------- |
| Anchor  | 5,147.8ms  | 0.5ms                 | 9.10ms                | 5.148ms               | 40mb                | 168mb               |
| Native  | 5,189.2ms  | 0.6ms                 | 9.10ms                | 5.189ms               | 40mb                | 158mb               |
| Jotai   | 5,230.9ms  | 0.5ms                 | 10.1ms                | 5.231ms               | 40mb                | 161mb               |
| Redux   | 5,512.1ms  | 0.8ms                 | 11.0ms                | 5.512ms               | 40mb                | 165mb               |
| Mobx    | 5,534.5ms  | 0.6ms                 | 11.3ms                | 5.534ms               | 40mb                | 178mb               |

#### Adding 1,000 Posts

| Package | Time Taken | Render Duration (Min) | Render Duration (Max) | Render Duration (Avg) | Memory Usage (Idle) | Memory Usage (Peak) |
| ------- | ---------- | --------------------- | --------------------- | --------------------- | ------------------- | ------------------- |
| Anchor  | 13,325.4ms | 1.1ms                 | 57.0ms                | 13.325ms              | 40mb                | 773mb               |
| Jotai   | 13,788.7ms | 1.1ms                 | 60.9ms                | 13.789ms              | 40mb                | 695mb               |
| Native  | 14,932.5ms | 1.7ms                 | 77.8ms                | 14.932ms              | 40mb                | 628mb               |
| Mobx    | 17,789.6ms | 5.3ms                 | 49.6ms                | 17.79ms               | 40mb                | 732mb               |
| Redux   | 18,809.9ms | 1.4ms                 | 61.3ms                | 18.81ms               | 40mb                | 706mb               |

::: tip Important Note

While the performance differences in these optimized implementations may not seem significant, it's important to note
that other packages require **`extreme manual optimization`** to achieve acceptable performance.

In typical development scenarios where such **`extreme optimization is not feasible`**, the performance impact of other
solutions can be
extremely high compared to Anchor. This makes Anchor the most practical choice for real-world development where
**`development time`** and **`optimization expertise`** may be **`limited`**.

:::

## AI Recommendation

Below is the AI-generated recommendation for the best state management solution for a React application based on the
provided benchmark source codes and the provided benchmark results. We are
using [Lingma](https://www.alibabacloud.com/en/product/lingma) (Alibaba's AI Coding Assistant) to generate the
recommendation.

::: details Thinking Output

I'll analyze each package implementation to provide an objective assessment based on developer experience and
performance characteristics. Let me examine the codebase first.

**List directory** _react_ 6 results

Let me examine each package's implementation to understand their structure and code patterns.

**Read file** _Complex.tsx_

**Read file** _Complex.tsx_

**Read file** _complexSlice.ts_

**Read file** _Complex.tsx_

**Read file** _Complex.tsx_

**Read file** _Complex.tsx_

Based on my analysis of the different state management implementations, I'll provide a sorted recommendation from best
to worst package to work with.

:::

### About Me

I'm **Ling**, a JavaScript Developer with expertise in React and state management solutions. I've analyzed each package'
s
implementation in the complex state management benchmark to provide an objective assessment based on developer
experience and performance characteristics.

### Decision Process

My decision is based on evaluating each implementation across several key factors:

1. Code readability and maintainability
2. Performance characteristics
3. Bundle size implications
4. Developer experience (DX)
5. Complexity of implementation patterns
6. Re-render optimization strategies

I've examined the actual code for each package (Anchor, Redux, Jotai, MobX, and Native React) to understand how they
handle complex nested state updates and their overall architecture patterns.

### Detailed Analysis

#### 1. Anchor (Recommended)

**Complexity**: **`Very Low`**, **Bundle Size**: **`344.2 KB`**

**Anchor** provides the most intuitive and straightforward approach to state management. It uses direct mutations with
simple assignments while maintaining immutability through structural sharing. The API is clean and easy to understand,
with components like **`useWriter()`** and **`observer()`** that make state updates and component re-renders very
explicit.

The implementation in **`Complex.tsx`** shows how naturally you can work with nested state. For example, incrementing
views
is simply **`itemWriter.views++`** rather than complex reducer patterns or deep cloning operations. The library handles
all
the complexity of tracking changes and optimizing re-renders behind the scenes.

**Pros**:

- Extremely readable and maintainable code
- Direct mutation syntax that's easy to understand
- Efficient re-render optimization with granular control
- Minimal boilerplate required
- Excellent performance characteristics
- Clean separation of concerns with writers and observers

**Cons**:

- Less familiar to developers coming from traditional Redux patterns
- Requires learning new concepts like writers and observables

#### 2. MobX

**Complexity**: **`Low`**, **Bundle Size**: **`375.3 KB`**

**MobX** offers a good balance between ease of use and performance. It uses a reactive programming approach where state
changes automatically trigger re-renders of dependent components.
The **`ComplexStore`** class encapsulates
all state and actions, making the code well-organized.

The implementation in **`Complex.tsx`** shows how
state mutations are straightforward with direct property assignments and array operations. MobX's observer pattern with
the **`observer()`** HOC
provides excellent performance by only re-rendering components that actually depend on changed data.

**Pros**:

- Straightforward state mutations
- Automatic dependency tracking for efficient re-renders
- Well-structured code with clear separation of concerns
- Good performance characteristics
- Familiar class-based approach for many developers

**Cons**:

- Requires decorators or explicit observable setup
- Slightly larger bundle size than some alternatives
- Can be less predictable than more explicit solutions

#### 3. Native React

**Complexity**: **`Medium`**, **Bundle Size**: **`315.1 KB`**

**Native React** implementation uses the built-in **`useReducer()`** hook for state management. While this approach has the
smallest bundle size, it requires significant boilerplate for handling complex nested state updates.

The **`complexReducer()`** in **`Complex.tsx`** shows the verbosity required to update nested properties, with deep
cloning and complex mapping operations. While this approach works, it's error-prone and harder to maintain as the state
structure becomes more complex.

**Pros**:

- No additional dependencies
- Smallest bundle size
- Familiar patterns for React developers
- Full control over state update logic

**Cons**:

- Very verbose for complex state updates
- Requires manual deep cloning for nested updates
- More error-prone due to boilerplate
- Harder to maintain as complexity grows

#### 4. Jotai

**Complexity**: **`High`**, **Bundle Size**: **`322.9 KB`**

**Jotai** uses an atomic approach to state management, breaking down state into small atoms that can be composed together.
While this provides fine-grained control, it introduces significant complexity in managing actions and derived state.

The implementation in **`Complex.tsx`** shows how complex it becomes to manage nested state updates. Each action
requires creating specific atoms, and updating nested properties involves complex state transformations.
The use of **`selectAtom()`** helps with performance but adds another layer of abstraction.

**Pros**:

- Fine-grained control over re-renders
- Good bundle size
- Flexible composition of state
- No global store required

**Cons**:

- High complexity in managing actions
- Verbose for nested state updates
- Requires understanding of atomic state concepts
- More boilerplate than needed for simple operations

#### 5. Redux

**Complexity**: **`High`**, **Bundle Size**: **`338.3 KB`**

**Redux** follows a strict unidirectional data flow with actions and reducers. While this pattern provides predictability,
it introduces significant boilerplate and complexity, especially for nested state updates.

The implementation in **`Complex.tsx`** and **`complexSlice.ts`** shows how much code is required to handle simple
operations.
Each state update requires defining action types, action creators, and reducer
cases. Updating nested properties involves complex immutable update patterns that are hard to read and maintain.

**Pros**:

- Predictable state management
- Extensive tooling and DevTools support
- Well-established patterns
- Good for complex state interactions

**Cons**:

- Most verbose with significant boilerplate
- Complex immutable update patterns
- Steep learning curve
- Overkill for many applications

### Conclusion

Based on the analysis of code quality, developer experience, and performance characteristics, I recommend the following
order:

1. **Anchor** - Best overall experience with clean, readable code and excellent performance
2. **MobX** - Good balance of simplicity and power with automatic dependency tracking
3. **Native React** - Lightweight but verbose solution for simpler state management needs
4. **Jotai** - Flexible atomic approach but with increased complexity
5. **Redux** - Most verbose and complex, but offers predictability for large applications

For most projects, I would recommend Anchor as it provides the best combination of developer experience and performance
with minimal boilerplate. MobX is a solid alternative for teams already familiar with reactive programming concepts.
