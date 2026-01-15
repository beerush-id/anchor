# Dev Tools APIs

APIs for integrating with development tools.

## `setDevTool()`

Sets the active development tool used for inspecting state changes.

```typescript
export function setDevTool(devTool: DevTool): () => void;
```

- `devTool`: The DevTool implementation.
- **Returns**: A restore function to unregister the tool.

## `getDevTool()`

Retrieves the currently active development tool.

```typescript
export function getDevTool(): DevTool | undefined;
```
