# Extensions

---

## Skeleton Loading

Skeleton utilities replace real content with a shimmer animation during loading states.

### Single Element

Add `air-skeleton` to any element to replace it with a shimmer:

```html
<!-- Text placeholder -->
<p class="air-skeleton" style="width: 80%; height: 1em; border-radius: 4px;">&nbsp;</p>
<p class="air-skeleton" style="width: 60%; height: 1em; border-radius: 4px;">&nbsp;</p>

<!-- Image placeholder -->
<div class="air-skeleton" style="width: 200px; height: 150px; border-radius: 12px;"></div>

<!-- Button placeholder -->
<button class="air-button air-skeleton" disabled></button>

<!-- Card placeholder -->
<div class="air-card air-skeleton" style="height: 200px;"></div>
```

`air-skeleton` forces:
- `color: transparent` — hides text
- `border-color: transparent`
- Shimmer gradient from `--color-surface-container` → `--color-surface-container-highest`
- `pointer-events: none`, `user-select: none`
- Hides direct `<img>`, `<svg>`, `.air-icon` children

### Skeleton Group

Apply `air-skeleton-group` to a container to automatically skeleton all common content children (`p`, `h1–h6`, `li`, `a`, `button`, `img`, `span`, `.air-chip`, `.air-badge`, `.air-icon-button`, `.air-fab`):

```html
<!-- Loading state -->
<div class="air-card air-skeleton-group">
  <div class="air-card-header">
    <h3 class="air-card-title">Product Name</h3>
    <p class="air-card-subtitle">Category</p>
  </div>
  <div class="air-card-body">
    <p>Description text that gets shimmer applied automatically.</p>
  </div>
  <div class="air-card-actions">
    <button class="air-button">Add to Cart</button>
  </div>
</div>

<!-- Loaded state — just remove air-skeleton-group -->
<div class="air-card">
  ...
</div>
```

---

## Masonry Grid

A responsive CSS column-based masonry layout. Columns adapt at breakpoints.

### Component Variable
```
--air-masonry-gap   default: 16px (4 × --spacing)
```

```html
<div class="air-masonry">
  <div class="air-masonry-item air-card" style="height: 200px;">Short card</div>
  <div class="air-masonry-item air-card" style="height: 320px;">Tall card</div>
  <div class="air-masonry-item air-card" style="height: 150px;">Short card</div>
  <div class="air-masonry-item air-card" style="height: 400px;">Very tall card</div>
  <div class="air-masonry-item air-card" style="height: 250px;">Medium card</div>
</div>
```

Column counts:
```
< 640px  → 1 column
≥ 640px  → 2 columns
≥ 1024px → 3 columns
≥ 1920px → 4 columns
```

`air-masonry-item` applies `break-inside: avoid` and `margin-bottom: var(--air-masonry-gap)`.

---

## AI Utilities

Extensions for AI chat interfaces and prompt fields.

### AI Prompt Field

A multiline prompt input with optional attachments and action buttons:

```html
<div class="air-ai-prompt">
  <!-- Optional: attachment previews (only renders if present) -->
  <div class="air-ai-prompt-attachments">
    <div class="air-ai-attachment">
      <img src="attachment.jpg" alt="Attachment" />
    </div>
  </div>

  <!-- Textarea -->
  <textarea class="air-ai-prompt-textarea" placeholder="Ask me anything..."></textarea>

  <!-- Actions row -->
  <div class="air-ai-prompt-actions">
    <button class="air-icon-button">
      <span class="air-icon">attach_file</span>
    </button>
    <button class="air-fab air-fab-sm">
      <span class="air-icon">arrow_upward</span>
    </button>
  </div>
</div>
```

- `air-ai-prompt` — `--color-surface-container-low` bg, `border-radius: 28px`; adds `box-shadow` ring on `:focus-within`
- `air-ai-prompt-attachments` — horizontal scroll strip for attachment previews
- `air-ai-attachment` — 64×64px rounded image container
- `air-ai-prompt-textarea` — transparent bg, resizes off, `min-height: 120px`
- `air-ai-prompt-actions` — flex row, space-between, bottom padding

---

### AI Chat Thread

```html
<div class="air-ai-chat-thread">

  <!-- User message -->
  <div class="air-ai-message air-ai-message-user">
    <div class="air-ai-message-bubble">
      How do I center a div?
    </div>
  </div>

  <!-- Agent message -->
  <div class="air-ai-message air-ai-message-agent">
    <div class="air-ai-avatar">
      <span class="air-icon">smart_toy</span>
    </div>
    <div class="air-ai-message-bubble">
      Use `display: flex; align-items: center; justify-content: center;` on the parent.
    </div>
  </div>

</div>
```

- `air-ai-chat-thread` — flex-col, 32px gap
- `air-ai-message` — flex row, full-width
- `air-ai-message-user` — right-aligned, max 85% width; bubble uses `--color-surface-variant`
- `air-ai-message-agent` — left-aligned, full width; bubble is transparent (reads like text)
- `air-ai-avatar` — 40×40px circle, `--color-primary-container` bg
- `air-ai-message-bubble` — padding, `air-body-lg`

---

### AI Generation Indicators

**Typing indicator (three pulsing dots):**
```html
<div class="air-ai-typing-indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>
```

Dots animate with `pulse-dot` keyframe, each delayed by 200ms.

**Sparkle / generating icon:**
```html
<span class="air-ai-sparkle air-icon">auto_awesome</span>
```

Applies a continuous 3s `sparkle-spin` rotation + scale animation in `--color-primary`.
