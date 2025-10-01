import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { createTableRef } from '../../src/storage/table';
import { createTable } from '@anchorlib/storage/db';

// Mock the dependencies
vi.mock('@anchorlib/storage/db', () => {
  return {
    createTable: vi.fn(),
  };
});

// Mock onCleanup
vi.mock('solid-js', async () => {
  const actual = await vi.importActual('solid-js');
  return {
    ...actual,
    onCleanup: vi.fn((fn) => fn()),
  };
});

// Mock IDBKeyRange for testing
const mockIDBKeyRange = {
  only: vi.fn((value) => ({ mockKeyRange: value })),
  bound: vi.fn((lower, upper) => ({ mockBound: { lower, upper } })),
  lowerBound: vi.fn((bound) => ({ mockLowerBound: bound })),
  upperBound: vi.fn((bound) => ({ mockUpperBound: bound })),
};

global.IDBKeyRange = mockIDBKeyRange as never;

describe('Storage - Table', () => {
  const mockRowState = {
    data: { id: '1', name: 'Test' },
    status: 'init',
  };

  const mockRowListState = {
    data: [{ id: '1', name: 'Test' }],
    status: 'init',
  };

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

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createTable as any).mockReturnValue(mockTable);
    mockTable.get.mockReturnValue(mockRowState);
    mockTable.add.mockReturnValue(mockRowState);
    mockTable.remove.mockReturnValue(mockRowState);
    mockTable.list.mockReturnValue(mockRowListState);
    mockTable.listByIndex.mockReturnValue(mockRowListState);
    mockTable.seed.mockReturnValue(mockTable);
    mockTable.table.mockReturnValue(mockTable);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTableRef', () => {
    it('should call createTable with the provided parameters', () => {
      const name = 'test-table';
      const version = 1;
      const indexes = ['name'];
      const remIndexes = ['oldName'];

      renderHook(() => createTableRef(name, version, indexes, remIndexes));

      expect(createTable).toHaveBeenCalledWith(name, version, indexes, remIndexes, name);
    });

    it('should return a table reference object', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      expect(typeof result.get).toBe('function');
      expect(typeof result.add).toBe('function');
      expect(typeof result.remove).toBe('function');
      expect(typeof result.list).toBe('function');
      expect(typeof result.listByIndex).toBe('function');
      expect(typeof result.seed).toBe('function');
      expect(typeof result.table).toBe('function');
    });
  });

  describe('TableRef methods', () => {
    it('should call table.get when ref.get is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const rowState = result.get('1');

      expect(mockTable.get).toHaveBeenCalledWith('1');
      expect(rowState).toEqual(mockRowState);
      expect(mockTable.leave).toHaveBeenCalledWith('1');
    });

    it('should call table.add when ref.add is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const payload = { name: 'New Item' };
      const rowState = result.add(payload);

      expect(mockTable.add).toHaveBeenCalledWith(payload);
      expect(rowState).toEqual(mockRowState);
      expect(mockTable.leave).toHaveBeenCalledWith('1'); // From mockRowState.data.id
    });

    it('should call table.remove when ref.remove is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const rowState = result.remove('1');

      expect(mockTable.remove).toHaveBeenCalledWith('1');
      expect(rowState).toEqual(mockRowState);
    });

    it('should call table.list when ref.list is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const listState = result.list();

      expect(mockTable.list).toHaveBeenCalled();
      expect(listState).toEqual(mockRowListState);
    });

    it('should call table.list with parameters when ref.list is called with parameters', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const filter = IDBKeyRange.only('test');
      const limit = 10;
      const direction: IDBCursorDirection = 'next';

      const listState = result.list(filter, limit, direction);

      expect(mockTable.list).toHaveBeenCalledWith(filter, limit, direction);
      expect(listState).toEqual(mockRowListState);
    });

    it('should call table.listByIndex when ref.listByIndex is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const indexName = 'name';
      const listState = result.listByIndex(indexName);

      expect(mockTable.listByIndex).toHaveBeenCalledWith(indexName, undefined, undefined, undefined);
      expect(listState).toEqual(mockRowListState);
    });

    it('should call table.listByIndex with parameters when ref.listByIndex is called with parameters', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const indexName = 'name';
      const filter = IDBKeyRange.only('test');
      const limit = 10;
      const direction: IDBCursorDirection = 'next';

      const listState = result.listByIndex(indexName, filter, limit, direction);

      expect(mockTable.listByIndex).toHaveBeenCalledWith(indexName, filter, limit, direction);
      expect(listState).toEqual(mockRowListState);
    });

    it('should call table.seed when ref.seed is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const seeds = [{ id: '1', name: 'Test' }];
      const returnValue = result.seed(seeds as never);

      expect(mockTable.seed).toHaveBeenCalledWith(seeds);
      expect(returnValue).toEqual(result);
    });

    it('should return the underlying table when ref.table is called', () => {
      const name = 'test-table';
      const { result } = renderHook(() => createTableRef(name));

      const table = result.table();

      // The table() method returns the underlying tableRef directly, not by calling table.table()
      expect(table).toEqual(mockTable);
    });
  });

  describe('createTableRef with existing table', () => {
    it('should not call createTable when passing an existing table', () => {
      const tableRef = createTableRef(mockTable as never);

      expect(createTable).not.toHaveBeenCalled();
      expect(typeof tableRef.get).toBe('function');
      expect(typeof tableRef.add).toBe('function');
      expect(typeof tableRef.remove).toBe('function');
      expect(typeof tableRef.list).toBe('function');
      expect(typeof tableRef.listByIndex).toBe('function');
      expect(typeof tableRef.seed).toBe('function');
      expect(typeof tableRef.table).toBe('function');
    });

    it('should return the underlying table when ref.table is called on existing table', () => {
      const tableRef = createTableRef(mockTable as never);

      const table = tableRef.table();

      // The table() method returns the underlying tableRef directly
      expect(table).toEqual(mockTable);
    });
  });
});
