import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTableRef } from '../../src/storage/table.js';
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

      mount({
        template: '<div></div>',
        setup() {
          const tableRef = createTableRef(name, version, indexes, remIndexes);
          return { tableRef };
        },
      });

      expect(createTable).toHaveBeenCalledWith(name, version, indexes, remIndexes, name);
    });

    it('should return a table reference object', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ typeof tableRef.get }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          return { tableRef };
        },
      });

      expect(wrapper.text()).toBe('function');
      wrapper.unmount();
    });
  });

  describe('TableRef methods', () => {
    it('should call table.get when ref.get is called', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ rowState.data.id }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          const rowState = tableRef.get('1');
          return { rowState };
        },
      });

      expect(mockTable.get).toHaveBeenCalledWith('1');
      expect(wrapper.text()).toBe('1');
      wrapper.unmount();
    });

    it('should call table.add when ref.add is called', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ rowState.data.id }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          const payload = { name: 'New Item' };
          const rowState = tableRef.add(payload);
          return { rowState };
        },
      });

      expect(mockTable.add).toHaveBeenCalledWith({ name: 'New Item' });
      expect(wrapper.text()).toBe('1');
      wrapper.unmount();
    });

    it('should call table.remove when ref.remove is called', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ rowState.data.id }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          const rowState = tableRef.remove('1');
          return { rowState };
        },
      });

      expect(mockTable.remove).toHaveBeenCalledWith('1');
      expect(wrapper.text()).toBe('1');
      wrapper.unmount();
    });

    it('should call table.list when ref.list is called', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ listState.data.length }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          const listState = tableRef.list();
          return { listState };
        },
      });

      expect(mockTable.list).toHaveBeenCalled();
      expect(wrapper.text()).toBe('1');
      wrapper.unmount();
    });

    it('should call table.listByIndex when ref.list is called', () => {
      const name = 'test-table';
      const wrapper = mount({
        template: '<div>{{ listState.data.length }}</div>',
        setup() {
          const tableRef = createTableRef(name);
          const listState = tableRef.listByIndex('created_at');
          return { listState };
        },
      });

      expect(mockTable.listByIndex).toHaveBeenCalled();
      expect(wrapper.text()).toBe('1');
      wrapper.unmount();
    });

    it('should call table.seed when ref.seed is called', () => {
      const name = 'test-table';
      mount({
        template: '<div></div>',
        setup() {
          const tableRef = createTableRef(name);
          const seeds = [{ id: '1', name: 'Test' }];
          const returnValue = tableRef.seed(seeds as never);
          return { returnValue };
        },
      });

      expect(mockTable.seed).toHaveBeenCalledWith([{ id: '1', name: 'Test' }]);
    });

    it('should return the tableRef when .table is called', () => {
      const name = 'test-table';
      mount({
        template: '<div></div>',
        setup() {
          const tableRef = createTableRef(name);
          const seeds = [{ id: '1', name: 'Test' }];
          const returnValue = tableRef.seed(seeds as never);
          const table = tableRef.table();

          expect(table).toBe(mockTable);

          return { returnValue };
        },
      });

      expect(mockTable.seed).toHaveBeenCalledWith([{ id: '1', name: 'Test' }]);
    });
  });
});
