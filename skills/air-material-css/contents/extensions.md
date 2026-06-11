# Extensions

---

## Skeleton Loading

Skeleton utilities replace real content with a shimmer animation during loading states.

### Single Element

Add `skeleton` to any element to replace it with a shimmer:

```html
<!-- Text placeholder -->
<p class="skeleton" style="width: 80%; height: 1em; border-radius: 4px;">&nbsp;</p>
<p class="skeleton" style="width: 60%; height: 1em; border-radius: 4px;">&nbsp;</p>

<!-- Image placeholder -->
<div class="skeleton" style="width: 200px; height: 150px; border-radius: 12px;"></div>

<!-- Button placeholder -->
<button class="button skeleton" disabled></button>

<!-- Card placeholder -->
<div class="card skeleton" style="height: 200px;"></div>
```

`skeleton` forces:
- `color: transparent` — hides text
- `border-color: transparent`
- Shimmer gradient from `--color-surface-container` → `--color-surface-container-highest`
- `pointer-events: none`, `user-select: none`
- Hides direct `<img>`, `<svg>`, `.material-symbols-outlined` children

### Skeleton Group

Apply `skeleton-group` to a container to automatically skeleton all common content children (`p`, `h1–h6`, `li`, `a`, `button`, `img`, `span`, `.chip`, `.badge`, `.icon-button`, `.fab`):

```html
<!-- Loading state -->
<div class="card skeleton-group">
  <div class="card-header">
    <h3 class="card-title">Product Name</h3>
    <p class="card-subtitle">Category</p>
  </div>
  <div class="card-body">
    <p>Description text that gets shimmer applied automatically.</p>
  </div>
  <div class="card-actions">
    <button class="button">Add to Cart</button>
  </div>
</div>

<!-- Loaded state — just remove skeleton-group -->
<div class="card">
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
<div class="masonry">
  <div class="masonry-item card" style="height: 200px;">Short card</div>
  <div class="masonry-item card" style="height: 320px;">Tall card</div>
  <div class="masonry-item card" style="height: 150px;">Short card</div>
  <div class="masonry-item card" style="height: 400px;">Very tall card</div>
  <div class="masonry-item card" style="height: 250px;">Medium card</div>
</div>
```

Column counts:
```
< 640px  → 1 column
≥ 640px  → 2 columns
≥ 1024px → 3 columns
≥ 1920px → 4 columns
```

`masonry-item` applies `break-inside: avoid` and `margin-bottom: var(--air-masonry-gap)`.

---

## AI Utilities

Extensions for AI chat interfaces and prompt fields.

### AI Prompt Field

A multiline prompt input with optional attachments and action buttons:

```html
<div class="ai-prompt">
  <!-- Optional: attachment previews (only renders if present) -->
  <div class="ai-prompt-attachments">
    <div class="ai-attachment">
      <img src="attachment.jpg" alt="Attachment" />
    </div>
  </div>

  <!-- Textarea -->
  <textarea class="ai-prompt-textarea" placeholder="Ask me anything..."></textarea>

  <!-- Actions row -->
  <div class="ai-prompt-actions">
    <button class="icon-button">
      <span class="material-symbols-outlined">attach_file</span>
    </button>
    <button class="fab fab-sm">
      <span class="material-symbols-outlined">arrow_upward</span>
    </button>
  </div>
</div>
```

- `ai-prompt` — `--color-surface-container-low` bg, `border-radius: 28px`; adds `box-shadow` ring on `:focus-within`
- `ai-prompt-attachments` — horizontal scroll strip for attachment previews
- `ai-attachment` — 64×64px rounded image container
- `ai-prompt-textarea` — transparent bg, resizes off, `min-height: 120px`
- `ai-prompt-actions` — flex row, space-between, bottom padding

---

### AI Chat Thread

```html
<div class="ai-chat-thread">

  <!-- User message -->
  <div class="ai-message ai-message-user">
    <div class="ai-message-bubble">
      How do I center a div?
    </div>
  </div>

  <!-- Agent message -->
  <div class="ai-message ai-message-agent">
    <div class="ai-avatar">
      <span class="material-symbols-outlined">smart_toy</span>
    </div>
    <div class="ai-message-bubble">
      Use `display: flex; align-items: center; justify-content: center;` on the parent.
    </div>
  </div>

</div>
```

- `ai-chat-thread` — flex-col, 32px gap
- `ai-message` — flex row, full-width
- `ai-message-user` — right-aligned, max 85% width; bubble uses `--color-surface-variant`
- `ai-message-agent` — left-aligned, full width; bubble is transparent (reads like text)
- `ai-avatar` — 40×40px circle, `--color-primary-container` bg
- `ai-message-bubble` — padding, `text-body-large`

---

### AI Generation Indicators

**Typing indicator (three pulsing dots):**
```html
<div class="ai-typing-indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>
```

Dots animate with `pulse-dot` keyframe, each delayed by 200ms.

**Sparkle / generating icon:**
```html
<span class="ai-sparkle material-symbols-outlined">auto_awesome</span>
```

Applies a continuous 3s `sparkle-spin` rotation + scale animation in `--color-primary`.
