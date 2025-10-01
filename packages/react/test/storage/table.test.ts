import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createTableRef, useTableGet, useTableList, useTableListByIndex, useTableRow } from '../../src/storage/table';
// @ts-ignore
import { createTable, type ReactiveTable, type RowState } from '@anchorlib/storage/db';
import { useConstant, useMicrotask } from '../../src/index.js';
import { useEffect } from 'react';

// Mock the dependencies
vi.mock('@anchorlib/storage/db', () => {
  return {
    createTable: vi.fn(),
  };
});

vi.mock('../../src/index.js', () => {
  return {
    useConstant: vi.fn((initFn, deps) => {
      // Actually execute the init function to call the table methods
      const result = initFn();
      return [result, result];
    }),
    useMicrotask: vi.fn(() => [vi.fn((fn) => fn()), vi.fn()]),
    CLEANUP_DEBOUNCE_TIME: 100,
  };
});

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useEffect: vi.fn((fn) => {
      // Execute the effect function immediately
      const cleanup = fn();
      return cleanup;
    }),
  };
});

describe('Storage - Table', () => {
  const mockTable = {
    add: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    listByIndex: vi.fn(),
    leave: vi.fn(),
    seed: vi.fn(),
    table: vi.fn(),
  };

  const mockRowState = {
    data: { id: 'row-1', name: 'Test Row' },
    value: { id: 'row-1', name: 'Test Row' },
  };

  const mockListState = {
    data: [
      { id: 'row-1', name: 'Test Row' },
      { id: 'row-2', name: 'Another Row' },
    ],
    value: [
      { id: 'row-1', name: 'Test Row' },
      { id: 'row-2', name: 'Another Row' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createTable as never as Mock).mockReturnValue(mockTable);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTableRef', () => {
    it('should create a table reference with a string name', () => {
      const name = 'test-table';
      const version = 1;
      const indexes = ['name'];
      const remIndexes = [] as string[];
      const dbName = 'test-db';

      const result = createTableRef(name, version, indexes, remIndexes, dbName);

      expect(createTable).toHaveBeenCalledWith(name, version, indexes, remIndexes, dbName);
      expect(result).toHaveProperty('get');
      expect(result).toHaveProperty('add');
      expect(result).toHaveProperty('remove');
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('listByIndex');
      expect(result).toHaveProperty('seed');
      expect(result).toHaveProperty('table');
    });

    it('should create a table reference with an existing table instance', () => {
      const result = createTableRef(mockTable as unknown as ReactiveTable<any, any>);

      expect(createTable).not.toHaveBeenCalled();
      expect(result).toHaveProperty('get');
      expect(result).toHaveProperty('add');
      expect(result).toHaveProperty('remove');
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('listByIndex');
      expect(result).toHaveProperty('seed');
      expect(result).toHaveProperty('table');
    });

    describe('tableRef methods', () => {
      it('should add a row to the table', () => {
        const tableRef = createTableRef('test-table');
        const payload = { name: 'New Row' };
        mockTable.add.mockReturnValue(mockRowState);

        const result = tableRef.add(payload);

        expect(mockTable.add).toHaveBeenCalledWith(payload);
        expect(result).toEqual(mockRowState);
      });

      it('should remove a row from the table', () => {
        const tableRef = createTableRef('test-table');
        const id = 'row-1';
        mockTable.remove.mockReturnValue(mockRowState);

        const result = tableRef.remove(id);

        expect(mockTable.remove).toHaveBeenCalledWith(id);
        expect(result).toEqual(mockRowState);
      });

      it('should seed the table with initial data', () => {
        const tableRef = createTableRef('test-table');
        const seeds = [{ id: 'row-1', name: 'Seed Row' }];

        const result = tableRef.seed(seeds);

        expect(mockTable.seed).toHaveBeenCalledWith(seeds);
        expect(result).toEqual(tableRef);
      });

      it('should return the underlying table instance', () => {
        const tableRef = createTableRef('test-table');

        const result = tableRef.table();

        expect(result).toEqual(mockTable);
      });

      it('should get a row by ID using the get method', () => {
        const tableRef = createTableRef('test-table');
        const rowId = 'row-1';
        const mockGetResult = {
          data: { id: 'row-1', name: 'Test Row' },
          value: { id: 'row-1', name: 'Test Row' },
          status: 'ready',
        };

        // Directly test that the method calls the table's get method
        mockTable.get.mockReturnValueOnce(mockGetResult);

        // Override the useTableGet mock for this test
        (useConstant as never as Mock).mockImplementationOnce((initFn) => {
          const result = initFn(); // This will call table.get(rowId)
          return [result, result];
        });

        const [value, state] = tableRef.get(rowId);

        expect(mockTable.get).toHaveBeenCalledWith(rowId);
        expect(value).toEqual(mockGetResult.value);
        expect(state).toEqual(mockGetResult);
      });

      it('should list rows using the list method', () => {
        const tableRef = createTableRef('test-table');
        const filter = undefined;
        const limit = 10;
        const direction = 'next';
        const mockListResult = {
          data: [
            { id: 'row-1', name: 'Test Row' },
            { id: 'row-2', name: 'Another Row' },
          ],
          value: [
            { id: 'row-1', name: 'Test Row' },
            { id: 'row-2', name: 'Another Row' },
          ],
          count: 2,
          status: 'ready',
        };

        // Directly test that the method calls the table's list method
        mockTable.list.mockReturnValueOnce(mockListResult);

        // Override the useTableList mock for this test
        (useConstant as never as Mock).mockImplementationOnce((initFn) => {
          const result = initFn(); // This will call table.list(filter, limit, direction)
          return [result, result];
        });

        const [value, state] = tableRef.list(filter, limit, direction);

        expect(mockTable.list).toHaveBeenCalledWith(filter, limit, direction);
        expect(value).toEqual(mockListResult.value);
        expect(state).toEqual(mockListResult);
      });

      it('should list rows by index using the listByIndex method', () => {
        const tableRef = createTableRef('test-table');
        const index = 'name';
        const filter = undefined;
        const limit = 5;
        const direction = 'prev';
        const mockListResult = {
          data: [
            { id: 'row-1', name: 'Test Row' },
            { id: 'row-2', name: 'Another Row' },
          ],
          value: [
            { id: 'row-1', name: 'Test Row' },
            { id: 'row-2', name: 'Another Row' },
          ],
          count: 2,
          status: 'ready',
        };

        // Directly test that the method calls the table's listByIndex method
        mockTable.listByIndex.mockReturnValueOnce(mockListResult);

        // Override the useTableListByIndex mock for this test
        (useConstant as never as Mock).mockImplementationOnce((initFn) => {
          const result = initFn(); // This will call table.listByIndex(index, filter, limit, direction)
          return [result, result];
        });

        const [value, state] = tableRef.listByIndex(index, filter, limit, direction);

        expect(mockTable.listByIndex).toHaveBeenCalledWith(index, filter, limit, direction);
        expect(value).toEqual(mockListResult.value);
        expect(state).toEqual(mockListResult);
      });
    });
  });

  describe('useTableRow', () => {
    it('should manage row cleanup with useEffect', () => {
      const cancelCleanup = vi.fn();
      const cleanup = vi.fn();
      (useMicrotask as never as Mock).mockReturnValue([cleanup, cancelCleanup]);

      renderHook(() => useTableRow(mockTable as never, mockRowState as unknown as RowState<any>));

      expect(cancelCleanup).toHaveBeenCalled();
      expect(useEffect).toHaveBeenCalled();
    });

    it('should call table.leave on cleanup', () => {
      let cleanupFn: (() => void) | undefined;
      const mockUseEffect = vi.fn((fn) => {
        const cleanup = fn();
        if (cleanup) {
          cleanupFn = () => cleanup();
        }
        return cleanup;
      });
      vi.mocked(useEffect).mockImplementation(mockUseEffect);

      const rowState = {
        data: { id: 'row-1', name: 'Test Row' },
        status: 'ready',
      };

      const { unmount } = renderHook(() => useTableRow(mockTable as never, rowState as unknown as RowState<any>));

      unmount();

      if (cleanupFn) {
        cleanupFn();
      }

      expect(mockTable.leave).toHaveBeenCalledWith('row-1');
    });
  });

  describe('useTableGet', () => {
    it('should get a specific row by ID', () => {
      const mockState = {
        value: mockRowState.value,
        data: mockRowState.data,
        status: 'ready',
      };
      (useConstant as never as Mock).mockImplementationOnce((initFn) => {
        const result = initFn();
        return [result, result];
      });
      mockTable.get.mockReturnValueOnce(mockState);

      const { result } = renderHook(() => useTableGet(mockTable as never, 'row-1'));

      expect(mockTable.get).toHaveBeenCalledWith('row-1');
      expect(useConstant).toHaveBeenCalled();
      expect(result.current).toEqual([mockRowState.value, mockState]);
    });

    it('should handle cleanup with useEffect', () => {
      const cancelCleanup = vi.fn();
      const cleanup = vi.fn();
      (useMicrotask as never as Mock).mockReturnValue([cleanup, cancelCleanup]);
      const mockState = {
        value: mockRowState.value,
        data: mockRowState.data,
        status: 'ready',
      };
      (useConstant as never as Mock).mockImplementationOnce((initFn) => {
        const result = initFn();
        return [result, result];
      });
      mockTable.get.mockReturnValueOnce(mockState);

      renderHook(() => useTableGet(mockTable as never, 'row-1'));

      expect(cancelCleanup).toHaveBeenCalled();
      expect(useEffect).toHaveBeenCalled();
    });

    it('should call table.leave on cleanup', () => {
      let cleanupFn: (() => void) | undefined;
      const mockUseEffect = vi.fn((fn) => {
        const cleanup = fn();
        if (cleanup && typeof cleanup === 'function') {
          cleanupFn = cleanup;
        }
        return cleanup;
      });
      vi.mocked(useEffect).mockImplementationOnce(mockUseEffect);

      const mockState = {
        value: mockRowState.value,
        data: mockRowState.data,
        status: 'ready',
      };
      (useConstant as never as Mock).mockImplementationOnce((initFn) => {
        const result = initFn();
        return [result, result];
      });
      mockTable.get.mockReturnValueOnce(mockState);

      const { unmount } = renderHook(() => useTableGet(mockTable as never, 'row-1'));

      unmount();

      if (cleanupFn) {
        cleanupFn();
      }

      expect(mockTable.leave).toHaveBeenCalledWith('row-1');
    });
  });

  describe('useTableList', () => {
    it('should get a list of rows', () => {
      const mockState = {
        value: mockListState.value,
        data: mockListState.data,
        count: 2,
        status: 'ready',
      };
      (useConstant as never as Mock).mockImplementationOnce((initFn) => {
        const result = initFn();
        return [result, result];
      });
      mockTable.list.mockReturnValueOnce(mockState);

      const { result } = renderHook(() => useTableList(mockTable as never));

      expect(mockTable.list).toHaveBeenCalled();
      expect(useConstant).toHaveBeenCalled();
      expect(result.current).toEqual([mockListState.value, mockState]);
    });
  });

  describe('useTableListByIndex', () => {
    it('should get a list of rows by index', () => {
      const mockState = {
        value: mockListState.value,
        data: mockListState.data,
        count: 2,
        status: 'ready',
      };
      (useConstant as never as Mock).mockImplementationOnce((initFn) => {
        const result = initFn();
        return [result, result];
      });
      mockTable.listByIndex.mockReturnValueOnce(mockState);

      const { result } = renderHook(() => useTableListByIndex(mockTable as never, 'name'));

      expect(mockTable.listByIndex).toHaveBeenCalledWith('name', undefined, undefined, undefined);
      expect(useConstant).toHaveBeenCalledWith(expect.any(Function), [
        mockTable,
        'name',
        undefined,
        undefined,
        undefined,
      ]);
      expect(result.current).toEqual([mockListState.value, mockState]);
    });
  });
});
