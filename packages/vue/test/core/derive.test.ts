import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { anchorRef } from '../../src/anchor';
import { derivedRef } from '../../src/derive';
import { type Ref } from 'vue';

describe('Anchor Vue - Derive System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('derivedRef', () => {
    describe('Basic Usage', () => {
      it('should create a derived reference from a source state', () => {
        const wrapper = mount({
          template: '<div>{{ derivedValue }}</div>',
          setup() {
            const source = anchorRef({ count: 42 });
            const derivedValue = derivedRef(source.value, (s) => s.count * 2);
            return { derivedValue };
          },
        });

        vi.runAllTimers();
        expect(wrapper.text()).toBe('84');
        wrapper.unmount();
      });

      it('should create a derived reference from a ref object', () => {
        const wrapper = mount({
          template: '<div>{{ derivedValue }}</div>',
          setup() {
            const source = anchorRef({ count: 42 });
            const derivedValue = derivedRef(source, (s) => s.count * 2);

            (derivedValue as Ref<number>).value = 100; // Should be no-op.

            return { derivedValue };
          },
        });

        vi.runAllTimers();
        expect(wrapper.text()).toBe('84');
      });

      it('should create a derived reference without transform function', () => {
        const wrapper = mount({
          template: '<div>{{ derivedValue.count }}</div>',
          setup() {
            const source = anchorRef({ count: 42 });
            const derivedValue = derivedRef(source);

            derivedValue.value.count = 100; // Should be valid mutation due to same reference.

            return { derivedValue };
          },
        });

        vi.runAllTimers();
        expect(wrapper.text()).toBe('100');
      });

      it('should update derived value when source changes', async () => {
        let source: Ref<{ count: number }>;
        const wrapper = mount({
          template: '<div>{{ derivedValue }}</div>',
          setup() {
            source = anchorRef({ count: 42 });
            const derivedValue = derivedRef(source.value, (s) => s.count * 2);
            return { derivedValue, source };
          },
        });

        vi.runAllTimers();
        expect(wrapper.text()).toBe('84');

        source!.value.count = 50;
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toBe('100');
      });
    });
  });
});
