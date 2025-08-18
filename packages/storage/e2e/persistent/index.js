import { persistent, PersistentStorage } from '/bundle/index.js';
// Test results will be stored here
window.testResults = {};

// Simple function to run tests and store results
window.runPersistentStorageTests = async function () {
  const results = {};

  try {
    // Test 1: Initialize with initial data
    try {
      const storage = new PersistentStorage('test-persistent-1', { a: 1, b: 'test' });
      results.test1 = {
        a: storage.get('a'),
        b: storage.get('b'),
        undefinedValue: storage.get('c'), // Testing undefined access
        length: storage.length,
      };
    } catch (error) {
      results.test1 = { error: error.message };
    }

    // Test 2: Get the correct length
    try {
      const storage = new PersistentStorage('test-persistent-2', { a: 1, b: 2 });
      results.test2 = {
        length: storage.length,
      };
    } catch (error) {
      results.test2 = { error: error.message };
    }

    // Test 3: Set and get values
    try {
      const storage = new PersistentStorage('test-persistent-3');
      storage.set('a', 1);
      storage.set('b', 'test');
      storage.set('c', true);

      results.test3 = {
        a: storage.get('a'),
        b: storage.get('b'),
        c: storage.get('c'),
        length: storage.length,
      };
    } catch (error) {
      results.test3 = { error: error.message };
    }

    // Test 4: Delete values
    try {
      const storage = new PersistentStorage('test-persistent-4', { a: 1, b: 2 });
      const initialLength = storage.length;
      storage.delete('a');
      const afterDeleteValue = storage.get('a');
      const finalLength = storage.length;

      results.test4 = {
        initialLength: initialLength,
        afterDeleteValue: afterDeleteValue,
        finalLength: finalLength,
      };
    } catch (error) {
      results.test4 = { error: error.message };
    }

    // Test 5: Assign data
    try {
      const storage = new PersistentStorage('test-persistent-5', { a: 1 });
      storage.assign({ b: 2, c: 3 });

      results.test5 = {
        a: storage.get('a'),
        b: storage.get('b'),
        c: storage.get('c'),
        length: storage.length,
      };
    } catch (error) {
      results.test5 = { error: error.message };
    }

    // Test 6: Subscribe and publish events
    try {
      const storage = new PersistentStorage('test-persistent-6');
      const events = [];

      const unsubscribe = storage.subscribe((event) => {
        events.push(event);
      });

      storage.set('a', 1);
      storage.delete('a');

      // Unsubscribe and make sure no more events
      unsubscribe();
      storage.set('b', 2);

      results.test6 = {
        events: events,
        eventsCount: events.length,
      };
    } catch (error) {
      results.test6 = { error: error.message };
    }

    // Test 7: Generate JSON representation
    try {
      const storage = new PersistentStorage('test-persistent-7', { a: 1, b: 'test' });
      results.test7 = {
        json: storage.json(),
        jsonString: JSON.stringify({ a: 1, b: 'test' }),
      };
    } catch (error) {
      results.test7 = { error: error.message };
    }

    // Test 8: Test localStorage persistence
    try {
      const key = 'anchor-persistent://test-persistent-8@1.0.0';
      localStorage.removeItem(key); // Clean up first

      const state = persistent('test-persistent-8', { a: 1, b: 'test' });
      state.a = 2;
      state.c = 'new';

      await new Promise((resolve) => setTimeout(resolve, 101));

      const stored = localStorage.getItem(key);
      const parsed = JSON.parse(stored);

      results.test8 = {
        stored: stored,
        parsed: parsed,
        a: parsed.a,
        b: parsed.b,
        c: parsed.c,
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
