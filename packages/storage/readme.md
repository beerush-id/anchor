# @anchor/storage

A comprehensive storage solution for modern web applications with support for multiple storage backends including IndexedDB, Session Storage, and Memory Storage.

## Features

- **Multi-backend Support**: Works with IndexedDB, Session Storage, and in-memory storage
- **Reactive Storage**: Automatic synchronization with browser storage mechanisms
- **Promise-first API**: IndexedDB operations with modern Promise-based interface
- **Real-time Updates**: Subscribe to storage changes with event system
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Schema Validation**: Integration with @anchor/core for reactive state management

## Installation

```bash
npm install @anchor/storage
```

## Documentation

For full documentation, visit [Anchor Storage Documentation](https://beerush-id.github.io/anchor/docs/storage/getting-started.html)

## Quick Start

```typescript
import { MemoryStorage } from '@anchor/storage';

const storage = new MemoryStorage();
storage.set('key', 'value');
console.log(storage.get('key')); // 'value'
```

## License

MIT

```

## License

MIT
```
