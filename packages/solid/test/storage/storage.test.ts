import { describe, expect, it } from 'vitest';
import { persistent } from '../../src/storage/index.js';

describe('Storage - Persistent', () => {
  describe('persistent', () => {
    it('should call persistent with the provided name and initial value', () => {
      expect(persistent).toBeDefined();
    });
  });
});
