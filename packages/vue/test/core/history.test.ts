import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { historyRef } from '../../src/history.js';
import { anchorRef } from '../../src/anchor.js';
import type { HistoryState } from '@anchorlib/core';

describe('Anchor Vue - History', () => {
  describe('historyRef', () => {
    describe('Basic Usage', () => {
      it('should create a history state with initial value', () => {
        const wrapper = mount({
          template: `
            <div>
              <span id="canBackward">{{ history.canBackward }}</span>
              <span id="canForward">{{ history.canForward }}</span>
            </div>
          `,
          setup() {
            const state = anchorRef({ count: 42 });
            const history = historyRef(state.value);
            return { history };
          },
        });

        expect(wrapper.find('#canBackward').text()).toBe('false');
        expect(wrapper.find('#canForward').text()).toBe('false');
        expect(typeof (wrapper.vm.history as HistoryState).backward).toBe('function');
        expect(typeof (wrapper.vm.history as HistoryState).forward).toBe('function');
      });
    });
  });
});
