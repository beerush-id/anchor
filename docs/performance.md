# **Performance**

Anchor is designed from the ground up to deliver a blazingly fast and fluid user experience. Our performance philosophy
is rooted in a single principle: doing the absolute minimum amount of work necessary to keep the UI in perfect sync with
your application state.

## **Fine-Grained Reactivity**

This is the cornerstone of Anchor's performance. Traditional reactive frameworks often re-render large components or
entire sub-trees of the UI whenever any piece of state changes. This is inefficient and leads to a phenomenon known as "
wasted renders."

Anchor takes a different approach. It tracks dependencies at the most granular level possible, ensuring that when you
update a specific piece of state, only the exact components that are subscribed to that data will re-render.

**How it works:**

- **Subscribe to Data:** When a component needs to display a piece of state, it automatically subscribes to it.
- **Change Detection:** When that state changes, Anchor detects the mutation.
- **Targeted Update:** Instead of re-rendering a large, parent component, Anchor only triggers an update on the one
  component that needs to reflect the new data.

This approach means that your application remains fast and responsive, regardless of how complex your state tree
becomes.

## **Optimized State Updates**

Anchor's "direct mutation" within a write contract is not just a developer convenience; it's a significant performance
optimization.

- **The Problem with Deep Clones:** In an immutable model that relies on deep cloning, every state update requires
  copying potentially massive objects. For large state trees, this is a computationally expensive operation that can
  cause noticeable lag.
- **Anchor's Solution:** By using a proxy-based system, Anchor allows you to use a simple, direct mutation syntax (
  `state.user.name = 'new name'`) without actually mutating the original, immutable state. This avoids the need for
  expensive deep clones and provides the best of both worlds: intuitive code and superior performance.

## **Minimal Overhead**

The Anchor library itself is small and lightweight. Our goal is to provide a comprehensive solution without a bloated
runtime. This means:

- **Fast Startup Time:** Your application loads and becomes interactive faster because there is less JavaScript to parse
  and execute.
- **Efficient Memory Usage:** Anchor's core is designed for efficiency, consuming minimal memory and leaving more
  resources for your application's logic.

By combining fine-grained reactivity with optimized state updates and a minimal footprint, Anchor empowers you to build
applications that feel instant and responsive to every user interaction.

## **Benchmark**

This benchmark report provides hard data and visual proof of Anchor's superior performance, demonstrating its ability to
handle scale and complexity without the performance bottlenecks of traditional state management.

### **Test Scenarios**

The following metrics were captured from a live demo comparing an application built with a traditional reactive model
against the same application built with Anchor.

- **Item Addition:** Rapidly adding 500 new todo items to a list.
- **Item Toggling:** Rapidly toggling a single item 25 times within a list of over 500 items.

### **Performance Metrics**

| Metric                                    | Classic           | Anchor          | Ratio       |
| :---------------------------------------- | :---------------- | :-------------- | :---------- |
| **Adding 500 Items**                      |                   |                 |             |
| Start FPS                                 | 43 fps            | 139 fps         | **~3.2x**   |
| Start Render Time                         | 3.7 ms            | 2.2 ms          | **~1.7x**   |
| Degraded/Later FPS                        | 21 fps            | 110 fps         | **~5.2x**   |
| Late Render Time                          | 227.7 ms          | 1.6 ms          | **~142.3x** |
| Time To Finish                            | 35,400 ms (35.4s) | 6,409 ms (6.4s) | **~5.5x**   |
| **Toggling an item 25 times (503 items)** |                   |                 |             |
| FPS                                       | 24 fps            | 170 fps         | **~7.1x**   |
| Render Time (Average)                     | 253 ms            | 1 ms            | **~253x**   |
| Render Time (Peak)                        | 559 ms            | 1.3 ms          | **~430x**   |
| Time To Finish                            | 4,807 ms (4.8s)   | 149 ms          | **~32.3x**  |

### **Analysis & Key Takeaways**

The data from these tests is conclusive: Anchor fundamentally redefines what's possible in web application performance.

- **Efficiency at Scale**: The Classic App's performance degrades dramatically as the list grows. Its render time for a
  single item update explodes to **227.7ms**, and its frame rate plummets to a choppy **21 fps**. In contrast, Anchor's
  render time remains stable at a blazingly fast **1.6ms**, with a fluid **110 fps**.
- **Classic immutability bottleneck**: The Classic App's performance is also impacted by the immutability approach.
  Each item addition need to clone the entire list, leading the time and resource consumption is increased as the list
  size increases.
- **The Problem of Wasted Renders**: The Classic App re-renders components that don't need to change, leading to a
  massive render count of **122,307** for a single operation. Anchor, with its fine-grained reactivity, only renders
  what's necessary, resulting in an estimated count of just **528**.
- **A Superior User Experience**: The tangible impact is clear. The Anchor app is **~32x faster** at completing the
  toggling action and **~5.5x faster** at adding items. This translates to an application that feels instant,
  responsive, and a joy to use.

These metrics prove that Anchor's architectural philosophy is a solution to the scalability problems facing modern web
applications.
