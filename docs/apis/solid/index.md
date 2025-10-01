# Solid API Reference

Welcome to the Anchor API reference for Solid. This documentation provides detailed information about all the APIs
available in the Anchor Solid package.

## API Categories

The Solid APIs are organized into the following categories:

- [Initialization APIs](/apis/solid/initialization) - Core functions for creating and initializing reactive states
- [Observation APIs](/apis/solid/observation) - Functions for observing changes in reactive states
- [Fetch APIs](/apis/solid/fetch) - APIs for handling HTTP requests and streaming data
- [History APIs](/apis/solid/history) - APIs for managing state history with undo/redo functionality
- [Storage APIs](/apis/solid/storage) - APIs for persisting state in various storage mechanisms

Each category contains detailed documentation about the available functions, their parameters, return values, and usage
examples.

## Overview

The Anchor Solid package provides a set of functions that integrate Solid's reactivity system with Anchor's state
management capabilities. These functions are designed to work seamlessly with Solid's fine-grained reactivity while
providing the powerful state management features of Anchor.

## Key Concepts

### Reactive References

Most functions in the Solid package return reactive references that integrate with Solid's reactivity system. These
references typically have a `value` property that can be accessed to get or set the current value.

### Automatic Cleanup

Many of the Solid-specific functions automatically handle cleanup when components are unmounted, ensuring proper memory
management and preventing memory leaks.

### Immutability and Mutability

The package provides functions for working with both immutable and mutable states, allowing you to choose the right
approach for your specific use case.
