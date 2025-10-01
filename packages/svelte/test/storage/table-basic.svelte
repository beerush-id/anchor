<script lang="ts">
  import { createTableRef } from '@anchorlib/svelte/storage';

  export let name;
  export let version = 1;
  export let indexes = undefined;
  export let remIndexes = undefined;
  export let dbName = name;
  export let test = '';

  let tableRef;
  let rowState;
  let listState;
  let returnValue;

  if (test === 'methods') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
  } else if (test === 'get') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    rowState = tableRef.get('1');
  } else if (test === 'add') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    const payload = { name: 'New Item' };
    rowState = tableRef.add(payload);
  } else if (test === 'remove') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    rowState = tableRef.remove('1');
  } else if (test === 'list') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    listState = tableRef.list();
  } else if (test === 'listByIndex') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    listState = tableRef.listByIndex('created_at');
  } else if (test === 'seed') {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    const seeds = [{ id: '1', name: 'Test' }];
    returnValue = tableRef.seed(seeds);
  } else {
    tableRef = createTableRef(name, version, indexes, remIndexes, dbName);
    tableRef.table();
  }

  const getTable = () => {
    return tableRef.table();
  };
</script>

{#if test === 'methods'}
  <span data-testid="method-check">{typeof tableRef.get}</span>
{:else if test === 'get' || test === 'add' || test === 'remove'}
  <span data-testid="row-state">{$rowState.data.id}</span>
{:else if test === 'list' || test === 'listByIndex'}
  <span data-testid="list-state">{$listState.data.length}</span>
{:else if test === 'seed'}
  <span data-testid="seed-check">seeded</span>
{/if}