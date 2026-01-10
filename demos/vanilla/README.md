# Vanilla Todo App with Anchor

This is a vanilla JavaScript/TypeScript implementation of a Todo application using the Anchor library for state management and reactivity.

## Features

- Reactive state management using `@anchorlib/core`
- IndexedDB storage using `@anchorlib/storage`
- Real-time UI updates with the `effect()` API
- Todo CRUD operations (Create, Read, Update, Delete)
- Task statistics tracking (total, active, completed)
- Responsive UI with Tailwind CSS

## Architecture

- [todos.ts](file:///K:/beerush.io/anchor/demos/vanilla/src/todos.ts): Defines the Todo type and creates the reactive table using `createTable`
- [TodoApp.ts](file:///K:/beerush.io/anchor/demos/vanilla/src/TodoApp.ts): Main application class that handles UI rendering and reactivity
- [main.ts](file:///K:/beerush.io/anchor/demos/vanilla/src/main.ts): Entry point that initializes the TodoApp

## Key Concepts

- **Reactive State**: Uses `mutable()` for primitive values and reactive tables for collections
- **Effects**: Uses `effect()` to automatically update the UI when state changes
- **Storage**: Uses `createTable()` to create a reactive IndexedDB table
- **Declarative UI**: Updates DOM elements reactively based on state changes

## Usage

The application automatically manages:
- Loading states when fetching data
- Error handling for storage operations
- Real-time updates when todos are added, completed, or removed
- Statistics that update automatically as todos change