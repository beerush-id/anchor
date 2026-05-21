## 0. Installation & Project Architectures

### Global Conventions

- `lib/views/`: View files that render state as is.
- `lib/components/`: Component files that own states, behaviors, or side effects.
- `lib/actions/`: Headless state factories, headless logic factories, and headless action references.
- `lib/module.ts`: IRPC package configuration, defining transports and environments.
- `lib/router.ts`: Router instance declaration.
- `pages/(**/)route.ts`: Configures the route path, including guards and/or providers when needed.
- `pages/(**/)function.ts`: Declares function signatures (stub), types, and/or schemas, can also act as a barrel export for child functions.
- `pages/(**/)constructor.ts`: Implements the execution logic that fulfills the stub, can also act as a barrel import for child implementations.
- `pages/(**/)workflow.ts`: Defines complex multi-steps operations, can also act as a barrel export for child workflows.
- `styles/index.css`: Entry point for CSS imports.
- `styles/theme.css`: Design system and CSS variables.
- `styles/utilities.css`: Tailwind CSS custom utilities.
- `styles/*.css`: Individual CSS files.

A page folder (feature) may have all of them, only layout, only page, only functions, etc.

---

### Full Stack Project
Combines both the frontend UI (SSR and Client Hydration) and the execution logic into a single unified repository.

**Template**
```bash
bunx degit beerush-id/anchor/templates/air-react my-air-app
cd my-air-app
bun install
bun run dev
```

**Manual Installation**
```bash
bun add @anchorlib/core @anchorlib/router @irpclib/irpc @irpclib/http @anchorlib/react
```

**Structure**
```text
src/
├── entry-client.tsx
├── entry-server.tsx
├── server.ts
├── worker.ts
├── lib/
│   ├── actions/
│   ├── components/
│   ├── views/
│   ├── module.ts
│   └── router.ts
└── pages/
    ├── route.ts
    ├── layout.tsx
    ├── page.tsx
    ├── function.ts
    ├── constructor.ts
    └── workflow.ts
└── styles/
  └── index.css
  └── theme.css
  └── utilities.css
```

---

### Frontend Project with Server Side Rendering (SSR)
A strict SSR React application. Used when your UI requires server-side rendering, but your core APIs and databases are handled externally.

**Template**
```bash
bunx degit beerush-id/anchor/templates/react-ssr my-ssr-app
cd my-ssr-app
bun install
bun run dev
```

**Manual Installation**
```bash
bun add @anchorlib/core @anchorlib/router @anchorlib/react
```

**Structure**
```text
src/
├── entry-client.tsx
├── entry-server.tsx
├── server.ts
├── lib/
│   ├── actions/
│   ├── components/
│   ├── views/
│   └── router.ts
└── pages/
    ├── route.ts
    ├── layout.tsx
    └── page.tsx
└── styles/
  └── index.css
  └── theme.css
  └── utilities.css
```

---

### Single Page Application (SPA/PWA)
A Single Page Application executed entirely in the client. Ideal for static hosting environments (Vercel, Netlify, S3).

**Template**
```bash
bun create vite my-spa-app --template react-ts
cd my-spa-app
bun install
bun run dev
```

**Manual Installation**
```bash
bun add @anchorlib/core @anchorlib/router @anchorlib/react
```

**Structure**
```text
src/
├── App.tsx
├── lib/
│   ├── actions/
│   ├── components/
│   ├── views/
│   └── router.ts
└── pages/
    ├── route.ts
    ├── layout.tsx
    └── page.tsx
└── styles/
  └── index.css
  └── theme.css
  └── utilities.css
```

---

### Standalone API
A dedicated service providing universal IRPC endpoints for external clients to consume, completely independent of any UI layer.

**Template**
```bash
bunx degit beerush-id/anchor/templates/irpc-bun-starter my-api
cd my-api
bun install
bun run dev
```

**Manual Installation**
```bash
bun add @irpclib/irpc @irpclib/http
```

**Structure**
```text
src/
├── index.ts
├── lib/
│   ├── actions/
│   └── module.ts
└── rpc/
    └── auth/
        ├── index.ts
        ├── constructor.ts
        └── workflow.ts
```
