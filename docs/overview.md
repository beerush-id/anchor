---
title: 'Overview - Anchor State Management Library'
description: 'Discover Anchor, a revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. Learn about the DSV (Data-State-View) model.'
keywords: 'anchor overview, state management, reactivity, immutability, dsv model, data state view, enterprise apps, javascript, typescript'
---

# **Overview**

State Management for Humans, Built for Enterprise Apps. Anchor values the AX (All eXperience) philosophy. Anchor not just makes apps work, but also efficient. Intuitive
code makes developers happy, high performance makes users happy.

<div style="display: flex; align-items: center; justify-content: center; margin-top: 48px;">
  <img src="/schemas/dsv-model.webp" alt="DSV (Data-State-View) Model Schema" />
</div>

## **Introduction**

Welcome to Anchor, a revolutionary state management framework for modern web applications. Anchor introduces the **DSV (
Data-State-View) model**, a new architectural philosophy that redefines how you build reactive user interfaces. Our
mission is to solve the complex challenges of state management by focusing on the **AX (All eXperience) philosophy**,
which aims to empower developers with intuitive code and provide users with a blazing-fast, fluid experience.

::: tip Declarative Syntax

````tsx {17}
import { editorApp, TOOL_ICON_SIZE } from '../lib/editor.js';
import { useObserved, useWriter } from '@anchor/react';

export function DisplayPanel() {
  // SETUP PHASE.
  const style = useObserved(() => editorApp.currentStyle);  // 1. Observe the currentStyle
  const styleWriter = useWriter(style, [ 'display' ]);      // 2. Create a writer for the display property

  // REACTIVE PHASE.
  return (
    <ToggleGroup>
      <Toggle bind={ styleWriter } name="display" value="block" className="toggle-btn">```

````
