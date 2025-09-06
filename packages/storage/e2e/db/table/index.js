import { IndexedTable } from '/bundle/db/index.js';

// Test results will be stored here
window.testResults = {};

// Simple function to run tests and store results
window.runIndexedTableTests = async function () {
  const results = {};

  try {
    // Test 1: Initialize a table
    try {
      const table = new IndexedTable('test-table');
      await table.promise();

      results.test1 = {
        status: table.status,
        error: table.error?.message || null,
      };
    } catch (error) {
      results.test1 = { error: error.message };
    }

    // Test 2: Create a record
    try {
      const table = new IndexedTable('test-table-create');
      await table.promise();

      const record = await table.create({
        id: 'test-id',
        name: 'test-name',
        value: 42,
      });

      results.test2 = {
        id: record.id,
        name: record.name,
        value: record.value,
        created_at: record.created_at,
        updated_at: record.updated_at,
      };
    } catch (error) {
      results.test2 = { error: error.message };
    }

    // Test 3: Read a record
    try {
      const table = new IndexedTable('test-table-read');
      await table.promise();

      // First create a record
      await table.create({
        id: 'read-test-id',
        name: 'read-test-name',
        value: 100,
      });

      // Then read it
      const record = await table.read('read-test-id');

      results.test3 = {
        id: record.id,
        name: record.name,
        value: record.value,
      };
    } catch (error) {
      results.test3 = { error: error.message };
    }

    // Test 4: Update a record
    try {
      const table = new IndexedTable('test-table-update');
      await table.promise();

      // First create a record
      await table.create({
        id: 'update-test-id',
        name: 'original-name',
        value: 50,
      });

      // Then update it
      const updatedRecord = await table.update('update-test-id', {
        name: 'updated-name',
        value: 75,
      });

      results.test4 = {
        id: updatedRecord.id,
        name: updatedRecord.name,
        value: updatedRecord.value,
      };
    } catch (error) {
      results.test4 = { error: error.message };
    }

    // Test 5: Delete a record
    try {
      const table = new IndexedTable('test-table-delete');
      await table.promise();

      // First create a record
      await table.create({
        id: 'delete-test-id',
        name: 'delete-test-name',
        value: 200,
      });

      // Verify it exists
      const beforeDelete = await table.read('delete-test-id');

      // Delete it
      await table.delete('delete-test-id');

      // Verify it's deleted
      const afterDelete = await table.read('delete-test-id');

      results.test5 = {
        beforeDelete: beforeDelete ? true : false,
        afterDelete: afterDelete ? true : false,
      };
    } catch (error) {
      results.test5 = { error: error.message };
    }

    // Test 6: Find records
    try {
      const table = new IndexedTable('test-table-find');
      await table.promise();

      // Create multiple records
      await table.create({ id: 'find-1', name: 'record-1', value: 1 });
      await table.create({ id: 'find-2', name: 'record-2', value: 2 });
      await table.create({ id: 'find-3', name: 'record-3', value: 3 });

      // Find all records
      const records = await table.find();

      results.test6 = {
        count: records.length,
        firstId: records[0]?.id,
        lastName: records[records.length - 1]?.name,
      };
    } catch (error) {
      results.test6 = { error: error.message };
    }

    // Test 7: Handle concurrent operations
    try {
      const table = new IndexedTable('test-table-concurrent');
      // Don't wait for promise - start concurrent operations immediately

      const promises = [
        table.create({ id: 'concurrent-1', name: 'concurrent', value: 1 }),
        table.read('concurrent-1'),
        table.update('concurrent-1', { value: 2 }),
        table.delete('concurrent-1'),
      ];

      const resultsArray = await Promise.allSettled(promises);
      const fulfilledCount = resultsArray.filter((result) => result.status === 'fulfilled').length;

      results.test7 = {
        fulfilledCount: fulfilledCount,
        totalOperations: promises.length,
      };
    } catch (error) {
      results.test7 = { error: error.message };
    }

    // Test 8: Subscribe and publish events
    try {
      const table = new IndexedTable('test-table-events');
      const events = [];
      const unsubscribe = table.subscribe((event) => {
        events.push(event);
      });

      await table.promise();

      // Perform some operations to generate events
      await table.create({ id: 'event-test-id', name: 'event-test', value: 99 });
      await table.update('event-test-id', { value: 100 });
      await table.delete('event-test-id');

      unsubscribe();

      results.test8 = {
        events: events,
        eventsCount: events.length,
      };
    } catch (error) {
      results.test8 = { error: error.message };
    }
  } catch (error) {
    results.importError = error.message;
  }

  window.testResults = results;
  return results;
};
