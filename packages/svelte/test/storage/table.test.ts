import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TableBasic from './table-basic.svelte';
import { createTable } from '@anchorlib/storage/db';

// Mock the dependencies
vi.mock('@anchorlib/storage/db', () => {
  return {
    createTable: vi.fn(),
  };
});

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

      render(TableBasic, { name, version, indexes, remIndexes });

      expect(createTable).toHaveBeenCalledWith(name, version, indexes, remIndexes, name);
    });

    it('should return a table reference object', () => {
      const name = 'test-table';
      render(TableBasic, { name, test: 'methods' });

      expect(screen.getByTestId('method-check').textContent).toBe('function');
    });
  });

  describe('TableRef methods', () => {
    it('should call table.get when ref.get is called', () => {
      render(TableBasic, { name: 'test-table', test: 'get' });

      expect(mockTable.get).toHaveBeenCalledWith('1');
      expect(screen.getByTestId('row-state').textContent).toBe('1');
    });

    it('should call table.add when ref.add is called', () => {
      render(TableBasic, { name: 'test-table', test: 'add' });

      expect(mockTable.add).toHaveBeenCalledWith({ name: 'New Item' });
      expect(screen.getByTestId('row-state').textContent).toBe('1');
    });

    it('should call table.remove when ref.remove is called', () => {
      render(TableBasic, { name: 'test-table', test: 'remove' });

      expect(mockTable.remove).toHaveBeenCalledWith('1');
      expect(screen.getByTestId('row-state').textContent).toBe('1');
    });

    it('should call table.list when ref.list is called', () => {
      render(TableBasic, { name: 'test-table', test: 'list' });

      expect(mockTable.list).toHaveBeenCalled();
      expect(screen.getByTestId('list-state').textContent).toBe('1');
    });

    it('should call table.listByIndex when ref.list is called', () => {
      render(TableBasic, { name: 'test-table', test: 'listByIndex' });

      expect(mockTable.listByIndex).toHaveBeenCalled();
      expect(screen.getByTestId('list-state').textContent).toBe('1');
    });

    it('should call table.seed when ref.seed is called', () => {
      render(TableBasic, { name: 'test-table', test: 'seed' });

      expect(mockTable.seed).toHaveBeenCalledWith([{ id: '1', name: 'Test' }]);
    });
  });
});
