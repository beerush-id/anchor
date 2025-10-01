import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { anchorRef } from '../../src/anchor.js';
import { propsRef } from '../../src/prop.js';

describe('Anchor Vue - Prop', () => {
  describe('propsRef', () => {
    describe('Basic Usage', () => {
      it('should create a props reference object with mixed values', () => {
        const wrapper = mount({
          template: `
            <div>
              <span id="count">{{ props.count.value.count }}</span>
              <span id="name">{{ props.name }}</span>
            </div>
          `,
          setup() {
            const state = anchorRef({ count: 42 });
            const props = propsRef({
              count: state.value,
              name: 'test-name',
            });
            return { props };
          },
        });

        expect(wrapper.find('#count').text()).toBe('42');
        expect(wrapper.find('#name').text()).toBe('test-name');
      });
    });
  });
});
