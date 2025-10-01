import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { immutableRef, writableRef } from '../../src/immutable.js';

describe('Anchor Vue - Immutable', () => {
  describe('immutableRef', () => {
    describe('Basic Usage', () => {
      it('should create an immutable state with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const wrapper = mount({
          template: '<div>{{ state.count }}-{{ state.name }}</div>',
          setup() {
            const state = immutableRef(initialValue);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('42-test');
      });
    });
  });

  describe('writableRef', () => {
    describe('Basic Usage', () => {
      it('should create a mutable reference to a reactive state', () => {
        const wrapper = mount({
          template: '<div>{{ writableState.count }}</div>',
          setup() {
            const immutableState = immutableRef({ count: 42 });
            const writableState = writableRef(immutableState.value);
            return { writableState };
          },
        });

        expect(wrapper.text()).toBe('42');
      });
    });
  });
});
