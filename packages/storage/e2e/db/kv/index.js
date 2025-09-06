import { IndexedKv } from '/bundle/db/index.js';

// Test results will be stored here
window.testResults = {};

// Simple function to run tests and store results
window.runKvStoreTests = async function () {
  const results = {};

  try {
    // Test 1: Initialize a KV store
    try {
      const kv = new IndexedKv('test-kv');
      await kv.promise();

      results.test1 = {
        status: kv.status,
        error: kv.error?.message || null,
      };
    } catch (error) {
      results.test1 = { error: error.message };
    }

    // Test 2: Set and get values
    try {
      const kv = new IndexedKv('test-kv-set-get');
      await kv.promise();

      kv.set('key1', 'value1');
      await kv.completed();

      const value = kv.get('key1');

      results.test2 = {
        value: value,
        busy: kv.busy,
      };
    } catch (error) {
      results.test2 = { error: error.message };
    }

    // Test 3: Delete values
    try {
      const kv = new IndexedKv('test-kv-delete');
      await kv.promise();

      kv.set('key1', 'value1');
      await kv.completed();

      const beforeDelete = kv.get('key1');

      kv.delete('key1');
      await kv.completed();

      const afterDelete = kv.get('key1');

      results.test3 = {
        beforeDelete: beforeDelete,
        afterDelete: afterDelete,
      };
    } catch (error) {
      results.test3 = { error: error.message };
    }

    // Test 4: Handle busy state
    try {
      const kv = new IndexedKv('test-kv-busy');
      await kv.promise();

      const initialBusy = kv.busy;

      const operation = kv.set('key1', 'value1');
      const busyDuringOperation = kv.busy;

      await operation.promise();
      await kv.completed();

      const busyAfterOperation = kv.busy;

      results.test4 = {
        initialBusy: initialBusy,
        busyDuringOperation: busyDuringOperation,
        busyAfterOperation: busyAfterOperation,
      };
    } catch (error) {
      results.test4 = { error: error.message };
    }

    // Test 5: Subscribe and publish events
    try {
      const kv = new IndexedKv('test-kv-events');
      const events = [];
      const unsubscribe = kv.subscribe((event) => {
        events.push(event);
      });

      await kv.promise();

      kv.set('key1', 'value1');
      await kv.completed();

      kv.delete('key1');
      await kv.completed();

      unsubscribe();

      results.test5 = {
        events: events,
        eventsCount: events.length,
      };
    } catch (error) {
      results.test5 = { error: error.message };
    }

    // Test 6: Handle complex data types
    try {
      const kv = new IndexedKv('test-kv-complex');
      await kv.promise();

      const complexValue = {
        name: 'test',
        count: 42,
        nested: {
          enabled: true,
          items: [1, 2, 3],
        },
      };

      kv.set('complex', complexValue);
      await kv.completed();

      const retrieved = kv.get('complex');

      results.test6 = {
        stored: retrieved,
        isEqual: JSON.stringify(retrieved) === JSON.stringify(complexValue),
      };
    } catch (error) {
      results.test6 = { error: error.message };
    }

    // Test 7: Handle promise based operations
    try {
      const kv = new IndexedKv('test-kv-promise');
      await kv.promise();

      const operation = kv.set('key1', 'value1');
      await operation.promise();

      const value = kv.get('key1');

      results.test7 = {
        value: value,
      };
    } catch (error) {
      results.test7 = { error: error.message };
    }
  } catch (error) {
    results.importError = error.message;
  }

  window.testResults = results;
  return results;
};
