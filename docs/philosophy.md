# **Philosophy**

Our framework is built on two foundational principles: the **DSV (Data-State-View) model** and the **AX (All eXperience)
philosophy**.

## **DSV: The Data-State-View Model**

The DSV model is a new architectural philosophy that redefines how you build reactive user interfaces. It provides a
clear, logical, and scalable flow that makes your entire application easy to reason about and maintain.

### **The Problem with the Traditional Way**

In many traditional applications, state management leads to a scattered "Data-UI" flow. Data is managed in different
places, leading to complex issues like prop drilling and unnecessary renders that cause performance to degrade.

### **The Anchor Way**

The DSV model introduces a stable, centralized **State** that acts as the single source of truth for your entire
application. Components don't manage data; they simply read from the State. This makes your app easier to reason about,
faster to build, and simpler to maintain.

- **Data**: The origin of all information, from APIs to local storage. Anchor’s utilities seamlessly bind to it.
- **State**: The core of the DSV model. A single, stable, immutable structure that is always up-to-date and a direct
  representation of your app.
- **View**: The UI components simply read from the state. They have no data management logic, ensuring a clear
  separation of concerns.

## **AX: The All eXperience Philosophy**

At Anchor, we believe that when you improve the **Developer Experience (DX)**, you inherently improve the **User
Experience (UX)**. The **AX (All eXperience)** philosophy is our commitment to this idea.

- **Developer Empowerment (DX)**: When you use Anchor, you get an intuitive developer experience with **true
  immutability** and **strong typing**. It’s easy to write and maintain, and it's free from the pain of "prop drilling"
  and complex state logic.
- **User Delight (UX)**: The result is a user experience that feels fluid and fast. The app is **blazing-fast**, with
  high frame rates and a responsive UI that doesn't suffer from performance bottlenecks, even as it scales.

This is an excellent addition. It directly addresses the most common objection a developer will have to a new state management solution. It acknowledges their skepticism and then uses it as a springboard to present a compelling case for change.

Here is the content for the "Why?" section, designed to be impactful and persuasive.

## **Why Another State Manager?**

This is a fair question. The world has many state management libraries. The reason for Anchor's existence isn't to add to the noise, but to **solve problems that other solutions haven't**. We've seen a lot of progress in the frontend world, but we've also seen a lot of complexity that has yet to be solved.

For those who are afraid of change, we understand. It is comfortable to stick with what is known. But remember, Blockbuster was superior, yet Netflix revolutionized the industry. Nokia and Blackberry were once superior, yet they fell behind as a new paradigm emerged. The world of technology doesn't reward those who stay comfortable; it rewards those who embrace a better way.

## **Why Learn Anchor?**

Because it offers a fundamentally better way to build. Anchor solves many of the hardest problems in software development without introducing new ones that are worse:

- **It eliminates the "copy-on-mutation" boilerplate.** Instead of manually copying objects and arrays, you can use direct, intuitive syntax while still maintaining a truly immutable state.
- **It solves the scalability problem.** As your application grows, the cost of an update remains stable. The benchmark data is a testament to this, showing that a single change doesn't cause a cascade of unnecessary re-renders.
- **It gives you a stable mental model.** The DSV model provides a clear, logical structure for your application that is easy to reason about and maintain. You won't have to debug scattered logic or confusing data flows.

Anchor isn't just a library; it's a new philosophy for building applications that are not just easy to build but are also performant, scalable, and a joy to use.

## **Caveats & Considerations**

- **Framework Agnosticism:** While Anchor's core is framework-agnostic, its primary integrations are with React, Vue,
  and Svelte. You should use the specific bindings for your chosen framework to get the full benefits.
- **Learning a New Mental Model:** The DSV model represents a shift in thinking from traditional state management. While
  the concepts are intuitive, they may require some initial adjustment for developers accustomed to other patterns.
- **Performance:** While Anchor is significantly faster than traditional approaches at scale, this does not mean you can
  ignore performance best practices. Optimizing render lists and efficient data fetching remain important considerations
  for building any high-performance application.
