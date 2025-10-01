# Anchor Solid Test Suite

This directory contains the comprehensive test suite for the Anchor Solid package, following the same structure and patterns as the React package tests.

## Test Structure

```
test/
├── core/
│   ├── anchor.test.ts       # Tests for anchorRef, reactive, flatRef, orderedRef
│   ├── binding.test.ts      # Tests for binding system
│   ├── derive.test.ts       # Tests for derivedRef
│   ├── fetch.test.ts        # Tests for fetchRef, streamRef
│   ├── history.test.ts      # Tests for historyRef
│   ├── immutable.test.ts    # Tests for immutableRef, writableRef
│   ├── model.test.ts        # Tests for modelRef, exceptionRef
│   ├── observable.test.ts   # Tests for observedRef
│   └── ref.test.ts          # Tests for variableRef, constantRef, isRef
├── storage/
│   ├── kv.test.ts           # Tests for kvRef
│   ├── persistent.test.ts   # Tests for persistentRef
│   ├── session.test.ts      # Tests for sessionRef
│   └── table.test.ts        # Tests for createTableRef
└── index.test.ts            # Main test entry point
```

## Test Patterns

The tests follow the same patterns as the React package tests:

1. **Structure**: Tests are organized by module functionality
2. **Naming**: Test files follow the pattern `[module].test.ts`
3. **Approach**: Using `renderHook` from `@solidjs/testing-library` for testing Solid-specific hooks
4. **Mocking**: Dependencies are mocked using `vi.mock()` when needed
5. **Coverage**: Tests cover basic usage, edge cases, and error handling

## Running Tests

To run the tests, use the following command from the project root:

```bash
npm test
```

Or to run tests for the Solid package specifically:

```bash
npm test -- --project=solid
```
