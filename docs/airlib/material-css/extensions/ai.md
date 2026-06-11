---
title: 'AI Interfaces'
description: 'Material Design extensions for building AI chat interfaces, prompt fields, and generation indicators.'
---

# AI Interfaces
As AI becomes an integral part of modern applications, standardizing the UI for prompting and chatting is essential. The AI extension provides a cohesive set of utilities for building chat threads, prompt inputs, and generation indicators.

## Prompt Field
The AI prompt field is a specialized, multi-line input area designed for drafting instructions, attaching context, and submitting queries to an AI model.

```html [HTML]
<div class="ai-prompt shadow-1">
  <!-- Optional Attachments Container -->
  <div class="ai-prompt-attachments">
    <div class="ai-attachment">
      <img src="/sample.png" alt="Context image" />
    </div>
  </div>

  <!-- The Text Input -->
  <textarea class="ai-prompt-textarea" placeholder="Ask the AI anything..."></textarea>
  
  <!-- Action Buttons -->
  <div class="ai-prompt-actions">
    <div class="flex gap-2">
      <button class="icon-button"><span class="material-symbols-outlined">attach_file</span></button>
    </div>
    <button class="fab-primary-small"><span class="material-symbols-outlined">arrow_upward</span></button>
  </div>
</div>
```

- `ai-prompt`: The outer container. It applies a `surface-container-low` background, a large `28px` border radius, and automatically highlights with a primary-colored ring when the user focuses the textarea (`:focus-within`).
- `ai-prompt-attachments` & `ai-attachment`: Handles horizontal scrolling for attached images or files placed above the textarea. 
- `ai-prompt-textarea`: A transparent, unstyled textarea that fills the container. It uses `body-large` typography and automatically adjusts its padding if attachments are present.
- `ai-prompt-actions`: A flex container at the bottom for attaching files and submitting the prompt.

## Chat Thread
Chat threads organize the conversation history between the user and the AI agent.

```html [HTML]
<div class="ai-chat-thread">
  
  <!-- User Message -->
  <div class="ai-message ai-message-user">
    <div class="ai-message-bubble">
      Can you summarize this document for me?
    </div>
  </div>

  <!-- Agent Message -->
  <div class="ai-message ai-message-agent">
    <div class="ai-avatar">
      <span class="material-symbols-outlined">smart_toy</span>
    </div>
    <div class="ai-message-bubble">
      Certainly! Here is a summary of the document...
    </div>
  </div>

</div>
```

- `ai-chat-thread`: A flex column layout that spaces messages evenly.
- `ai-message`: The base wrapper for a single message row.
- `ai-message-user`: Modifies the row to align right (`ml-auto`). It limits the width and styles the inner `ai-message-bubble` with a `surface-variant` background and asymmetric border radii (sharp bottom-right corner).
- `ai-message-agent`: Modifies the row to align left. Agent messages typically flow like standard documents rather than contained bubbles, so the inner `ai-message-bubble` remains transparent.
- `ai-avatar`: A circular container for the agent's icon, using `primary-container` colors.

## Generation Indicators
Visual feedback is crucial while waiting for an AI to generate a response.

```html [HTML]
<!-- Typing Indicator -->
<div class="ai-typing-indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>

<!-- AI Sparkle Icon -->
<span class="material-symbols-outlined ai-sparkle">auto_awesome</span>
```

- `ai-typing-indicator`: A container with three animated dots that pulse sequentially.
- `ai-sparkle`: Applied to an icon (like `auto_awesome`). It applies the `primary` color and continuously spins/scales the icon to indicate active background generation.
